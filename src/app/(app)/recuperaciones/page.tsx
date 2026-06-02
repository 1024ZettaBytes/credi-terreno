import { listRecuperaciones } from "@/features/sales/queries"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function RecuperacionesPage() {
  const items = await listRecuperaciones()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Recuperaciones</h1>
        <p className="text-sm text-muted-foreground">{items.length} lotes recuperados</p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Total pagado</TableHead>
                <TableHead className="text-right">% Devolución</TableHead>
                <TableHead className="text-right">Devolución</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatearFecha(r.fechaRecuperacion)}</TableCell>
                  <TableCell>{r.cliente}</TableCell>
                  <TableCell>{r.lote}</TableCell>
                  <TableCell className="text-right">{formatearMoneda(r.totalPagadoCliente)}</TableCell>
                  <TableCell className="text-right">{r.porcentajeDevolucion}%</TableCell>
                  <TableCell className="text-right font-semibold">{formatearMoneda(r.montoDevolucion)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.motivo ?? "—"}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin recuperaciones</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
