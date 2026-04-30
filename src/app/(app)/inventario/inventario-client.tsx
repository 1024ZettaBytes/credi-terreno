"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, Trash2, Layers, MapPin, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda } from "@/lib/money"
import { cn } from "@/lib/utils"
import {
  createManzana,
  updateManzana,
  deleteManzana,
  createLote,
  updateLote,
  deleteLote,
} from "@/features/inventory/actions"
import { createVenta } from "@/features/sales/actions"
import type { ManzanaDTO, LoteDTO, ClienteDTO, VendedorDTO, EstatusLote } from "@/types"

const estatusColor: Record<EstatusLote, "success" | "warning" | "destructive" | "secondary"> = {
  DISPONIBLE: "success",
  VENDIDO: "destructive",
  RECUPERADO: "warning",
  TRASPASADO: "secondary",
}

interface Props {
  manzanas: ManzanaDTO[]
  lotes: LoteDTO[]
  clientes: ClienteDTO[]
  vendedores: VendedorDTO[]
}

export function InventarioClient({ manzanas, lotes, clientes, vendedores }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filtroManzana, setFiltroManzana] = useState<string>("")
  const [filtroEstatus, setFiltroEstatus] = useState<string>("")

  const [openManzana, setOpenManzana] = useState(false)
  const [editManzana, setEditManzana] = useState<ManzanaDTO | null>(null)
  const [openLote, setOpenLote] = useState(false)
  const [editLote, setEditLote] = useState<LoteDTO | null>(null)
  const [openVender, setOpenVender] = useState<LoteDTO | null>(null)

  const lotesFiltrados = lotes.filter((l) => {
    if (filtroManzana && l.manzanaId !== filtroManzana) return false
    if (filtroEstatus && l.estatus !== filtroEstatus) return false
    return true
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">Manzanas y lotes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditManzana(null); setOpenManzana(true) }}>
            <Layers className="h-4 w-4" /> Nueva manzana
          </Button>
          <Button onClick={() => { setEditLote(null); setOpenLote(true) }}>
            <Plus className="h-4 w-4" /> Nuevo lote
          </Button>
        </div>
      </div>

      {/* Manzanas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manzanas ({manzanas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {manzanas.map((m) => (
              <div key={m.id} className="border rounded-lg p-3 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground">{m.totalLotes ?? 0} lotes</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button
                      className="text-slate-500 hover:text-slate-900"
                      onClick={() => { setEditManzana(m); setOpenManzana(true) }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (!confirm(`Eliminar manzana ${m.nombre}?`)) return
                        startTransition(async () => {
                          const r = await deleteManzana(m.id)
                          if (!r.ok) alert(r.error)
                          router.refresh()
                        })
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {manzanas.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                Sin manzanas. Crea una para empezar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros + Lotes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Lotes ({lotesFiltrados.length})</CardTitle>
            <div className="flex gap-2">
              <Select value={filtroManzana || "ALL"} onValueChange={(v) => setFiltroManzana(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Manzana" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {manzanas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroEstatus || "ALL"} onValueChange={(v) => setFiltroEstatus(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estatus" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="VENDIDO">Vendido</SelectItem>
                  <SelectItem value="RECUPERADO">Recuperado</SelectItem>
                  <SelectItem value="TRASPASADO">Traspasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden sm:table-cell">Sup. m²</TableHead>
                <TableHead className="hidden md:table-cell">$/m²</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotesFiltrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {l.manzana?.nombre}-{l.numLote}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{l.superficieM2}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatearMoneda(l.precioM2)}</TableCell>
                  <TableCell className="font-semibold">{formatearMoneda(l.totalPrecio)}</TableCell>
                  <TableCell>
                    <Badge variant={estatusColor[l.estatus]}>{l.estatus}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {l.ventaActiva?.clienteNombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {(l.estatus === "DISPONIBLE" || l.estatus === "RECUPERADO") && (
                        <Button size="sm" variant="default" onClick={() => setOpenVender(l)}>
                          Vender
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditLote(l); setOpenLote(true) }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lotesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sin lotes con esos filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManzanaDialog
        open={openManzana}
        onOpenChange={setOpenManzana}
        editing={editManzana}
        onDone={() => router.refresh()}
      />
      <LoteDialog
        open={openLote}
        onOpenChange={setOpenLote}
        editing={editLote}
        manzanas={manzanas}
        onDone={() => router.refresh()}
      />
      <VenderDialog
        lote={openVender}
        onOpenChange={(o) => !o && setOpenVender(null)}
        clientes={clientes}
        vendedores={vendedores}
        onDone={() => router.refresh()}
      />
    </>
  )
}

function ManzanaDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: ManzanaDTO | null
  onDone: () => void
}) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  // reset on open change
  if (open && editing && nombre !== editing.nombre && !pending) {
    // Use effect-less guard: only seed when dialog just opened with new editing data.
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const r = editing
        ? await updateManzana(editing.id, { nombre, descripcion })
        : await createManzana({ nombre, descripcion })
      if (!r.ok) {
        setError(r.error)
        return
      }
      onOpenChange(false)
      setNombre(""); setDescripcion("")
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setError(""); setNombre(editing?.nombre ?? ""); setDescripcion(editing?.descripcion ?? "") } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar manzana" : "Nueva manzana"}</DialogTitle>
          <DialogDescription>Datos generales de la manzana</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea value={descripcion ?? ""} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LoteDialog({
  open,
  onOpenChange,
  editing,
  manzanas,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: LoteDTO | null
  manzanas: ManzanaDTO[]
  onDone: () => void
}) {
  const [form, setForm] = useState({
    manzanaId: editing?.manzanaId ?? manzanas[0]?.id ?? "",
    numLote: editing?.numLote ?? "",
    superficieM2: editing?.superficieM2 ?? "",
    precioM2: editing?.precioM2 ?? "",
    notas: editing?.notas ?? "",
  })
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const total = (Number(form.superficieM2) || 0) * (Number(form.precioM2) || 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const payload = { ...form, superficieM2: Number(form.superficieM2), precioM2: Number(form.precioM2) }
      const r = editing
        ? await updateLote(editing.id, payload)
        : await createLote(payload)
      if (!r.ok) { setError(r.error); return }
      onOpenChange(false)
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lote" : "Nuevo lote"}</DialogTitle>
          <DialogDescription>Total se calcula: superficie × precio/m²</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Manzana</Label>
            <Select value={form.manzanaId} onValueChange={(v) => setForm({ ...form, manzanaId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {manzanas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Número de lote</Label>
            <Input value={form.numLote} onChange={(e) => setForm({ ...form, numLote: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Superficie m²</Label>
              <Input type="number" step="0.01" value={form.superficieM2} onChange={(e) => setForm({ ...form, superficieM2: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Precio por m²</Label>
              <Input type="number" step="0.01" value={form.precioM2} onChange={(e) => setForm({ ...form, precioM2: e.target.value })} required />
            </div>
          </div>
          <div className="bg-slate-100 p-2 rounded text-sm">
            Total: <span className="font-semibold">{formatearMoneda(total)}</span>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
          <div className="flex gap-2 justify-between">
            <div>
              {editing && (
                <Button type="button" variant="destructive" disabled={pending}
                  onClick={() => {
                    if (!confirm("¿Eliminar lote?")) return
                    startTransition(async () => {
                      const r = await deleteLote(editing.id)
                      if (!r.ok) { setError(r.error); return }
                      onOpenChange(false); onDone()
                    })
                  }}
                ><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VenderDialog({
  lote,
  onOpenChange,
  clientes,
  vendedores,
  onDone,
}: {
  lote: LoteDTO | null
  onOpenChange: (o: boolean) => void
  clientes: ClienteDTO[]
  vendedores: VendedorDTO[]
  onDone: () => void
}) {
  const [form, setForm] = useState({
    clienteId: "",
    vendedorId: "",
    enganche: "",
    plazoMeses: "12",
    diaPago: "5",
    interesMoratorioPorcentaje: "5",
    notas: "",
  })
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const precio = Number(lote?.totalPrecio ?? 0)
  const enganche = Number(form.enganche || 0)
  const plazo = Number(form.plazoMeses || 1)
  const mensualidad = plazo > 0 ? (precio - enganche) / plazo : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lote) return
    setError("")
    startTransition(async () => {
      const r = await createVenta({
        ...form,
        loteId: lote.id,
        vendedorId: form.vendedorId || null,
        enganche: Number(form.enganche),
        plazoMeses: Number(form.plazoMeses),
        diaPago: Number(form.diaPago),
        interesMoratorioPorcentaje: Number(form.interesMoratorioPorcentaje),
        fechaVenta: new Date(),
      })
      if (!r.ok) { setError(r.error); return }
      onOpenChange(false)
      onDone()
    })
  }

  return (
    <Dialog open={!!lote} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vender lote {lote?.manzana?.nombre}-{lote?.numLote}</DialogTitle>
          <DialogDescription>
            Precio total: <span className="font-semibold">{formatearMoneda(precio)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Vendedor (opcional)</Label>
            <Select value={form.vendedorId || "NONE"} onValueChange={(v) => setForm({ ...form, vendedorId: v === "NONE" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Sin vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin vendedor</SelectItem>
                {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nombre} ({v.comisionPorcentaje}%)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Enganche</Label>
              <Input type="number" step="0.01" value={form.enganche} onChange={(e) => setForm({ ...form, enganche: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Plazo (meses)</Label>
              <Input type="number" min="1" value={form.plazoMeses} onChange={(e) => setForm({ ...form, plazoMeses: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Día de pago (1-28)</Label>
              <Input type="number" min="1" max="28" value={form.diaPago} onChange={(e) => setForm({ ...form, diaPago: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>% mora mensual</Label>
              <Input type="number" step="0.01" value={form.interesMoratorioPorcentaje} onChange={(e) => setForm({ ...form, interesMoratorioPorcentaje: e.target.value })} required />
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
            <div className="flex justify-between"><span>Monto a financiar:</span><span className="font-semibold">{formatearMoneda(precio - enganche)}</span></div>
            <div className="flex justify-between"><span>Mensualidad estimada:</span><span className="font-semibold">{formatearMoneda(mensualidad)}</span></div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          {error && <p className={cn("text-sm text-red-600 flex items-center gap-1")}><AlertCircle className="h-4 w-4" />{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando..." : "Crear venta"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
