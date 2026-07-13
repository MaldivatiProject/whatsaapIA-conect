"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  Fingerprint,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Radio,
  Smartphone,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useConnectorSocket } from "@/shared/hooks/useConnectorSocket";
import { useActivityIngest } from "@/features/activity/hooks/useActivityIngest";

const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/sessions", label: "Sesiones", icon: Smartphone },
  { href: "/messages", label: "Mensajes", icon: MessagesSquare },
  { href: "/rules", label: "Reglas", icon: ListChecks },
  { href: "/identities", label: "Identidades", icon: Fingerprint },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/business-messages", label: "Resultados", icon: ClipboardCheck },
  { href: "/activity", label: "Actividad", icon: Radio },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 px-2 font-heading text-lg font-bold tracking-tight">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <MessageCircle className="h-4 w-4" />
      </span>
      Helpdesk
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);
  const { connected } = useConnectorSocket();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useActivityIngest();

  function handleLogout() {
    clear();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/30 p-4 sm:flex sm:flex-col sm:gap-6">
        <BrandMark />
        <NavLinks pathname={pathname} />
        <Button variant="outline" size="sm" onClick={handleLogout} className="justify-start gap-2">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </Button>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-64 flex-col gap-6 p-4 sm:hidden">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <BrandMark />
          </SheetHeader>
          <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
          <Button variant="outline" size="sm" onClick={handleLogout} className="justify-start gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir navegación"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <span className="font-heading text-sm font-bold tracking-tight">Helpdesk</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Eventos en vivo</span>
            <Badge variant={connected ? "success" : "destructive"}>
              {connected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
