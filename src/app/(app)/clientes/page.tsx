import { listClientes } from "@/features/clients/queries"
import { ClientesClient } from "./clientes-client"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clientes = await listClientes()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <ClientesClient clientes={clientes} />
    </div>
  )
}
