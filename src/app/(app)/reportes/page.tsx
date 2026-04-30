import { listPagos } from "@/features/payments/queries"
import { listVentas } from "@/features/sales/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function ReportesPage(props: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const sp = await props.searchParams
  const desde = sp.desde ? new Date(sp.desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const hasta = sp.hasta ? new Date(sp.hasta) : new Date()

  const [pagos, ventas] = await Promise.all([
    listPagos({ desde, hasta }),
    listVentas(),
  ])

  const ventasEnRango = ventas.filter((v) => {
    const f = new Date(v.fechaVenta)
    return f >= desde && f <= hasta
  })

  const totalPagos = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const pagosPorTipo = pagos.reduce<Record<string, number>>((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] ?? 0) + Number(p.monto)
    return acc
  }, {})
  const totalVentas = ventasEnRango.reduce((s, v) => s + Number(v.precioTotal), 0)
  const totalComisiones = ventasEnRango.reduce((s, v) => s + Number(v.comisionMonto), 0)

  const isoDesde = desde.toISOString().slice(0, 10)
  const isoHasta = hasta.toISOString().slice(0, 10)

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Periodo: {formatearFecha(desde)} — {formatearFecha(hasta)}</p>
      </div>

      <form method="get" className="flex flex-col sm:flex-row gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <input type="date" name="desde" defaultValue={isoDesde} className="block border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input type="date" name="hasta" defaultValue={isoHasta} className="block border rounded px-2 py-1 text-sm" />
        </div>
        <button className="bg-primary text-primary-foreground rounded px-3 py-1 text-sm">Aplicar</button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Pagos cobrados" value={formatearMoneda(totalPagos)} sub={`${pagos.length} pagos`} />
        <Kpi label="Ventas creadas" value={formatearMoneda(totalVentas)} sub={`${ventasEnRango.length} ventas`} />
        <Kpi label="Comisiones generadas" value={formatearMoneda(totalComisiones)} />
        <Kpi label="Mora cobrada" value={formatearMoneda(pagosPorTipo["MORATORIO"] ?? 0)} accent="red" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pagos por tipo</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(["ENGANCHE", "MENSUALIDAD", "ABONO_CAPITAL", "MORATORIO", "LIQUIDACION"] as const).map((t) => (
              <div key={t} className="border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">{t}</p>
                <p className="font-semibold">{formatearMoneda(pagosPorTipo[t] ?? 0)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Ventas en el periodo</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Comisión</TableHead>
                <TableHead>Estatus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasEnRango.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs">{formatearFecha(v.fechaVenta)}</TableCell>
                  <TableCell>{v.cliente?.nombre}</TableCell>
                  <TableCell>{v.lote?.manzana?.nombre}-{v.lote?.numLote}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{v.vendedor?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatearMoneda(v.precioTotal)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{formatearMoneda(v.comisionMonto)}</TableCell>
                  <TableCell><Badge variant="outline">{v.estatus}</Badge></TableCell>
                </TableRow>
              ))}
              {ventasEnRango.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin ventas en el periodo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pagos del periodo</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{formatearFecha(p.fechaRegistro)}</TableCell>
                  <TableCell>{p.ventaCliente}</TableCell>
                  <TableCell>{p.ventaLote}</TableCell>
                  <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                  <TableCell className="text-right">{formatearMoneda(p.monto)}</TableCell>
                </TableRow>
              ))}
              {pagos.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin pagos en el periodo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "red" }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${accent === "red" ? "text-red-600" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent></Card>
  )
}
