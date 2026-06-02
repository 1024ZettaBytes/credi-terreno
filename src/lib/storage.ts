import "server-only"
import { Storage, type Bucket } from "@google-cloud/storage"

/**
 * Storage service.
 * - Si las variables de entorno de Google Cloud están definidas, sube a GCS.
 * - Si NO están definidas (entorno de desarrollo sin credenciales), usa modo
 *   "dummy" y devuelve una URL placeholder local. Así el build y el dev no
 *   se rompen sin secretos.
 *
 * Variables de entorno esperadas:
 *   CLOUD_PROJECT  – GCP project id
 *   CLOUD_EMAIL    – service account email
 *   CLOUD_KEY      – service account private key (con \n escapados)
 *   CLOUD_BUCKET   – nombre del bucket
 *   FILES_HOST     – host público (ej. "https://storage.googleapis.com/")
 */

export interface UploadResult {
  url: string
  key: string
  contentType: string
  size: number
}

export interface UploadOptions {
  /** Carpeta lógica dentro del bucket: "expedientes", "comprobantes", etc. */
  folder: string
  /** Prefijo opcional (ej. clienteId, ventaId). */
  prefix?: string
  /** Si true, hace público el objeto tras subirlo. Default true. */
  makePublic?: boolean
}

export const ACCEPTED_DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

export const MAX_UPLOAD_SIZE_MB = 10

// ---------------------------------------------------------------------------
// GCS lazy init
// ---------------------------------------------------------------------------

interface GcsContext {
  bucket: Bucket
  bucketName: string
  filesHost: string
}

let gcsContextCache: GcsContext | null | undefined

function getGcsContext(): GcsContext | null {
  if (gcsContextCache !== undefined) return gcsContextCache

  const projectId = process.env.CLOUD_PROJECT
  const clientEmail = process.env.CLOUD_EMAIL
  const privateKeyRaw = process.env.CLOUD_KEY
  const bucketName = process.env.CLOUD_BUCKET
  const filesHost = process.env.FILES_HOST ?? "https://storage.googleapis.com/"

  if (!projectId || !clientEmail || !privateKeyRaw || !bucketName) {
    gcsContextCache = null
    return null
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n")

  const storage = new Storage({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  gcsContextCache = {
    bucket: storage.bucket(bucketName),
    bucketName,
    filesHost: filesHost.endsWith("/") ? filesHost : `${filesHost}/`,
  }
  return gcsContextCache
}

export function isStorageConfigured(): boolean {
  return getGcsContext() !== null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildKey(file: File, opts: UploadOptions): string {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_")
  return [opts.folder, opts.prefix, `${Date.now()}-${safeName}`]
    .filter(Boolean)
    .join("/")
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Sube un `File` (Web File API, p.ej. desde un FormData) al storage.
 * Funciona contra GCS si hay credenciales, si no usa modo dummy.
 */
export async function uploadFile(
  file: File,
  opts: UploadOptions,
): Promise<UploadResult> {
  const key = buildKey(file, opts)
  const contentType = file.type || "application/octet-stream"
  const ctx = getGcsContext()

  if (!ctx) {
    return { url: `/uploads/${key}`, key, contentType, size: file.size }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const blob = ctx.bucket.file(key)

  await blob.save(buffer, {
    contentType,
    resumable: false,
    metadata: { contentType, cacheControl: "public, max-age=31536000" },
  })

  if (opts.makePublic !== false) {
    await blob.makePublic()
  }

  return {
    url: `${ctx.filesHost}${ctx.bucketName}/${key}`,
    key,
    contentType,
    size: file.size,
  }
}

/**
 * Borra un objeto por su key (no por su URL). En modo dummy es no-op.
 */
export async function deleteFile(key: string): Promise<void> {
  const ctx = getGcsContext()
  if (!ctx) return
  if (await fileExists(key)) {
    await ctx.bucket.file(key).delete()
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const ctx = getGcsContext()
  if (!ctx) return false
  const [exists] = await ctx.bucket.file(key).exists()
  return exists
}

/**
 * Dada una URL pública del bucket, extrae la key (camino dentro del bucket).
 * Útil cuando solo guardamos la URL en BD y luego queremos borrar.
 */
export function keyFromUrl(url: string): string | null {
  const ctx = getGcsContext()
  if (!ctx) {
    return url.startsWith("/uploads/") ? url.slice("/uploads/".length) : null
  }
  const prefix = `${ctx.filesHost}${ctx.bucketName}/`
  return url.startsWith(prefix) ? url.slice(prefix.length) : null
}
