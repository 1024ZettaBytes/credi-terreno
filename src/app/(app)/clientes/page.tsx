import { listClientes } from "@/features/clients/queries"
import { requireUser } from "@/lib/rbac"
import { ClientesClient } from "./clientes-client"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const [clientes, user] = await Promise.all([listClientes(), requireUser()])
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <ClientesClient clientes={clientes} userRole={user.role} />
    </div>
  )
}
