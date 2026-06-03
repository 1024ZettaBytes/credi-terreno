import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react"
import { getManzanaDetalle } from "@/features/inventory/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatearMoneda } from "@/lib/money"
import { requireUser } from "@/lib/rbac"
import type { EstatusLote } from "@/types"

export const dynamic = "force-dynamic"

const estatusColor: Record<EstatusLote, "success" | "warning" | "destructive" | "secondary"> = {
  DISPONIBLE: "success",
  VENDIDO: "destructive",
  RECUPERADO: "warning",
  TRASPASADO: "secondary",
}

export default async function ManzanaDetallePage({ params }: { params: Promise<{ manzanaId: string }> }) {
  await requireUser()
  const { manzanaId } = await params
  const manzana = await getManzanaDetalle(manzanaId)
  if (!manzana) notFound()

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <Link href="/inventario" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a inventario
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Manzana: {manzana.nombre}</h1>
        {manzana.descripcion && <p className="text-sm text-muted-foreground">{manzana.descripcion}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiBox label="Total lotes" value={String(manzana.totalLotes)} />
        <KpiBox label="Disponibles" value={String(manzana.lotesDisponibles)} accent="green" />
        <KpiBox label="Vendidos" value={String(manzana.lotesVendidos)} accent="red" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Lotes ({manzana.totalLotes})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden sm:table-cell">Sup. m²</TableHead>
                <TableHead className="hidden md:table-cell">$/m²</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manzana.lotes.map((l) => {
                const vendido = l.estatus === "VENDIDO" && l.venta !== null
                return (
                  <TableRow key={l.id} className={vendido ? "cursor-pointer hover:bg-muted/50" : ""}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {vendido && l.venta ? (
                        <Link href={`/ventas/${l.venta.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <MapPin className="h-3 w-3" />
                          {l.numLote}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {l.numLote}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{l.superficieM2}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatearMoneda(l.precioM2)}</TableCell>
                    <TableCell className="font-semibold">{formatearMoneda(l.totalPrecio)}</TableCell>
                    <TableCell><Badge variant={estatusColor[l.estatus]}>{l.estatus}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.venta?.clienteNombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {vendido && l.venta && (
                        <Link href={`/ventas/${l.venta.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          Ver venta <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {manzana.lotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Esta manzana no tiene lotes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  const color = accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : ""
  return (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </CardContent></Card>
  )
}
