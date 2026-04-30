"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, ArrowRightLeft, RotateCcw, AlertCircle } from "lucide-react"
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
import { registerPayment, uploadComprobante } from "@/features/payments/actions"
import { createTraspaso, recuperarLote, cancelarVenta, liquidarVenta } from "@/features/sales/actions"
import { formatearMoneda } from "@/lib/money"
import type { VentaDTO, ClienteDTO, VendedorDTO, UserRole } from "@/types"

interface EstadoSerializado {
  saldoCapital: string
  totalDeuda: string
  totalInteresMora: string
  mensualidadesPagadas: number
  mensualidadesPendientes: number
  proximoVencimiento: string | null
  estaEnMora: boolean
  liquidado: boolean
  mensualidadesVencidas: Array<{
    numero: number
    fechaVencimiento: string
    montoPendiente: string
    diasAtraso: number
    interesMora: string
  }>
}

interface Props {
  venta: VentaDTO
  estado: EstadoSerializado | null
  clientes: ClienteDTO[]
  vendedores: VendedorDTO[]
  userRole?: UserRole
}

export function VentaDetalleClient({ venta, estado, clientes, vendedores, userRole }: Props) {
  const [openPago, setOpenPago] = useState(false)
  const [openTraspaso, setOpenTraspaso] = useState(false)
  const [openRecuperacion, setOpenRecuperacion] = useState(false)
  const isAdmin = userRole === "ADMIN"
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const isActiva = venta.estatus === "ACTIVO"

  return (
    <>
      {estado && estado.mensualidadesVencidas.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader><CardTitle className="text-base text-red-700">Mensualidades vencidas</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {estado.mensualidadesVencidas.map((m) => (
              <div key={m.numero} className="flex justify-between text-sm">
                <span>#{m.numero} · {new Date(m.fechaVencimiento).toLocaleDateString("es-MX")} · {m.diasAtraso}d</span>
                <span className="font-semibold">{formatearMoneda(m.montoPendiente)} + {formatearMoneda(m.interesMora)} mora</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isActiva && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenPago(true)}>
            <DollarSign className="h-4 w-4" /> Registrar pago
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setOpenTraspaso(true)}>
                <ArrowRightLeft className="h-4 w-4" /> Traspasar
              </Button>
              <Button variant="outline" onClick={() => setOpenRecuperacion(true)}>
                <RotateCcw className="h-4 w-4" /> Recuperar lote
              </Button>
              <Button variant="outline" disabled={pending}
                onClick={() => {
                  if (!confirm("¿Marcar como liquidada?")) return
                  startTransition(async () => {
                    const r = await liquidarVenta(venta.id)
                    if (!r.ok) alert(r.error)
                    router.refresh()
                  })
                }}
              >Liquidar</Button>
              <Button variant="destructive" disabled={pending}
                onClick={() => {
                  if (!confirm("¿Cancelar venta? Lote volverá a Disponible.")) return
                  startTransition(async () => {
                    const r = await cancelarVenta(venta.id)
                    if (!r.ok) alert(r.error)
                    router.refresh()
                  })
                }}
              >Cancelar venta</Button>
            </>
          )}
        </div>
      )}

      <PagoDialog open={openPago} onOpenChange={setOpenPago} venta={venta} onDone={() => router.refresh()} />
      <TraspasoDialog
        open={openTraspaso}
        onOpenChange={setOpenTraspaso}
        venta={venta}
        clientes={clientes.filter((c) => c.id !== venta.clienteId)}
        vendedores={vendedores}
        onDone={() => router.refresh()}
      />
      <RecuperacionDialog
        open={openRecuperacion}
        onOpenChange={setOpenRecuperacion}
        venta={venta}
        onDone={() => router.refresh()}
      />
    </>
  )
}

