"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGlobalSearch } from "@/lib/hooks/useGlobalSearch";
import type { SearchResult } from "@/types/search";
import { Users, Building2, Kanban, FileText, Receipt, Package, Plus, Loader2 } from "lucide-react";

// Icone par type d'entite
const ICONS: Record<string, typeof Users> = {
  contact: Users,
  company: Building2,
  deal: Kanban,
  quote: FileText,
  invoice: Receipt,
  product: Package,
};

// Labels de groupe en francais
const GROUP_LABELS: Record<string, string> = {
  contacts: "Contacts",
  companies: "Societes",
  deals: "Deals",
  quotes: "Devis",
  invoices: "Factures",
  products: "Produits",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  // Raccourci Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounce 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useGlobalSearch(debouncedQuery);

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
      setOpen(false);
      setQuery("");
    },
    [router],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Recherche"
      description="Rechercher dans le CRM"
      shouldFilter={false}
    >
      <CommandInput placeholder="Rechercher partout..." value={query} onValueChange={setQuery} />
      <CommandList>
        {isLoading && (
          <div className="p-4 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <CommandEmpty>
          {query.length < 2 ? "Tapez au moins 2 caracteres..." : "Aucun resultat"}
        </CommandEmpty>

        {/* Actions rapides quand pas de recherche */}
        {!query && (
          <CommandGroup heading="Actions rapides">
            <CommandItem onSelect={() => navigate("/contacts/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau contact
            </CommandItem>
            <CommandItem onSelect={() => navigate("/companies/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle societe
            </CommandItem>
            <CommandItem onSelect={() => navigate("/deals/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau deal
            </CommandItem>
            <CommandItem onSelect={() => navigate("/quotes/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau devis
            </CommandItem>
          </CommandGroup>
        )}

        {/* Resultats dynamiques groupes par entite */}
        {results &&
          Object.entries(results).map(([key, items]) => {
            if (key === "total" || !Array.isArray(items) || items.length === 0) {
              return null;
            }
            const typedItems = items as SearchResult[];
            const Icon = ICONS[typedItems[0]?.type] ?? FileText;
            return (
              <CommandGroup key={key} heading={GROUP_LABELS[key] ?? key}>
                {typedItems.map((item) => (
                  <CommandItem key={item.id} onSelect={() => navigate(item.url)}>
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}
