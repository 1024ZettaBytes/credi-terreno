"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo-icon";
import type { UserRole } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Layers },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ventas", label: "Ventas", icon: FileText },
  { href: "/pagos", label: "Pagos", icon: DollarSign },
  { href: "/vendedores", label: "Vendedores", icon: UserCog },
  {
    href: "/traspasos",
    label: "Traspasos",
    icon: ArrowRightLeft,
    adminOnly: true,
  },
  {
    href: "/recuperaciones",
    label: "Recuperaciones",
    icon: RotateCcw,
    adminOnly: true,
  },
  { href: "/reportes", label: "Reportes", icon: BarChart3, adminOnly: true },
];

const roleLabel: Record<UserRole, string> = {
  ADMIN: "Admin",
  CAPTURA: "Captura",
  VISUALIZACION: "Solo lectura",
};

interface NavigationProps {
  userRole?: UserRole;
  userName?: string | null;
}

/* ─── Desktop Sidebar ─── */
export function Sidebar({ userRole = "CAPTURA", userName }: NavigationProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (i) => !i.adminOnly || userRole === "ADMIN",
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center rounded-lg">
          <LogoIcon className="h-10 w-10" size={100} />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">Credi-Terreno</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Gestión de Créditos
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-4 py-3">
        {userName && (
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {userName} · {roleLabel[userRole]}
          </p>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

/* ─── Mobile Top Bar ─── */
export function MobileHeader({ userRole = "CAPTURA", userName }: NavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const visibleItems = navItems.filter(
    (i) => !i.adminOnly || userRole === "ADMIN",
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg text-primary-foreground">
            <LogoIcon className="h-10 w-10" />
          </div>
          <span className="font-bold text-sm">Credi-Terreno</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {isMenuOpen && (
        <nav className="pb-4 border-t border-slate-200 pt-3 px-3">
          <div className="flex flex-col gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
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
              );
            })}
            <div className="border-t border-slate-200 my-2 cursor-pointer">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </div>
          </div>
          {userName && (
            <p className="mt-3 px-4 text-xs text-muted-foreground">
              {userName} · {roleLabel[userRole]}
            </p>
          )}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Credi-Terreno · Sistema de Gestión de
        Créditos Inmobiliarios
      </div>
    </footer>
  );
}
