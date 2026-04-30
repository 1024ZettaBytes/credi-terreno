"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import {
  Building,
  Layers,
  Users,
  FileText,
  DollarSign,
  Menu,
  X,
  LayoutDashboard,
  UserCog,
  ArrowRightLeft,
  RotateCcw,
  BarChart3,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Layers },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ventas", label: "Ventas", icon: FileText },
  { href: "/pagos", label: "Pagos", icon: DollarSign },
  { href: "/vendedores", label: "Vendedores", icon: UserCog, adminOnly: true },
  { href: "/traspasos", label: "Traspasos", icon: ArrowRightLeft, adminOnly: true },
  { href: "/recuperaciones", label: "Recuperaciones", icon: RotateCcw, adminOnly: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3, adminOnly: true },
]

interface NavigationProps {
  userRole?: "ADMIN" | "USER"
  userName?: string | null
}

export function Navigation({ userRole = "USER", userName }: NavigationProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const visibleItems = navItems.filter((i) => !i.adminOnly || userRole === "ADMIN")

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Building className="h-6 w-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold leading-tight">CrediTerreno</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Gestión de Créditos
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {userName && (
              <span className="hidden md:inline text-xs text-muted-foreground">
                {userName} · {userRole}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Salir"
              className="hidden md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="lg:hidden pb-4 border-t border-slate-200 pt-4">
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CrediTerreno · Sistema de Gestión de Créditos Inmobiliarios
      </div>
    </footer>
  )
}
