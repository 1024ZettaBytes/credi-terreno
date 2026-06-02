"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireCaptura } from "@/lib/rbac"
import { clienteSchema } from "./schemas"
import { uploadFile } from "@/lib/storage"

function clean<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    out[k] = v === "" ? null : v
  }
  return out as T
}

export async function createCliente(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireCaptura()
  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  try {
    const c = await prisma.cliente.create({ data: clean(parsed.data) })
    revalidatePath("/clientes")
    return ok({ id: c.id })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear cliente")
  }
}

export async function updateCliente(id: string, input: unknown): Promise<ActionResult<null>> {
  await requireCaptura()
  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  await prisma.cliente.update({ where: { id }, data: clean(parsed.data) })
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return ok(null)
}

export async function deleteCliente(id: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const ventas = await prisma.venta.count({ where: { clienteId: id } })
  if (ventas > 0) return fail("No se puede eliminar: el cliente tiene ventas registradas")
  await prisma.cliente.delete({ where: { id } })
  revalidatePath("/clientes")
  return ok(null)
}

/**
 * Sube un archivo del expediente y lo agrega al arreglo del cliente.
 * Usa dummy storage por ahora (se reemplazará por GCS).
 */
export async function addExpedienteFile(
  clienteId: string,
  file: File,
): Promise<ActionResult<{ url: string }>> {
  await requireCaptura()
  if (!file || file.size === 0) return fail("Archivo inválido")

  const uploaded = await uploadFile(file, { folder: "expedientes", prefix: clienteId })
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { expediente: { push: uploaded.url } },
  })
  revalidatePath(`/clientes/${clienteId}`)
  return ok({ url: uploaded.url })
}

export async function removeExpedienteFile(
  clienteId: string,
  url: string,
): Promise<ActionResult<null>> {
  await requireCaptura()
  const c = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!c) return fail("Cliente no encontrado")
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { expediente: c.expediente.filter((u) => u !== url) },
  })
  revalidatePath(`/clientes/${clienteId}`)
  return ok(null)
}
