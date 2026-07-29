"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput, EntityStatusBadge, EmptyState } from "@/components/crm";
import { useContacts } from "@/lib/hooks/useContacts";
import type { EntityStatus } from "@/types/database";

import { ContactsFilters } from "./ContactsFilters";
import { ContactsPagination } from "./ContactsPagination";

/**
 * Page liste des contacts avec recherche, filtres et pagination.
 */
export function ContactsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EntityStatus | undefined>(undefined);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useContacts({
    query,
    status,
    tag_ids: tagIds.length > 0 ? tagIds : undefined,
    page,
    per_page: perPage,
  });

  const contacts = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  // Réinitialiser la page quand les filtres changent
  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: EntityStatus | undefined) {
    setStatus(value);
    setPage(1);
  }

  function handleTagsChange(ids: string[]) {
    setTagIds(ids);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ImportCsvDialog entityType="contact" />
          <ExportCsvButton entityType="contact" />
          <Button render={<Link href="/contacts/new" />}>
            <Plus className="size-4" />
            Nouveau contact
          </Button>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-72">
          <SearchInput
            value={query}
            onChange={handleQueryChange}
            placeholder="Rechercher un contact..."
          />
        </div>
        <ContactsFilters
          status={status}
          onStatusChange={handleStatusChange}
          selectedTagIds={tagIds}
          onTagsChange={handleTagsChange}
        />
      </div>

      {/* Tableau ou état vide */}
      {isLoading ? (
        <ContactsTableSkeleton />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun contact"
          description="Créez votre premier contact pour commencer à suivre vos relations."
          action={{ label: "Nouveau contact", href: "/contacts/new" }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                  <TableHead className="hidden lg:table-cell">Poste</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={contact.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {contact.first_name[0]}
                            {contact.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.email ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {contact.phone ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {contact.job_title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EntityStatusBadge status={contact.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ContactsPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

/** Squelette de chargement pour le tableau */
function ContactsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
