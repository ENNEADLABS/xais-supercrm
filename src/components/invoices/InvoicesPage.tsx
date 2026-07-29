"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Plus, AlertTriangle, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput, EmptyState } from "@/components/crm";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils/format";
import { invoiceStatusValues } from "@/lib/schemas/invoice";
import type { InvoiceStatus } from "@/types/database";

import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

/** Labels fran\u00e7ais pour le filtre de statut */
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  validated: "Validée",
  sent: "Envoyée",
  paid: "Payée",
  partial: "Partielle",
  overdue: "En retard",
  cancelled: "Annulée",
};

/**
 * Page de liste des factures avec recherche, filtres et pagination.
 */
export function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: invoices, isLoading } = useInvoices({
    query: search,
    status: statusFilter || undefined,
    overdue: overdueOnly || undefined,
    page,
    per_page: 25,
  });

  // Extraire la liste et la pagination (format pagin\u00e9 possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour pagin\u00e9
  const raw = invoices as any;
  const invoiceList = Array.isArray(invoices) ? invoices : (raw?.data ?? []);
  const totalPages = raw?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* En-t\u00eate */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Factures</h1>
        <Button render={<Link href="/invoices/new" />}>
          <Plus className="size-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher une facture..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as InvoiceStatus | "");
            setPage(1);
          }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {invoiceStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(1);
            }}
            className="size-4 rounded border-input"
          />
          En retard uniquement
        </label>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* \u00c9tat vide */}
      {!isLoading && invoiceList.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aucune facture"
          description="Créez votre première facture pour commencer."
          action={{ label: "Nouvelle facture", href: "/invoices/new" }}
        />
      )}

      {/* Tableau */}
      {!isLoading && invoiceList.length > 0 && <InvoiceTable invoices={invoiceList} />}

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
// Sous-composant : tableau des factures
// ------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  reference: string | null;
  subject: string;
  total_ttc: number;
  paid_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  is_credit_note: boolean;
  created_at: string;
  // Relation Supabase possible
  companies?: { id: string; name: string } | null;
}

function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  /** V\u00e9rifie si la facture est en retard */
  function isOverdue(row: InvoiceRow): boolean {
    if (!row.due_date) return false;
    if (row.status === "paid" || row.status === "cancelled") return false;
    return new Date(row.due_date) < new Date();
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3">Objet</th>
            <th className="px-4 py-3">Société</th>
            <th className="px-4 py-3 text-right">Montant TTC</th>
            <th className="px-4 py-3 text-right">Payé</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Échéance</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const overdue = isOverdue(inv);
            return (
              <tr key={inv.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
                  >
                    {inv.is_credit_note && <CreditCard className="size-3.5 text-orange-500" />}
                    {inv.reference ?? "Brouillon"}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.subject}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {inv.companies?.name ?? "\u2014"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(inv.total_ttc)}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(inv.paid_amount)}</td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3">
                  {inv.due_date ? (
                    <span
                      className={
                        overdue
                          ? "inline-flex items-center gap-1 font-medium text-red-600"
                          : "text-muted-foreground"
                      }
                    >
                      {overdue && <AlertTriangle className="size-3.5" />}
                      {new Date(inv.due_date).toLocaleDateString("fr-FR")}
                    </span>
                  ) : (
                    "\u2014"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
