import { redirect } from "next/navigation"
import { requireUser } from "@/lib/rbac"
import { Navigation, Footer } from "@/components/layout/navigation"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  // Guard: session token may reference a user deleted after a DB reset/seed.
  // Server components can't modify cookies, so we redirect to a route handler
  // that clears the session and bounces to /login.
  const exists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })
  if (!exists) {
    redirect("/api/auth/force-logout?reason=session_expired")
  }

  return (
    <>
      <Navigation userRole={user.role} userName={user.name} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
