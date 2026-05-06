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

/** Requires ADMIN or CAPTURA — blocks VISUALIZACION from write operations */
export async function requireCaptura() {
  return requireRole(["ADMIN", "CAPTURA"])
}

export async function getOptionalUser() {
  const session = await auth()
  return session?.user ?? null
}

/** Check if user can perform write actions (useful in client components) */
export function canWrite(role: UserRole): boolean {
  return role === "ADMIN" || role === "CAPTURA"
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN"
}
