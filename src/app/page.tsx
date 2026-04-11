import { getTerrenos } from "./actions/terrenos"
import { DashboardClient } from "./dashboard-client"
import type { TerrenoConCliente } from "@/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const terrenosData = await getTerrenos()
  
  // Los datos ya vienen serializados desde el Server Action
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
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    clienteActual: t.clienteActual ? {
      id: t.clienteActual.id,
      nombreCompleto: t.clienteActual.nombreCompleto,
      domicilio: t.clienteActual.domicilio,
      telefono: t.clienteActual.telefono,
      createdAt: t.clienteActual.createdAt,
      updatedAt: t.clienteActual.updatedAt,
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
      fechaInicio: t.contratoActivo.fechaInicio,
      createdAt: t.contratoActivo.createdAt,
      updatedAt: t.contratoActivo.updatedAt,
    } : undefined,
  }))

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <DashboardClient terrenos={terrenos} />
    </div>
  )
}
