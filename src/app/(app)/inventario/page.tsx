import { listManzanas, listLotes } from "@/features/inventory/queries"
import { listClientes } from "@/features/clients/queries"
import { listVendedores } from "@/features/sales/vendor-queries"
import { requireUser } from "@/lib/rbac"
import { InventarioClient } from "./inventario-client"

export const dynamic = "force-dynamic"

export default async function InventarioPage() {
  const [manzanas, lotes, clientes, vendedores, user] = await Promise.all([
    listManzanas(),
    listLotes(),
    listClientes(),
    listVendedores(true),
    requireUser(),
  ])
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <InventarioClient
        manzanas={manzanas}
        lotes={lotes}
        clientes={clientes}
        vendedores={vendedores}
        userRole={user.role}
      />
    </div>
  )
}
