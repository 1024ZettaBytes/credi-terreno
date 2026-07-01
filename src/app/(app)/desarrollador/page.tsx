import { requireSystem } from "@/lib/rbac"
import { listVentasParaAjuste } from "@/features/dev/queries"
import { DesarrolladorClient } from "./desarrollador-client"

export const dynamic = "force-dynamic"

export default async function DesarrolladorPage() {
  // Defensa en profundidad: además del middleware, bloquear server-side.
  await requireSystem()
  const ventas = await listVentasParaAjuste()
  return <DesarrolladorClient ventas={ventas} />
}
