"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput, EmptyState } from "@/components/crm";
import { useQuotes } from "@/lib/hooks/useQuotes";
import { formatCurrency } from "@/lib/utils/format";
import { quoteStatusValues } from "@/lib/schemas/quote";
import type { QuoteStatus } from "@/types/database";

import { QuoteStatusBadge } from "./QuoteStatusBadge";

/** Labels français pour le filtre de statut */
const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  validated: "Validé",
  sent: "Envoyé",
  signed: "Signé",
  refused: "Refusé",
  cancelled: "Annulé",
  invoiced: "Facturé",
};

/**
 * Page de liste des devis avec recherche, filtre par statut et pagination.
 */
export function QuotesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "">("");
  const [page, setPage] = useState(1);

  const { data: quotes, isLoading } = useQuotes({
    query: search,
    status: statusFilter || undefined,
    page,
    per_page: 25,
  });

  // Extraire la liste et la pagination (format paginé possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour paginé
  const raw = quotes as any;
  const quoteList = Array.isArray(quotes) ? quotes : (raw?.data ?? []);
  const totalPages = raw?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Devis</h1>
        <Button render={<Link href="/quotes/new" />}>
          <Plus className="size-4" />
          Nouveau devis
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un devis..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as QuoteStatus | "");
            setPage(1);
          }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {quoteStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* État vide */}
      {!isLoading && quoteList.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aucun devis"
          description="Créez votre premier devis pour commencer."
          action={{ label: "Nouveau devis", href: "/quotes/new" }}
        />
      )}

      {/* Tableau */}
      {!isLoading && quoteList.length > 0 && <QuoteTable quotes={quoteList} />}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Sous-composant : tableau des devis
// ------------------------------------------------------------------

interface QuoteRow {
  id: string;
  reference: string | null;
  subject: string;
  total_ttc: number;
  status: QuoteStatus;
  created_at: string;
  // Relation Supabase possible
  companies?: { id: string; name: string } | null;
}

function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3">Titre</th>
            <th className="px-4 py-3">Société</th>
            <th className="px-4 py-3 text-right">Montant TTC</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-b hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link
                  href={`/quotes/${q.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {q.reference ?? "Brouillon"}
                </Link>
              </td>
              <td className="px-4 py-3">{q.subject}</td>
              <td className="px-4 py-3 text-muted-foreground">{q.companies?.name ?? "—"}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(q.total_ttc)}</td>
              <td className="px-4 py-3">
                <QuoteStatusBadge status={q.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(q.created_at).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
