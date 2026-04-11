import { getClientes } from "@/app/actions/clientes"
import { ClientesClient } from "./clientes-client"

export default async function ClientesPage() {
  const clientes = await getClientes()

  return <ClientesClient clientesIniciales={clientes} />
}
