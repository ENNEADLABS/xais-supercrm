"use client";

import { useState } from "react";
import { toast } from "sonner";

type PdfEntityType = "quote" | "invoice";

/**
 * Hook pour telecharger un PDF de devis ou facture.
 * Gere le loading state et le telechargement via un lien temporaire.
 */
export function usePdfDownload() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function downloadPdf(entityType: PdfEntityType, entityId: string, filename?: string) {
    setIsGenerating(true);
    try {
      const url =
        entityType === "quote" ? `/api/quotes/${entityId}/pdf` : `/api/invoices/${entityId}/pdf`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur génération PDF");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename ?? `${entityType}-${entityId.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("PDF téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  }

  return { downloadPdf, isGenerating };
}
