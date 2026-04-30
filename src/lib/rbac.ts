import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { UserRole } from "@prisma/client"

export async function requireUser() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session.user
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) {
    redirect("/")
  }
  return user
}

export async function requireAdmin() {
  return requireRole(["ADMIN"])
}

export async function getOptionalUser() {
  const session = await auth()
  return session?.user ?? null
}
