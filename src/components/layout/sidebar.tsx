"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Clapperboard,
  FileText,
  Receipt,
  Mail,
  FolderOpen,
  CheckSquare,
  Package,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { useSidebarStore } from "@/stores/sidebarStore";

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Societes", href: "/companies", icon: Building2 },
  { name: "Pipeline", href: "/pipeline", icon: Kanban },
  { name: "Studio", href: "/studio", icon: Clapperboard },
  { name: "Devis", href: "/quotes", icon: FileText },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Factures", href: "/invoices", icon: Receipt },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Documents", href: "/documents", icon: FolderOpen },
  { name: "Taches", href: "/tasks", icon: CheckSquare },
];

/** Contenu de la sidebar (partage entre desktop et mobile) */
function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/dashboard" className="text-lg font-bold text-sidebar-foreground">
          {collapsed ? "E" : "ENNEAD Studio Creator"}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href.split("?")[0]);
          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.name}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger render={<div />}>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      <div className="border-t p-2">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "justify-between")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Link
                  href="/settings"
                  className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Settings className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Parametres</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Settings className="size-4" />
              Parametres
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggle, closeMobile } = useSidebarStore();
  const pathname = usePathname();

  // Fermer le drawer mobile au changement de route
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Desktop : sidebar statique */}
      <aside
        className={cn(
          "hidden h-screen flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
        {/* Bouton toggle collapse */}
        <button
          onClick={toggle}
          className="flex items-center justify-center border-t py-2 text-muted-foreground hover:text-foreground"
          aria-label={isCollapsed ? "Ouvrir la sidebar" : "Replier la sidebar"}
        >
          {isCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </aside>

      {/* Mobile : Sheet drawer */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
        <SheetContent side="left" className="w-60 p-0">
          <div className="flex h-full flex-col bg-sidebar">
            <SidebarContent collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
