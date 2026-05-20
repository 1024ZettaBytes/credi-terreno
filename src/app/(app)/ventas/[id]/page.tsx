import { notFound } from "next/navigation"
import Link from "next/link"
import { getVenta } from "@/features/sales/queries"
import { getEstadoCuenta } from "@/features/payments/actions"
import { listClientes } from "@/features/clients/queries"
import { listVendedores } from "@/features/sales/vendor-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"
import { formatDateISO } from "@/lib/date"
import { ArrowLeft } from "lucide-react"
import { VentaDetalleClient } from "./venta-detalle-client"
import { ComprobanteButton } from "@/components/ui/comprobante-button"
import { getOptionalUser } from "@/lib/rbac"

export const dynamic = "force-dynamic"

const variant = {
  ACTIVO: "success", LIQUIDADO: "secondary", TRASPASADO: "warning", CANCELADO: "destructive",
} as const

export default async function VentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [venta, estado, clientes, vendedores, user] = await Promise.all([
    getVenta(id),
    getEstadoCuenta(id),
    listClientes(),
    listVendedores(true),
    getOptionalUser(),
  ])
  if (!venta) notFound()

  const estadoSerializado = estado
    ? {
        saldoCapital: estado.saldoCapital.toFixed(2),
        totalDeuda: estado.totalDeuda.toFixed(2),
        moraPendiente: estado.moraPendiente.toFixed(2),
        saldoMensualidadActual: estado.saldoMensualidadActual.toFixed(2),
        numeroMensualidadActual: estado.numeroMensualidadActual,
        mensualidadesPagadas: estado.mensualidadesPagadas,
        mensualidadesPendientes: estado.mensualidadesPendientes,
        proximaFechaPago: formatDateISO(estado.proximaFechaPago),
        diasAtraso: estado.diasAtraso,
        estaEnMora: estado.estaEnMora,
        liquidado: estado.liquidado,
      }
    : null

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <Link href="/ventas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a ventas
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Venta {venta.lote?.manzana?.nombre}-{venta.lote?.numLote}
          </h1>
          <p className="text-sm text-muted-foreground">{venta.cliente?.nombre}</p>
        </div>
        <Badge variant={variant[venta.estatus]}>{venta.estatus}</Badge>
      </div>

      {estadoSerializado && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Saldo capital" value={formatearMoneda(estadoSerializado.saldoCapital)} />
          <KpiBox label="Mora acumulada" value={formatearMoneda(estadoSerializado.moraPendiente)} accent={estadoSerializado.estaEnMora ? "red" : undefined} />
          <KpiBox label="Adeudo total" value={formatearMoneda(estadoSerializado.totalDeuda)} accent={estadoSerializado.estaEnMora ? "red" : undefined} />
          <KpiBox label="Mensualidades" value={`${estadoSerializado.mensualidadesPagadas}/${venta.plazoMeses}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Pagos</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Periodo</TableHead>
                  <TableHead>Mora</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.pagos?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatearFecha(p.fechaRegistro)}</TableCell>
                    <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      {p.periodoMes ? `${String(p.periodoMes).padStart(2, "0")}/${p.periodoAnio}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{p.diasMora ? `${p.diasMora}d` : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatearMoneda(p.monto)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{p.comprobanteUrl ? <ComprobanteButton url={p.comprobanteUrl} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
                {(!venta.pagos || venta.pagos.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin pagos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Fecha venta" value={formatearFecha(venta.fechaVenta)} />
            <Row label="Precio total" value={formatearMoneda(venta.precioTotal)} />
            <Row label="Enganche" value={formatearMoneda(venta.enganche)} />
            <Row label="Financiado" value={formatearMoneda(venta.montoFinanciado)} />
            <Row label="Mensualidad" value={formatearMoneda(venta.mensualidadBase)} />
            <Row label="Plazo" value={`${venta.plazoMeses} meses`} />
            <Row label="Día de pago" value={`día ${venta.diaPago}`} />
            {estadoSerializado && !estadoSerializado.liquidado && (
              <Row label="Próximo pago" value={formatearFecha(estadoSerializado.proximaFechaPago)} />
            )}
            <Row label="% Mora mensual" value={`${venta.interesMoratorioPorcentaje}%`} />
            {venta.vendedor && (
              <>
                <Row label="Vendedor" value={venta.vendedor.nombre} />
                <Row label="Comisión" value={`${formatearMoneda(venta.comisionMonto)} (${venta.comisionPorcentaje}%)`} />
              </>
            )}
            {venta.notas && <p className="text-xs text-muted-foreground border-t pt-2">{venta.notas}</p>}
          </CardContent>
        </Card>
      </div>

      <VentaDetalleClient
        venta={venta}
        estado={estadoSerializado}
        clientes={clientes}
        vendedores={vendedores}
        userRole={user?.role}
      />
    </div>
  )
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: "red" }) {
  return (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${accent === "red" ? "text-red-600" : ""}`}>{value}</p>
    </CardContent></Card>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
}
