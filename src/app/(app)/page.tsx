import { listVentasConSemaforo } from "@/features/sales/queries"
import { listManzanas, listLotes } from "@/features/inventory/queries"
import { listClientes } from "@/features/clients/queries"
import { listVendedores } from "@/features/sales/vendor-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatearMoneda } from "@/lib/money"
import { Layers, Users, FileText, AlertTriangle, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react"
import Link from "next/link"
import { CobranzaPanel, type CobranzaRow } from "./cobranza-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [ventasSemaforo, manzanas, lotes, clientes, vendedores] = await Promise.all([
    listVentasConSemaforo(),
    listManzanas(),
    listLotes(),
    listClientes(),
    listVendedores(true),
  ])

  const lotesPorEstatus = {
    DISPONIBLE: lotes.filter((l) => l.estatus === "DISPONIBLE").length,
    VENDIDO: lotes.filter((l) => l.estatus === "VENDIDO").length,
    RECUPERADO: lotes.filter((l) => l.estatus === "RECUPERADO").length,
    TRASPASADO: lotes.filter((l) => l.estatus === "TRASPASADO").length,
  }

  const semaforoStats = {
    VERDE: ventasSemaforo.filter((v) => v.semaforo === "VERDE").length,
    AMARILLO: ventasSemaforo.filter((v) => v.semaforo === "AMARILLO").length,
    ROJO: ventasSemaforo.filter((v) => v.semaforo === "ROJO").length,
  }

  const totalAdeudo = ventasSemaforo.reduce(
    (sum, v) => sum + Number(v.estado.totalDeuda),
    0,
  )

  // Serializar para el panel cliente (Decimal/Date no cruzan el límite servidor→cliente).
  const cobranzaRows: CobranzaRow[] = ventasSemaforo.map(({ venta, estado, semaforo }) => ({
    id: venta.id,
    cliente: venta.cliente?.nombre ?? "",
    loteEtiqueta: `${venta.lote?.manzana?.nombre ?? ""}-${venta.lote?.numLote ?? ""}`,
    semaforo,
    diasAtraso: estado.diasAtraso,
    proximaFechaPago: estado.proximaFechaPago.toISOString(),
    totalDeuda: estado.totalDeuda.toString(),
  }))

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
            {/* Tips — solo si hay datos faltantes */}
      <OnboardingTips
        hasManzanas={manzanas.length > 0}
        hasLotes={lotes.length > 0}
        hasClientes={clientes.length > 0}
        hasVendedores={vendedores.length > 0}
        hasVentas={ventasSemaforo.length > 0}
      />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo y semáforo de cobranza</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard icon={Layers} label="Lotes" value={lotes.length} sub={`${lotesPorEstatus.DISPONIBLE} disponibles`} />
        <KpiCard icon={Users} label="Clientes" value={clientes.length} />
        <KpiCard icon={FileText} label="Ventas activas" value={ventasSemaforo.length} />
        <KpiCard icon={AlertTriangle} label="Adeudo total" value={formatearMoneda(totalAdeudo)} accent="red" />
      </div>



      {/* Semáforo de cobranza con filtro por colores */}
      <CobranzaPanel rows={cobranzaRows} stats={semaforoStats} />
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  accent?: "red"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl md:text-2xl font-bold ${accent === "red" ? "text-red-600" : ""}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="h-8 w-8 text-slate-300" />
        </div>
      </CardContent>
    </Card>
  )
}

function OnboardingTips({
  hasManzanas,
  hasLotes,
  hasClientes,
  hasVendedores,
  hasVentas,
}: {
  hasManzanas: boolean
  hasLotes: boolean
  hasClientes: boolean
  hasVendedores: boolean
  hasVentas: boolean
}) {
  const tips: { text: string; href: string; done: boolean }[] = [
    { text: "Crea tu primera manzana en Inventario", href: "/inventario", done: hasManzanas },
    { text: "Agrega lotes a tus manzanas", href: "/inventario", done: hasLotes },
    { text: "Registra al menos un cliente", href: "/clientes", done: hasClientes },
    { text: "Agrega un vendedor (opcional)", href: "/vendedores", done: hasVendedores },
    { text: "Realiza tu primera venta", href: "/inventario", done: hasVentas },
  ]

  const pending = tips.filter((t) => !t.done)
  if (pending.length === 0) return null

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-blue-800">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          Primeros pasos
        </CardTitle>
        <p className="text-xs text-blue-600/80">
          Completa estos pasos para configurar tu sistema
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip) => (
            <li key={tip.text} className="flex items-center gap-3">
              {tip.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-blue-300 shrink-0" />
              )}
              <Link
                href={tip.href}
                className={`text-sm flex-1 ${tip.done ? "text-muted-foreground line-through" : "text-blue-800 hover:underline"}`}
              >
                {tip.text}
              </Link>
              {!tip.done && <ArrowRight className="h-3.5 w-3.5 text-blue-400" />}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
