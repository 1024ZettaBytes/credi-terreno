import { NextResponse } from "next/server"
import { signOut } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reason = url.searchParams.get("reason") ?? "session_expired"
  await signOut({ redirect: false })
  return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url))
}
