"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, Trash2, Phone, FileText, Upload, X, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { FieldError, FieldHint, FormError } from "@/components/ui/field-error"
import {
  createCliente,
  updateCliente,
  deleteCliente,
  addExpedienteFile,
  removeExpedienteFile,
} from "@/features/clients/actions"
import { clienteConstraints } from "@/features/clients/schemas"
import type { ClienteDTO } from "@/types"
import type { UserRole } from "@prisma/client"
import { veriFyFileSize } from "@/lib/utils"

export function ClientesClient({ clientes, userRole }: { clientes: ClienteDTO[]; userRole: UserRole }) {
  const canEdit = userRole === "ADMIN" || userRole === "CAPTURA"
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ClienteDTO | null>(null)
  const [expediente, setExpediente] = useState<ClienteDTO | null>(null)
  const [search, setSearch] = useState("")

  const filtered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.includes(search) ||
      (c.curp ?? "").toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} registrados</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nombre, teléfono o CURP..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />{c.telefono}
                  </p>
                </div>
                {(c.ventasActivas ?? 0) > 0 && (
                  <Badge variant="success">{c.ventasActivas} activa(s)</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{c.domicilio}</p>
              <div className="flex gap-1 pt-1">
                <Button size="sm" variant="outline" onClick={() => setExpediente(c)}>
                  <FileText className="h-3 w-3" /> Expediente ({c.expediente.length})
                </Button>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true) }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">
            Sin resultados
          </p>
        )}
      </div>

      <ClienteDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDone={() => router.refresh()}
      />
      <ExpedienteDialog
        key={expediente?.id ?? "none"}
        cliente={expediente}
        onOpenChange={(o) => !o && setExpediente(null)}
        onDone={() => router.refresh()}
      />
    </>
  )
}

function ClienteDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: ClienteDTO | null
  onDone: () => void
}) {
  const [form, setForm] = useState({
    nombre: editing?.nombre ?? "",
    telefono: editing?.telefono ?? "",
    domicilio: editing?.domicilio ?? "",
    email: editing?.email ?? "",
    curp: editing?.curp ?? "",
    rfc: editing?.rfc ?? "",
    notas: editing?.notas ?? "",
  })
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    startTransition(async () => {
      const r = editing
        ? await updateCliente(editing.id, form)
        : await createCliente(form)
      if (!r.ok) {
        setError(r.error)
        if (r.fieldErrors) setFieldErrors(r.fieldErrors)
        return
      }
      onOpenChange(false)
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>Información personal y de contacto</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre completo</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={clienteConstraints.nombre.max} required />
            <FieldError errors={fieldErrors.nombre} />
            <FieldHint>{form.nombre.length}/{clienteConstraints.nombre.max}</FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} maxLength={clienteConstraints.telefono.max} required />
              <FieldError errors={fieldErrors.telefono} />
              <FieldHint>7-{clienteConstraints.telefono.max} caracteres</FieldHint>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FieldError errors={fieldErrors.email} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Domicilio</Label>
            <Textarea value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} maxLength={clienteConstraints.domicilio.max} required />
            <FieldError errors={fieldErrors.domicilio} />
            <FieldHint>{form.domicilio.length}/{clienteConstraints.domicilio.max}</FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>CURP</Label>
              <Input value={form.curp ?? ""} maxLength={clienteConstraints.curp.exact} onChange={(e) => setForm({ ...form, curp: e.target.value.toUpperCase() })} />
              <FieldError errors={fieldErrors.curp} />
              <FieldHint>{(form.curp ?? "").length}/{clienteConstraints.curp.exact} caracteres</FieldHint>
            </div>
            <div className="space-y-1">
              <Label>RFC</Label>
              <Input value={form.rfc ?? ""} maxLength={clienteConstraints.rfc.max} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} />
              <FieldError errors={fieldErrors.rfc} />
              <FieldHint>{clienteConstraints.rfc.min}-{clienteConstraints.rfc.max} caracteres</FieldHint>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} maxLength={clienteConstraints.notas.max} />
            <FieldError errors={fieldErrors.notas} />
            <FieldHint>{(form.notas ?? "").length}/{clienteConstraints.notas.max}</FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-between">
            {editing && (
              <Button type="button" variant="destructive"
                onClick={() => {
                  if (!confirm("¿Eliminar cliente?")) return
                  startTransition(async () => {
                    const r = await deleteCliente(editing.id)
                    if (!r.ok) { setError(r.error); return }
                    onOpenChange(false); onDone()
                  })
                }}><Trash2 className="h-4 w-4" /></Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ExpedienteDialog({
  cliente,
  onOpenChange,
  onDone,
}: {
  cliente: ClienteDTO | null
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [files, setFiles] = useState<string[]>(cliente?.expediente ?? [])
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadingName, setUploadingName] = useState("")

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !cliente) return
    if(!veriFyFileSize(file, 5)) {
      setError("Archivo demasiado grande. Máximo 5 MB.")
      return
    }
    setError("")
    setUploadingName(file.name)
    startTransition(async () => {
      try {
        const r = await addExpedienteFile(cliente.id, file)
        if (!r.ok) { setError(r.error); return }
        setFiles((prev) => [...prev, r.data.url])
        onDone()
      } finally {
        setUploadingName("")
      }
    })
    e.target.value = ""
  }

  const handleDelete = (url: string) => {
    if (!cliente) return
    if (!confirm("¿Eliminar archivo?")) return
    startTransition(async () => {
      const r = await removeExpedienteFile(cliente.id, url)
      if (!r.ok) { setError(r.error); return }
      setFiles((prev) => prev.filter((f) => f !== url))
      onDone()
    })
  }

  const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)
  const fileName = (url: string) => decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? url)

  return (
    <>
      <Dialog open={!!cliente} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[90dvh] flex flex-col gap-0 p-1">
          {pending && (
            <div className="h-1 w-full overflow-hidden rounded-t-md bg-muted">
              <div className="h-full w-full animate-pulse bg-primary/70" />
            </div>
          )}
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle className="text-base leading-tight">Expediente — {cliente?.nombre}</DialogTitle>
            <DialogDescription className="text-xs">
              INE, comprobantes, fotos (PDF/JPG/PNG) · máx. 5 MB por archivo
            </DialogDescription>
          </DialogHeader>
           
          <div className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Upload area */}
            <Label className="flex flex-col items-center gap-1.5 cursor-pointer border-2 border-dashed rounded-xl p-5 text-center hover:bg-muted/50 transition-colors">
              {pending ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{pending ? "Subiendo archivo..." : "Toca para subir un archivo"}</span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG</span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={pending} />
            </Label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {/* File list */}
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin documentos</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {files.map((url) => (
                  <div key={url} className="group relative border rounded-lg overflow-hidden bg-muted/30">
                    {isImage(url) ? (
                      <button
                        className="w-full aspect-square"
                        onClick={() => setPreview(url)}
                        title={fileName(url)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={fileName(url)} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 aspect-square text-muted-foreground hover:text-foreground transition-colors"
                        title={fileName(url)}
                      >
                        <FileText className="h-8 w-8" />
                        <span className="text-[11px] px-1 text-center line-clamp-2 break-all">{fileName(url)}</span>
                      </a>
                    )}
                    {/* Delete overlay */}
                    <button
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleDelete(url)}
                      title="Eliminar"
                      disabled={pending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {/* File name tooltip on hover for images */}
                    {isImage(url) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {fileName(url)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pending && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="max-w-[220px] truncate text-xs font-medium">
                    Subiendo {uploadingName || "archivo"}...
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview lightbox */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-screen-md w-full p-2 bg-black/90 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="w-full max-h-[85dvh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
