"use client";

import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConvertQuoteToInvoice } from "@/lib/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils/format";

interface InvoiceFromQuoteDialogProps {
  quoteId: string;
  quoteName: string;
  totalTtc: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog de confirmation pour convertir un devis sign\u00e9 en facture.
 */
export function InvoiceFromQuoteDialog({
  quoteId,
  quoteName,
  totalTtc,
  open,
  onOpenChange,
}: InvoiceFromQuoteDialogProps) {
  const router = useRouter();
  const convertMutation = useConvertQuoteToInvoice();

  async function handleConvert() {
    const result = await convertMutation.mutateAsync(quoteId);
    onOpenChange(false);
    // Rediriger vers la facture cr\u00e9\u00e9e
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour variable
    const invoiceId = (result as any)?.id;
    router.push(invoiceId ? `/invoices/${invoiceId}` : "/invoices");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir en facture</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Vous allez créer une facture à partir de ce devis. Les lignes seront copiées
            automatiquement et le devis sera marqué comme &laquo; Facturé &raquo;.
          </p>

          <div className="rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="size-4" />
              {quoteName}
            </div>
            <p className="mt-1 text-muted-foreground">Montant TTC : {formatCurrency(totalTtc)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConvert} disabled={convertMutation.isPending}>
            {convertMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
