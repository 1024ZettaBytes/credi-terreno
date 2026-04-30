import { listTraspasos } from "@/features/sales/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function TraspasosPage() {
  const items = await listTraspasos()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Traspasos</h1>
        <p className="text-sm text-muted-foreground">{items.length} registros · Iníciese desde el detalle de una venta activa</p>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Cliente anterior</TableHead>
                <TableHead>Cliente nuevo</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{formatearFecha(t.fechaTraspaso)}</TableCell>
                  <TableCell>{t.lote}</TableCell>
                  <TableCell>{t.clienteAnterior.nombre}</TableCell>
                  <TableCell className="font-medium">{t.clienteNuevo.nombre}</TableCell>
                  <TableCell className="text-right">{formatearMoneda(t.costoTraspaso)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin traspasos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
