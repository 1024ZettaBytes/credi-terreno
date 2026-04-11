import { getTerrenos } from "@/app/actions/terrenos"
import { TerrenosClient } from "./terrenos-client"

export default async function TerrenosPage() {
  const terrenos = await getTerrenos()

  return <TerrenosClient terrenosIniciales={terrenos} />
}
