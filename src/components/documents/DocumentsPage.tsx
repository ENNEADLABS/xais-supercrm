"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { FileUp, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput, EmptyState } from "@/components/crm";
import { FileIcon } from "@/components/crm/FileIcon";
import { useAllDocuments, useUploadDocument } from "@/lib/hooks/useDocuments";
import type { Document } from "@/types/database";

const PAGE_SIZE = 20;

/** Formate la taille d'un fichier en octets/Ko/Mo */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Label lisible pour le type d'entite */
function entityLabel(type: string): string {
  const map: Record<string, string> = {
    contact: "Contact",
    company: "Societe",
    deal: "Deal",
    quote: "Devis",
    invoice: "Facture",
  };
  return map[type] ?? type;
}

/**
 * Page principale /documents : liste paginee avec recherche et upload.
 */
export function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();

  const { data, isLoading } = useAllDocuments({
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        uploadMutation.mutate(formData);
      }
      e.target.value = "";
    },
    [uploadMutation],
  );

  return (
    <div className="space-y-4">
      {/* Barre de recherche + upload */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher un document..."
          />
        </div>
        <Button size="sm" onClick={() => fileInputRef.current?.click()}>
          <FileUp className="size-4" />
          Ajouter
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Uploader des fichiers"
        />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
      ) : documents.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun document" description="Aucun document trouve." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Taille</TableHead>
              <TableHead>Entite liee</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc: Document) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileIcon
                      mimeType={doc.mime_type}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-sm">{doc.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {doc.mime_type.split("/").pop()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatFileSize(doc.size_bytes)}
                </TableCell>
                <TableCell>
                  {doc.entity_type && doc.entity_id ? (
                    <Link
                      href={`/${doc.entity_type}s/${doc.entity_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {entityLabel(doc.entity_type)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Precedent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
