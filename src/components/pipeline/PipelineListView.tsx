"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/crm/SearchInput";
import { useDeals } from "@/lib/hooks/useDeals";
import { usePipelineStages } from "@/lib/hooks/useTenantConfig";
import { formatCurrency } from "@/lib/utils/format";
import type { PipelineStage } from "@/types/database";

/**
 * Vue liste alternative du pipeline sous forme de tableau.
 */
export function PipelineListView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useDeals({ query: search, page, per_page: 25 });
  const { data: stages } = usePipelineStages();

  // Map stage id -> stage pour affichage rapide
  const stageMap = new Map<string, PipelineStage>();
  stages?.forEach((s) => stageMap.set(s.id, s));

  // Le hook retourne potentiellement un objet pagine ou un tableau
  const deals = Array.isArray(data)
    ? data
    : ((data as { data: typeof data } | undefined)?.data ?? []);

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un deal..." />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Probabilité</TableHead>
              <TableHead>Date closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              deals as {
                id: string;
                name: string;
                stage: string;
                amount: number | null;
                probability: number | null;
                expected_close_date: string | null;
              }[]
            ).map((deal) => {
              const stage = stageMap.get(deal.stage);
              return (
                <TableRow key={deal.id}>
                  <TableCell>
                    <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                      {deal.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {stage ? (
                      <Badge style={{ backgroundColor: stage.color, color: "#fff" }}>
                        {stage.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{deal.stage}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(deal.amount)}</TableCell>
                  <TableCell className="text-right">
                    {deal.probability != null ? `${deal.probability}%` : "—"}
                  </TableCell>
                  <TableCell>
                    {deal.expected_close_date
                      ? new Date(deal.expected_close_date).toLocaleDateString("fr-FR")
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination simple */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Précédent
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
          Suivant
        </Button>
      </div>
    </div>
  );
}
