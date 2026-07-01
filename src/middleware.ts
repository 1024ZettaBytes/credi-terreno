import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  if (!req.auth) {
    const url = new URL("/login", req.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }
  const role = req.auth.user?.role

  // Sección exclusiva del rol SYSTEM (ni ADMIN puede entrar).
  if (pathname.startsWith("/desarrollador") && role !== "SYSTEM") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Secciones ADMIN (SYSTEM también puede, por ser superusuario).
  const adminPaths = ["/traspasos", "/recuperaciones", "/usuarios", "/reportes"]
  if (adminPaths.some((p) => pathname.startsWith(p)) && role !== "ADMIN" && role !== "SYSTEM") {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
