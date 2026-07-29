"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DocumentPreviewModalProps {
  url: string | null;
  mimeType: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modale d'apercu d'un document (image, PDF ou fallback).
 */
export function DocumentPreviewModal({
  url,
  mimeType,
  name,
  open,
  onOpenChange,
}: DocumentPreviewModalProps) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{name}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 min-h-[300px]">
          {!url ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Chargement...</p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- Apercu document, pas de optimisation Next necessaire
            <img src={url} alt={name} className="mx-auto max-h-[60vh] rounded object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={name} className="h-[60vh] w-full rounded border" />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Apercu non disponible pour ce type de fichier.
              </p>
            </div>
          )}
        </div>

        {url && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
              <Download className="size-4" />
              Telecharger
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
