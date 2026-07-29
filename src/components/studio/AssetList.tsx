"use client";

import { useState } from "react";
import { Plus, ExternalLink, FileText, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContentAssets, useDeleteAsset } from "@/lib/hooks/useContentAssets";
import { useDocuments } from "@/lib/hooks/useDocuments";
import { ASSET_ROLE_LABELS } from "@/lib/utils/contentLabels";
import { AssetForm } from "./AssetForm";

interface AssetListProps {
  contentPieceId: string;
}

/**
 * Liste des assets d'un contenu (liens externes + documents GED).
 */
export function AssetList({ contentPieceId }: AssetListProps) {
  const { data: assets, isLoading } = useContentAssets(contentPieceId);
  const { data: documents } = useDocuments("content_piece", contentPieceId);
  const deleteAsset = useDeleteAsset();
  const [formOpen, setFormOpen] = useState(false);

  const docNames = new Map((documents ?? []).map((d) => [d.id, d.name]));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Ajouter un asset
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (assets ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun asset</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {(assets ?? []).map((asset) => (
            <li key={asset.id} className="flex items-center gap-3 px-4 py-3">
              {asset.external_url ? (
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {asset.external_url ? (
                    <a
                      href={asset.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {asset.external_url}
                    </a>
                  ) : (
                    <span className="truncate text-sm font-medium">
                      {asset.document_id
                        ? (docNames.get(asset.document_id) ?? "Document")
                        : "Document"}
                    </span>
                  )}
                  {asset.is_final && (
                    <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {ASSET_ROLE_LABELS[asset.role]}
                  </Badge>
                  {asset.version_label && <span>{asset.version_label}</span>}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteAsset.mutate({ assetId: asset.id, contentPieceId })}
                aria-label="Supprimer l'asset"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AssetForm contentPieceId={contentPieceId} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
