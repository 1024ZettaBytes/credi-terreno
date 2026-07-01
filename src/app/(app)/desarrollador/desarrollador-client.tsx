"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Wrench, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldHint, FormError } from "@/components/ui/field-error"
import { formatearFecha } from "@/lib/money"
import { parseLocalDate } from "@/lib/date"
import { ajustarFechaPrimerPago } from "@/features/dev/actions"
import type { VentaAjusteDTO } from "@/features/dev/queries"

export function DesarrolladorClient({ ventas }: { ventas: VentaAjusteDTO[] }) {
  const router = useRouter()
  const [ventaId, setVentaId] = useState("")
  const [fechaPrimerPago, setFechaPrimerPago] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const venta = ventas.find((v) => v.id === ventaId) ?? null

  const onSelectVenta = (id: string) => {
    setVentaId(id)
    setError("")
    const v = ventas.find((x) => x.id === id)
    setFechaPrimerPago(v ? v.fechaPrimerPago ?? v.proximaFechaPago : "")
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!venta) return
    setError("")
    startTransition(async () => {
      const r = await ajustarFechaPrimerPago({ ventaId, fechaPrimerPago })
      if (!r.ok) {
        setError(r.error)
        return
      }
      toast.success(
        `Venta ajustada: ${r.data.ajustados} pago(s) reubicados. Próximo pago: ${formatearFecha(
          r.data.proximaFechaPago,
        )}.`,
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">Desarrollador</h1>
          <p className="text-sm text-muted-foreground">
            Herramientas de ajuste de datos. Úsalas con cuidado.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ajustar fecha del primer pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Reubica el calendario de la venta y re-estampa los pagos de mensualidad ya
              registrados al nuevo programa. El día de pago se toma de la fecha elegida.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label>Venta</Label>
              <Select value={ventaId} onValueChange={onSelectVenta}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una venta" />
                </SelectTrigger>
                <SelectContent>
                  {ventas.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.etiqueta} ({v.estatus})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ventas.length === 0 && (
                <FieldHint>No hay ventas registradas.</FieldHint>
              )}
            </div>

            {venta && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 text-sm">
                <Info label="Fecha de venta" value={formatearFecha(venta.fechaVenta)} />
                <Info label="Día de pago" value={`día ${venta.diaPago}`} />
                <Info
                  label="Primer pago actual"
                  value={venta.fechaPrimerPago ? formatearFecha(venta.fechaPrimerPago) : "— (heredada)"}
                />
                <Info label="Próximo pago" value={formatearFecha(venta.proximaFechaPago)} />
                <Info
                  label="Mensualidad en curso"
                  value={`#${venta.numeroMensualidadActual} de ${venta.plazoMeses}`}
                />
                <Info label="Pagos registrados" value={String(venta.totalPagos)} />
              </div>
            )}

            <div className="space-y-1">
              <Label>Nueva fecha del primer pago</Label>
              <DatePicker
                value={fechaPrimerPago}
                onChange={(v) => setFechaPrimerPago(v)}
                disabled={!venta}
                required
              />
              {fechaPrimerPago && venta && (
                <FieldHint>
                  Mensualidad #1 vencerá el {formatearFecha(parseLocalDate(fechaPrimerPago))}. Las
                  siguientes el día {parseLocalDate(fechaPrimerPago).getUTCDate()} de cada mes.
                </FieldHint>
              )}
            </div>

            <FormError error={error} />
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || !venta || !fechaPrimerPago}>
                {pending ? "Ajustando..." : "Guardar ajuste"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
