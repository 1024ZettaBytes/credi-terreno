"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock, AlertTriangle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatearMoneda, formatearFecha } from "@/lib/money"

type Color = "VERDE" | "AMARILLO" | "ROJO"

export interface CobranzaRow {
  id: string
  cliente: string
  manzana: string
  numLote: string
  loteEtiqueta: string
  semaforo: Color
  diasAtraso: number
  proximaFechaPago: string
  totalDeuda: string
}

const natural = new Intl.Collator("es", { numeric: true })

const COLORES: Color[] = ["VERDE", "AMARILLO", "ROJO"]

export function CobranzaPanel({
  rows,
  stats,
}: {
  rows: CobranzaRow[]
  stats: Record<Color, number>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // La selección vive en la URL (?semaforo=VERDE,AMARILLO).
  // Sin el parámetro = todas seleccionadas (default). Parámetro presente = ese
  // subconjunto exacto (incluso vacío, que no muestra ninguna).
  const raw = searchParams.get("semaforo")
  const seleccion: Set<Color> =
    raw === null
      ? new Set(COLORES)
      : new Set(raw.split(",").filter((c): c is Color => (COLORES as string[]).includes(c)))

  const aplicar = (next: Set<Color>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.size === COLORES.length) params.delete("semaforo") // todas = URL limpia
    else params.set("semaforo", COLORES.filter((c) => next.has(c)).join(","))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const toggle = (color: Color) => {
    const next = new Set(seleccion)
    if (next.has(color)) next.delete(color)
    else next.add(color)
    aplicar(next)
  }

  // El filtro está "activo" cuando no están las tres seleccionadas.
  const filtroActivo = seleccion.size !== COLORES.length
  const filtradas = filtroActivo ? rows.filter((r) => seleccion.has(r.semaforo)) : rows
  const ordenadas = filtradas.slice().sort((a, b) => {
    const m = natural.compare(a.manzana.trim(), b.manzana.trim())
    if (m !== 0) return m
    return natural.compare(a.numLote.trim(), b.numLote.trim())
  })

  return (
    <>
      {/* Tarjetas de semáforo (clic para filtrar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {COLORES.map((color) => (
          <SemaforoCard
            key={color}
            color={color}
            count={stats[color]}
            activo={seleccion.has(color)}
            atenuado={filtroActivo && !seleccion.has(color)}
            onClick={() => toggle(color)}
          />
        ))}
      </div>

      {/* Lista de cobranza */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Semáforo de Cobranza</CardTitle>
              <p className="text-xs text-muted-foreground">
                Verde: al corriente · Amarillo: vencimiento próximo o 1 mensualidad vencida · Rojo: 2+ mensualidades vencidas
              </p>
            </div>
            {filtroActivo && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Mostrando {ordenadas.length} de {rows.length}
                </span>
                <button
                  onClick={() => aplicar(new Set(COLORES))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 border rounded-md px-2 py-1"
                >
                  <X className="h-3 w-3" /> Limpiar filtro
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay ventas activas todavía.
            </p>
          ) : ordenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ninguna venta coincide con el filtro seleccionado.
            </p>
          ) : (
            <div className="space-y-4">
              {agruparPorManzana(ordenadas).map(({ manzana, filas }) => (
                <div key={manzana} className="space-y-2">
                  <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-slate-100/95 backdrop-blur px-2 py-1 rounded-md border border-slate-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {manzana}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({filas.length} {filas.length === 1 ? "lote" : "lotes"})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filas.map((r) => (
                      <Link
                        key={r.id}
                        href={`/ventas/${r.id}`}
                        className="block border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <SemaforoDot color={r.semaforo} />
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {r.cliente} — {r.loteEtiqueta}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {r.diasAtraso > 0
                                  ? `${r.diasAtraso} día(s) de atraso`
                                  : `Próximo vencimiento: ${formatearFecha(r.proximaFechaPago)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Adeudo</p>
                              <p className="font-semibold">{formatearMoneda(r.totalDeuda)}</p>
                            </div>
                            <Badge variant={badgeVariant(r.semaforo)}>{labelSemaforo(r.semaforo)}</Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function SemaforoCard({
  color,
  count,
  activo,
  atenuado,
  onClick,
}: {
  color: Color
  count: number
  activo: boolean
  atenuado: boolean
  onClick: () => void
}) {
  const cfg = {
    VERDE: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-500", icon: CheckCircle2, label: "Al corriente" },
    AMARILLO: { bg: "bg-yellow-50", text: "text-yellow-700", ring: "ring-yellow-500", icon: Clock, label: "Por vencer / 1 vencida" },
    ROJO: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-500", icon: AlertTriangle, label: "En mora" },
  }[color]
  const Icon = cfg.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`text-left rounded-xl border transition-all cursor-pointer ${cfg.bg} ${
        activo ? `ring-2 ${cfg.ring} border-transparent` : "hover:ring-1 hover:ring-slate-300"
      } ${atenuado ? "opacity-50" : ""}`}
    >
      <div className="p-4 flex items-center gap-4">
        <Icon className={`h-10 w-10 ${cfg.text}`} />
        <div>
          <p className={`text-3xl font-bold ${cfg.text}`}>{count}</p>
          <p className={`text-sm ${cfg.text}`}>{cfg.label}</p>
        </div>
      </div>
    </button>
  )
}

function SemaforoDot({ color }: { color: Color }) {
  const cls = {
    VERDE: "bg-green-500",
    AMARILLO: "bg-yellow-500",
    ROJO: "bg-red-500",
  }[color]
  return <span className={`inline-block w-3 h-3 rounded-full ${cls} flex-shrink-0`} />
}

function labelSemaforo(c: Color): string {
  return c === "VERDE" ? "Al día" : c === "AMARILLO" ? "Atención" : "En mora"
}
function badgeVariant(c: Color): "success" | "warning" | "destructive" {
  return c === "VERDE" ? "success" : c === "AMARILLO" ? "warning" : "destructive"
}

function agruparPorManzana(rows: CobranzaRow[]): { manzana: string; filas: CobranzaRow[] }[] {
  const grupos: { manzana: string; filas: CobranzaRow[] }[] = []
  for (const r of rows) {
    const clave = r.manzana.trim() || "SIN MANZANA"
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.manzana === clave) ultimo.filas.push(r)
    else grupos.push({ manzana: clave, filas: [r] })
  }
  return grupos
}
