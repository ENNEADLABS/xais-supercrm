"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document } from "@/types/database";

export type AssetSource = "external" | "document";

interface AssetSourceSelectorProps {
  source: AssetSource;
  onSourceChange: (source: AssetSource) => void;
  externalUrl: string;
  onExternalUrlChange: (url: string) => void;
  documentId: string;
  onDocumentIdChange: (id: string) => void;
  documents: Document[];
}

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Selecteur de source d'un asset : bascule lien externe / document GED.
 */
export function AssetSourceSelector({
  source,
  onSourceChange,
  externalUrl,
  onExternalUrlChange,
  documentId,
  onDocumentIdChange,
  documents,
}: AssetSourceSelectorProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Source</Label>
        <div className="flex rounded-lg border p-0.5">
          <Button
            type="button"
            variant={source === "external" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => onSourceChange("external")}
          >
            Lien externe
          </Button>
          <Button
            type="button"
            variant={source === "document" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => onSourceChange("document")}
          >
            Document GED
          </Button>
        </div>
      </div>

      {source === "external" ? (
        <div className="space-y-2">
          <Label htmlFor="asset-url">URL (Loom, Cap, Figma, Drive…)</Label>
          <Input
            id="asset-url"
            type="url"
            value={externalUrl}
            onChange={(e) => onExternalUrlChange(e.target.value)}
            placeholder="https://..."
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="asset-doc">Document attaché au contenu</Label>
          <select
            id="asset-doc"
            value={documentId}
            onChange={(e) => onDocumentIdChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Sélectionner un document</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Les documents se téléversent dans l&apos;onglet Documents du contenu.
          </p>
        </div>
      )}
    </>
  );
}
