import Link from "next/link"
import { listPagos } from "@/features/payments/queries"
import { parseLocalDate } from "@/lib/date"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"
import { ComprobanteButton } from "@/components/ui/comprobante-button"

export const dynamic = "force-dynamic"

export default async function PagosPage(props: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await props.searchParams
  const desde = sp.desde ? parseLocalDate(sp.desde) : undefined
  const hasta = sp.hasta ? parseLocalDate(sp.hasta) : undefined
  const pagos = await listPagos({ desde, hasta })
  const total = pagos.reduce((sum, p) => sum + Number(p.monto), 0)

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Pagos</h1>
        <p className="text-sm text-muted-foreground">{pagos.length} pagos · Total: {formatearMoneda(total)}</p>
      </div>

      <form method="get" className="flex flex-col sm:flex-row gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <input type="date" name="desde" defaultValue={sp.desde} className="block border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input type="date" name="hasta" defaultValue={sp.hasta} className="block border rounded px-2 py-1 text-sm" />
        </div>
        <button className="bg-primary text-primary-foreground rounded px-3 py-1 text-sm">Filtrar</button>
      </form>

      <Card>
        <CardHeader><CardTitle className="text-lg">Listado</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Lote</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="hidden sm:table-cell">Comprobante</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatearFecha(p.fechaRegistro)}</TableCell>
                  <TableCell>{p.ventaCliente}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.ventaLote}</TableCell>
                  <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{formatearMoneda(p.monto)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.comprobanteUrl ? <ComprobanteButton url={p.comprobanteUrl} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Link className="text-blue-600 text-xs hover:underline" href={`/ventas/${p.ventaId}`}>Ver venta</Link></TableCell>
                </TableRow>
              ))}
              {pagos.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin pagos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
