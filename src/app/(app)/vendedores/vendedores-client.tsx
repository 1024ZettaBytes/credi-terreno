"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, Trash2, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createVendedor, updateVendedor, deleteVendedor, getVendedorDetalle } from "@/features/sales/vendor-actions"
import { vendedorConstraints } from "@/features/sales/vendor-schemas"
import { FieldError, FieldHint, FormError } from "@/components/ui/field-error"
import type { VendedorDTO } from "@/types"
import type { VendedorDetalleDTO } from "@/features/sales/vendor-queries"
import type { UserRole } from "@prisma/client"

export function VendedoresClient({ vendedores, userRole }: { vendedores: VendedorDTO[]; userRole: UserRole }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VendedorDTO | null>(null)
  const [detalle, setDetalle] = useState<VendedorDetalleDTO | null>(null)
  const [pending, startTransition] = useTransition()

  const isAdmin = userRole === "ADMIN"

  const handleVerDetalle = async (v: VendedorDTO) => {
    startTransition(async () => {
      const r = await getVendedorDetalle(v.id)
      if (r.ok) setDetalle(r.data)
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendedores</h1>
          <p className="text-sm text-muted-foreground">{vendedores.length} registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nuevo vendedor
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Listado</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell">{v.telefono ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{v.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={v.activo ? "success" : "secondary"}>{v.activo ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Ver detalle" onClick={() => handleVerDetalle(v)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true) }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" disabled={pending}
                          onClick={() => {
                            if (!confirm("¿Eliminar/desactivar vendedor?")) return
                            startTransition(async () => {
                              await deleteVendedor(v.id)
                              router.refresh()
                            })
                          }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {vendedores.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin vendedores</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VendedorDialog key={`vendedor-${editing?.id ?? "new"}`} open={open} onOpenChange={setOpen} editing={editing} onDone={() => router.refresh()} />
      {detalle && <VendedorDetalleDialog detalle={detalle} onOpenChange={(o) => !o && setDetalle(null)} />}
    </>
  )
}

function VendedorDialog({
  open, onOpenChange, editing, onDone,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: VendedorDTO | null; onDone: () => void }) {
  const [form, setForm] = useState({
    nombre: editing?.nombre ?? "",
    telefono: editing?.telefono ?? "",
    email: editing?.email ?? "",
    notas: editing?.notas ?? "",
    activo: editing?.activo ?? true,
  })
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    startTransition(async () => {
      const r = editing ? await updateVendedor(editing.id, form) : await createVendedor(form)
      if (!r.ok) {
        setError(r.error)
        if (r.fieldErrors) setFieldErrors(r.fieldErrors)
        return
      }
      onOpenChange(false); onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar vendedor" : "Nuevo vendedor"}</DialogTitle>
          <DialogDescription>Datos de contacto del vendedor</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={vendedorConstraints.nombre.max} required />
            <FieldError errors={fieldErrors.nombre} />
            <FieldHint>{form.nombre.length}/{vendedorConstraints.nombre.max}</FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} maxLength={vendedorConstraints.telefono.max} />
              <FieldError errors={fieldErrors.telefono} />
              <FieldHint>Máx. {vendedorConstraints.telefono.max} caracteres</FieldHint>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FieldError errors={fieldErrors.email} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} maxLength={vendedorConstraints.notas.max} rows={3} />
            <FieldError errors={fieldErrors.notas} />
            <FieldHint>{(form.notas ?? "").length}/{vendedorConstraints.notas.max}</FieldHint>
          </div>
          <div className="flex items-center gap-2">
            <input id="activo" type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VendedorDetalleDialog({
  detalle, onOpenChange,
}: {
  detalle: VendedorDetalleDTO
  onOpenChange: (o: boolean) => void
}) {
  const formatMoney = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(num)
  }

  const formatDate = (dateStr: string) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + "T12:00:00Z")
      : new Date(dateStr)
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{detalle.nombre}</DialogTitle>
          <DialogDescription>{detalle.telefono} • {detalle.email}</DialogDescription>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Total de ventas</p>
            <p className="text-lg font-bold">{detalle.totalVentas}</p>
          </div>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Ventas activas</p>
            <p className="text-lg font-bold text-green-600">{detalle.ventasActivas}</p>
          </div>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Ventas cerradas</p>
            <p className="text-lg font-bold text-blue-600">{detalle.ventasCerradas}</p>
          </div>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Comisión total</p>
            <p className="text-lg font-bold text-purple-600">{formatMoney(detalle.totalComision)}</p>
          </div>
        </div>

        {/* Promedio */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">Promedio por venta</p>
          <p className="text-2xl font-bold text-purple-700">{formatMoney(detalle.promedioPorVenta)}</p>
        </div>

        {/* Ventas */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Ventas ({detalle.ventas.length})</h3>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Lote</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="hidden sm:table-cell">Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.ventas.map((v) => (
                  <TableRow key={v.id} className="text-xs md:text-sm">
                    <TableCell>{formatDate(v.fechaVenta)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{v.cliente?.nombre ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{v.lote?.numLote ?? "—"}</TableCell>
                    <TableCell>{formatMoney(v.precioTotal)}</TableCell>
                    <TableCell className="hidden sm:table-cell font-semibold text-purple-600">
                      {formatMoney(v.comisionMonto)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={v.estatus === "ACTIVO" ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {v.estatus === "ACTIVO" ? "Activa" : "Cerrada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {detalle.ventas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                      Sin ventas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
