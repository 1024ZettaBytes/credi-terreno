import Link from "next/link"
import { listVentas } from "@/features/sales/queries"
import type { VentaDTOConProximoPago } from "@/features/sales/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda, formatearFecha } from "@/lib/money"
import type { EstatusVenta } from "@prisma/client"

export const dynamic = "force-dynamic"

const variant: Record<EstatusVenta, "success" | "secondary" | "warning" | "destructive"> = {
  ACTIVO: "success",
  LIQUIDADO: "secondary",
  TRASPASADO: "warning",
  CANCELADO: "destructive",
}

export default async function VentasPage() {
  const ventas = await listVentas()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Ventas</h1>
        <p className="text-sm text-muted-foreground">{ventas.length} ventas registradas</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Mensualidad</TableHead>
                <TableHead className="hidden lg:table-cell">Próximo pago</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatearFecha(v.fechaVenta)}</TableCell>
                  <TableCell className="font-medium">{v.cliente?.nombre}</TableCell>
                  <TableCell>{v.lote?.manzana?.nombre}-{v.lote?.numLote}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{v.vendedor?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{formatearMoneda(v.precioTotal)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{formatearMoneda(v.mensualidadBase)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">
                    {(v as VentaDTOConProximoPago).proximoPago
                      ? formatearFecha((v as VentaDTOConProximoPago).proximoPago!)
                      : "—"}
                  </TableCell>
                  <TableCell><Badge variant={variant[v.estatus]}>{v.estatus}</Badge></TableCell>
                  <TableCell><Link href={`/ventas/${v.id}`} className="text-blue-600 text-sm hover:underline">Ver</Link></TableCell>
                </TableRow>
              ))}
              {ventas.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin ventas. Crea una desde Inventario.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
