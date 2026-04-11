import { getContratos } from "@/app/actions/contratos"
import { getClientes } from "@/app/actions/clientes"
import { getTerrenos } from "@/app/actions/terrenos"
import { ContratosClient } from "./contratos-client"

export default async function ContratosPage() {
  const [contratos, clientes, terrenos] = await Promise.all([
    getContratos(),
    getClientes(),
    getTerrenos(),
  ])

  const terrenosDisponibles = terrenos.filter((t) => t.estado === "DISPONIBLE")

  return (
    <ContratosClient
      contratosIniciales={contratos}
      clientes={clientes}
      terrenosDisponibles={terrenosDisponibles}
    />
  )
}