function PagoDialog({
  open, onOpenChange, venta, onDone,
}: { open: boolean; onOpenChange: (o: boolean) => void; venta: VentaDTO; onDone: () => void }) {
  const [form, setForm] = useState({
    monto: venta.mensualidadBase,
    tipo: "MENSUALIDAD" as "MENSUALIDAD" | "ABONO_CAPITAL" | "MORATORIO" | "LIQUIDACION",
    periodoMes: String(new Date().getMonth() + 1),
    periodoAnio: String(new Date().getFullYear()),
    fechaRegistro: new Date().toISOString().slice(0, 10),
    notas: "",
    cobrarMoraAutomatica: true,
  })
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const [info, setInfo] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setInfo(null)
    startTransition(async () => {
      const r = await registerPayment({
        ventaId: venta.id,
        monto: Number(form.monto),
        tipo: form.tipo,
        fechaRegistro: new Date(form.fechaRegistro),
        periodoMes: form.tipo === "MENSUALIDAD" ? Number(form.periodoMes) : null,
        periodoAnio: form.tipo === "MENSUALIDAD" ? Number(form.periodoAnio) : null,
        comprobanteUrl,
        notas: form.notas,
        cobrarMoraAutomatica: form.cobrarMoraAutomatica,
      })
      if (!r.ok) { setError(r.error); return }
      if (r.data.diasMora > 0) {
        setInfo(`Pago registrado. Se generó cargo moratorio de ${formatearMoneda(r.data.montoMora)} (${r.data.diasMora} días de atraso).`)
        setTimeout(() => { onOpenChange(false); onDone() }, 2000)
      } else {
        onOpenChange(false); onDone()
      }
    })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const r = await uploadComprobante(venta.id, file)
    if (r.ok) setComprobanteUrl(r.data.url)
    else setError(r.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Mensualidad: {formatearMoneda(venta.mensualidadBase)} · Día: {venta.diaPago}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as typeof form.tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSUALIDAD">Mensualidad</SelectItem>
                <SelectItem value="ABONO_CAPITAL">Abono a capital</SelectItem>
                <SelectItem value="MORATORIO">Pago moratorio</SelectItem>
                <SelectItem value="LIQUIDACION">Liquidación total</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={form.fechaRegistro} onChange={(e) => setForm({ ...form, fechaRegistro: e.target.value })} required />
            </div>
          </div>
          {form.tipo === "MENSUALIDAD" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Mes (1-12)</Label>
                <Input type="number" min="1" max="12" value={form.periodoMes} onChange={(e) => setForm({ ...form, periodoMes: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Año</Label>
                <Input type="number" value={form.periodoAnio} onChange={(e) => setForm({ ...form, periodoAnio: e.target.value })} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input id="mora" type="checkbox" checked={form.cobrarMoraAutomatica} onChange={(e) => setForm({ ...form, cobrarMoraAutomatica: e.target.checked })} />
            <Label htmlFor="mora" className="text-xs cursor-pointer">Cobrar mora automática si hay atraso</Label>
          </div>
          <div className="space-y-1">
            <Label>Comprobante (opcional)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={handleFile} />
            {comprobanteUrl && <p className="text-xs text-green-600">✓ Subido</p>}
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
          {info && <p className="text-sm text-amber-700">{info}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Registrando..." : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TraspasoDialog({
  open, onOpenChange, venta, clientes, vendedores, onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  venta: VentaDTO
  clientes: ClienteDTO[]
  vendedores: VendedorDTO[]
  onDone: () => void
}) {
  const [form, setForm] = useState({
    clienteNuevoId: "",
    vendedorId: "",
    enganche: "0",
    plazoMeses: String(venta.plazoMeses),
    diaPago: String(venta.diaPago),
    interesMoratorioPorcentaje: venta.interesMoratorioPorcentaje,
    costoTraspaso: "0",
    notas: "",
  })
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const r = await createTraspaso({
        ventaOriginalId: venta.id,
        clienteNuevoId: form.clienteNuevoId,
        vendedorId: form.vendedorId || null,
        enganche: Number(form.enganche),
        plazoMeses: Number(form.plazoMeses),
        diaPago: Number(form.diaPago),
        interesMoratorioPorcentaje: Number(form.interesMoratorioPorcentaje),
        costoTraspaso: Number(form.costoTraspaso),
        fechaTraspaso: new Date(),
        notas: form.notas,
      })
      if (!r.ok) { setError(r.error); return }
      onOpenChange(false); onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traspasar lote</DialogTitle>
          <DialogDescription>
            La venta actual se cerrará como TRASPASADO y se creará una nueva venta para el cliente nuevo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Cliente nuevo</Label>
            <Select value={form.clienteNuevoId} onValueChange={(v) => setForm({ ...form, clienteNuevoId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
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
            <div className="space-y-1"><Label>Enganche</Label><Input type="number" step="0.01" value={form.enganche} onChange={(e) => setForm({ ...form, enganche: e.target.value })} /></div>
            <div className="space-y-1"><Label>Costo traspaso</Label><Input type="number" step="0.01" value={form.costoTraspaso} onChange={(e) => setForm({ ...form, costoTraspaso: e.target.value })} /></div>
            <div className="space-y-1"><Label>Plazo (meses)</Label><Input type="number" min="1" value={form.plazoMeses} onChange={(e) => setForm({ ...form, plazoMeses: e.target.value })} /></div>
            <div className="space-y-1"><Label>Día de pago</Label><Input type="number" min="1" max="28" value={form.diaPago} onChange={(e) => setForm({ ...form, diaPago: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>% mora</Label><Input type="number" step="0.01" value={form.interesMoratorioPorcentaje} onChange={(e) => setForm({ ...form, interesMoratorioPorcentaje: e.target.value })} /></div>
          <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Procesando..." : "Confirmar traspaso"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecuperacionDialog({
  open, onOpenChange, venta, onDone,
}: { open: boolean; onOpenChange: (o: boolean) => void; venta: VentaDTO; onDone: () => void }) {
  const [porcentaje, setPorcentaje] = useState("50")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const r = await recuperarLote({
        ventaId: venta.id,
        porcentajeDevolucion: Number(porcentaje),
        motivo,
      })
      if (!r.ok) { setError(r.error); return }
      alert(`Lote recuperado. Devolución: ${formatearMoneda(r.data.montoDevolucion)}`)
      onOpenChange(false); onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar lote</DialogTitle>
          <DialogDescription>
            La venta se cancelará y el lote pasará a estatus RECUPERADO. Indica el % a devolver al cliente sobre el total pagado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>% Devolución sobre total pagado</Label>
            <Input type="number" min="0" max="100" step="0.01" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Procesando..." : "Confirmar recuperación"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
