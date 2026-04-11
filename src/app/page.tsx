import { Building } from "lucide-react"
import { getTerrenos } from "./actions/terrenos"
import { DashboardClient } from "./dashboard-client"
import type { TerrenoConCliente } from "@/types"

export default async function DashboardPage() {
  const terrenosData = await getTerrenos()
  
  // Transformar datos para cumplir con el tipo TerrenoConCliente
  const terrenos: TerrenoConCliente[] = terrenosData.map((t) => ({
    id: t.id,
    identificador: t.identificador,
    descripcion: t.descripcion,
    precioLista: t.precioLista,
    estado: t.estado,
    coordenadaX: t.coordenadaX,
    coordenadaY: t.coordenadaY,
    superficie: t.superficie,
    frente: t.frente,
    fondo: t.fondo,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    clienteActual: t.clienteActual ? {
      id: t.clienteActual.id,
      nombreCompleto: t.clienteActual.nombreCompleto,
      domicilio: t.clienteActual.domicilio,
      telefono: t.clienteActual.telefono,
      createdAt: t.clienteActual.createdAt.toISOString(),
      updatedAt: t.clienteActual.updatedAt.toISOString(),
    } : undefined,
    contratoActivo: t.contratoActivo ? {
      id: t.contratoActivo.id,
      clienteId: t.contratoActivo.clienteId,
      terrenoId: t.contratoActivo.terrenoId,
      precioVenta: t.contratoActivo.precioVenta,
      enganche: t.contratoActivo.enganche,
      diaPagoMensual: t.contratoActivo.diaPagoMensual,
      plazoMeses: t.contratoActivo.plazoMeses,
      montoMensualidad: t.contratoActivo.montoMensualidad,
      tasaMoraDiaria: t.contratoActivo.tasaMoraDiaria,
      estado: t.contratoActivo.estado,
      fechaInicio: t.contratoActivo.fechaInicio.toISOString(),
      createdAt: t.contratoActivo.createdAt.toISOString(),
      updatedAt: t.contratoActivo.updatedAt.toISOString(),
    } : undefined,
  }))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">CrediTerreno</h1>
                <p className="text-sm text-muted-foreground">
                  Sistema de Gestión de Créditos Inmobiliarios
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <a href="/terrenos" className="text-sm hover:text-primary">Terrenos</a>
              <a href="/clientes" className="text-sm hover:text-primary">Clientes</a>
              <a href="/contratos" className="text-sm hover:text-primary">Contratos</a>
              <a href="/pagos" className="text-sm hover:text-primary">Pagos</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <DashboardClient terrenos={terrenos} />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          © 2026 CrediTerreno - Sistema de Gestión de Créditos Inmobiliarios
        </div>
      </footer>
    </div>
  )
}
