import { requireUser } from "@/lib/rbac"
import { Navigation, Footer } from "@/components/layout/navigation"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <>
      <Navigation userRole={user.role} userName={user.name} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
