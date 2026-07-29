"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAsset } from "@/lib/hooks/useContentAssets";
import { useDocuments } from "@/lib/hooks/useDocuments";
import { ASSET_ROLE_OPTIONS } from "@/lib/utils/contentLabels";
import type { AssetRole } from "@/types/database";
import { AssetSourceSelector, type AssetSource } from "./AssetSourceSelector";

interface AssetFormProps {
  contentPieceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Dialog d'ajout d'un asset a un contenu : lien externe OU document GED.
 */
export function AssetForm({ contentPieceId, open, onOpenChange }: AssetFormProps) {
  const createAsset = useCreateAsset();
  const { data: documents } = useDocuments("content_piece", contentPieceId);

  const [source, setSource] = useState<AssetSource>("external");
  const [role, setRole] = useState<AssetRole>("reference");
  const [externalUrl, setExternalUrl] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [isFinal, setIsFinal] = useState(false);

  function resetForm() {
    setSource("external");
    setRole("reference");
    setExternalUrl("");
    setDocumentId("");
    setVersionLabel("");
    setIsFinal(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createAsset.mutateAsync({
      content_piece_id: contentPieceId,
      role,
      version_label: versionLabel || null,
      is_final: isFinal,
      external_url: source === "external" ? externalUrl : null,
      document_id: source === "document" ? documentId : null,
    });
    resetForm();
    onOpenChange(false);
  }

  const canSubmit = source === "external" ? externalUrl.trim().length > 0 : documentId !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset-role">Rôle</Label>
            <select
              id="asset-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AssetRole)}
              className={selectClass}
            >
              {ASSET_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <AssetSourceSelector
            source={source}
            onSourceChange={setSource}
            externalUrl={externalUrl}
            onExternalUrlChange={setExternalUrl}
            documentId={documentId}
            onDocumentIdChange={setDocumentId}
            documents={documents ?? []}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset-version">Version</Label>
              <Input
                id="asset-version"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="V3, variante A…"
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input
                id="asset-final"
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="asset-final">Version finale</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit || createAsset.isPending}>
              {createAsset.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
