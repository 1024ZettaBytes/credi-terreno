import { getPagos } from "@/app/actions/pagos"
import { getContratos } from "@/app/actions/contratos"
import { PagosClient } from "./pagos-client"

export default async function PagosPage() {
  const [pagos, contratos] = await Promise.all([
    getPagos(),
    getContratos(),
  ])

  const contratosActivos = contratos.filter(
    (c) => c.estado === "ACTIVO" || c.estado === "EN_MORA"
  )

  return <PagosClient pagosIniciales={pagos} contratosActivos={contratosActivos} />
}
