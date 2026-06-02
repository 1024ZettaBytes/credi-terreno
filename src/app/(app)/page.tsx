import { listVentasConSemaforo } from "@/features/sales/queries"
import { listManzanas, listLotes } from "@/features/inventory/queries"
import { listClientes } from "@/features/clients/queries"
import { listVendedores } from "@/features/sales/vendor-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatearMoneda, formatearFecha } from "@/lib/money"
import { Layers, Users, FileText, AlertTriangle, CheckCircle2, Clock, Lightbulb, ArrowRight } from "lucide-react"
import Link from "next/link"

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



      {/* Semáforo cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <SemaforoCard color="VERDE" count={semaforoStats.VERDE} />
        <SemaforoCard color="AMARILLO" count={semaforoStats.AMARILLO} />
        <SemaforoCard color="ROJO" count={semaforoStats.ROJO} />
      </div>

      {/* Lista de cobranza */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Semáforo de Cobranza</CardTitle>
          <p className="text-xs text-muted-foreground">
            Verde: al corriente · Amarillo: vencimiento próximo o 1 mensualidad vencida · Rojo: 2+ mensualidades vencidas
          </p>
        </CardHeader>
        <CardContent>
          {ventasSemaforo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay ventas activas todavía.
            </p>
          ) : (
            <div className="space-y-2">
              {ventasSemaforo
                .slice()
                .sort((a, b) => semaforoOrden(b.semaforo) - semaforoOrden(a.semaforo))
                .map(({ venta, estado, semaforo }) => (
                  <Link
                    key={venta.id}
                    href={`/ventas/${venta.id}`}
                    className="block border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <SemaforoDot color={semaforo} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {venta.cliente?.nombre} — {venta.lote?.manzana?.nombre}-{venta.lote?.numLote}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {estado.diasAtraso > 0
                              ? `${estado.diasAtraso} día(s) de atraso`
                              : `Próximo vencimiento: ${formatearFecha(estado.proximaFechaPago.toISOString())}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Adeudo</p>
                          <p className="font-semibold">{formatearMoneda(estado.totalDeuda)}</p>
                        </div>
                        <Badge variant={badgeVariant(semaforo)}>{labelSemaforo(semaforo)}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
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

function SemaforoCard({ color, count }: { color: "VERDE" | "AMARILLO" | "ROJO"; count: number }) {
  const cfg = {
    VERDE: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2, label: "Al corriente" },
    AMARILLO: { bg: "bg-yellow-50", text: "text-yellow-700", icon: Clock, label: "Por vencer / 1 vencida" },
    ROJO: { bg: "bg-red-50", text: "text-red-700", icon: AlertTriangle, label: "En mora" },
  }[color]
  const Icon = cfg.icon
  return (
    <Card className={cfg.bg}>
      <CardContent className="p-4 flex items-center gap-4">
        <Icon className={`h-10 w-10 ${cfg.text}`} />
        <div>
          <p className={`text-3xl font-bold ${cfg.text}`}>{count}</p>
          <p className={`text-sm ${cfg.text}`}>{cfg.label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SemaforoDot({ color }: { color: "VERDE" | "AMARILLO" | "ROJO" }) {
  const cls = {
    VERDE: "bg-green-500",
    AMARILLO: "bg-yellow-500",
    ROJO: "bg-red-500",
  }[color]
  return <span className={`inline-block w-3 h-3 rounded-full ${cls} flex-shrink-0`} />
}

function semaforoOrden(c: "VERDE" | "AMARILLO" | "ROJO"): number {
  return c === "ROJO" ? 3 : c === "AMARILLO" ? 2 : 1
}
function labelSemaforo(c: "VERDE" | "AMARILLO" | "ROJO"): string {
  return c === "VERDE" ? "Al día" : c === "AMARILLO" ? "Atención" : "En mora"
}
function badgeVariant(
  c: "VERDE" | "AMARILLO" | "ROJO",
): "success" | "warning" | "destructive" {
  return c === "VERDE" ? "success" : c === "AMARILLO" ? "warning" : "destructive"
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
