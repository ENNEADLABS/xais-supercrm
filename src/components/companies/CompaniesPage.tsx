"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExportCsvButton, ImportCsvDialog } from "@/components/csv";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput, EntityStatusBadge, EmptyState } from "@/components/crm";
import { useCompanies } from "@/lib/hooks/useCompanies";
import type { EntityStatus } from "@/types/database";

/**
 * Page liste des societes avec recherche, filtres et pagination.
 */
export function CompaniesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EntityStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCompanies({ query, status, page, per_page: 25 });
  const companies = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      {/* En-tete */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Societes</h1>
          <p className="text-sm text-muted-foreground">
            {total} societe{total > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportCsvDialog entityType="company" />
          <ExportCsvButton entityType="company" />
          <Button render={<Link href="/companies/new" />}>
            <Plus className="mr-1.5 size-4" />
            Nouvelle societe
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <div className="w-72">
          <SearchInput value={query} onChange={setQuery} placeholder="Rechercher une societe..." />
        </div>
        <select
          value={status ?? "all"}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v === "all" ? undefined : (v as EntityStatus));
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="archived">Archive</option>
        </select>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune societe"
          description="Ajoutez votre premiere societe pour commencer."
          action={{ label: "Nouvelle societe", href: "/companies/new" }}
        />
      ) : (
        <>
          <CompaniesTable
            companies={companies}
            onRowClick={(id) => router.push(`/companies/${id}`)}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Precedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Sous-composant tableau (extrait pour rester sous 150 lignes) ---

import type { Company } from "@/types/database";

interface CompaniesTableProps {
  companies: Company[];
  onRowClick: (id: string) => void;
}

function CompaniesTable({ companies, onRowClick }: CompaniesTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Domaine</TableHead>
            <TableHead>Secteur</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow
              key={company.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(company.id)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell className="text-muted-foreground">{company.domain ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{company.industry ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{company.city ?? "—"}</TableCell>
              <TableCell>
                <EntityStatusBadge status={company.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
