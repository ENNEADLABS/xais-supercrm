import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/format";

interface InvoiceLineSummaryProps {
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  paidAmount: number;
}

/**
 * R\u00e9sum\u00e9 des totaux d'une facture : HT, TVA, TTC, pay\u00e9, reste \u00e0 payer.
 * Inclut une barre de progression du paiement.
 */
export function InvoiceLineSummary({
  totalHt,
  totalTax,
  totalTtc,
  paidAmount,
}: InvoiceLineSummaryProps) {
  const remaining = totalTtc - paidAmount;
  const paidPercent = totalTtc > 0 ? Math.min(100, Math.round((paidAmount / totalTtc) * 100)) : 0;

  return (
    <Card className="ml-auto w-full max-w-xs p-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total HT</span>
          <span className="font-medium">{formatCurrency(totalHt)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">TVA</span>
          <span className="font-medium">{formatCurrency(totalTax)}</span>
        </div>

        <Separator />

        <div className="flex justify-between text-base font-semibold">
          <span>Total TTC</span>
          <span>{formatCurrency(totalTtc)}</span>
        </div>

        <Separator />

        {/* Progression du paiement */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payé</span>
          <span className="font-medium text-emerald-600">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reste à payer</span>
          <span className="font-medium">{formatCurrency(remaining)}</span>
        </div>

        {/* Barre de progression */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${paidPercent}%` }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">{paidPercent}% payé</p>
      </div>
    </Card>
  );
}
