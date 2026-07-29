"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Search, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSidebarStore } from "@/stores/sidebarStore";

interface HeaderProps {
  userEmail?: string;
  userName?: string;
}

export function Header({ userEmail, userName }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const openMobile = useSidebarStore((s) => s.openMobile);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = userName || userEmail || "Utilisateur";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {/* Hamburger mobile */}
        <button
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          onClick={openMobile}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Bouton de recherche globale */}
        <button
          type="button"
          onClick={() =>
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }
          className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="pointer-events-none hidden rounded border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-foreground hover:bg-accent"
        >
          <User className="size-4" />
          <span className="hidden sm:inline">{displayName}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-md border bg-popover py-1 shadow-lg">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
            >
              <LogOut className="size-4" />
              Se deconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
