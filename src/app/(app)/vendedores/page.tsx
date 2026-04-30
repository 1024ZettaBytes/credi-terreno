import { listVendedores } from "@/features/sales/vendor-queries"
import { VendedoresClient } from "./vendedores-client"

export const dynamic = "force-dynamic"

export default async function VendedoresPage() {
  const vendedores = await listVendedores()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <VendedoresClient vendedores={vendedores} />
    </div>
  )
}
