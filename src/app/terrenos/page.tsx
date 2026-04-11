import { getTerrenos } from "@/app/actions/terrenos"
import { TerrenosClient } from "./terrenos-client"

export const dynamic = "force-dynamic"

export default async function TerrenosPage() {
  const terrenos = await getTerrenos()

  return <TerrenosClient terrenosIniciales={terrenos} />
}
