import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/format";

interface QuoteLineSummaryProps {
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  discountPercent?: number;
}

/**
 * Résumé des totaux d'un devis : HT, TVA, remise et TTC.
 */
export function QuoteLineSummary({
  totalHt,
  totalTax,
  totalTtc,
  discountPercent,
}: QuoteLineSummaryProps) {
  return (
    <Card className="ml-auto w-full max-w-xs p-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total HT</span>
          <span className="font-medium">{formatCurrency(totalHt)}</span>
        </div>

        {discountPercent != null && discountPercent > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Remise ({(discountPercent / 100).toFixed(0)}%)</span>
            <span>-{formatCurrency(Math.round((totalHt * discountPercent) / 10000))}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">TVA</span>
          <span className="font-medium">{formatCurrency(totalTax)}</span>
        </div>

        <Separator />

        <div className="flex justify-between text-base font-semibold">
          <span>Total TTC</span>
          <span>{formatCurrency(totalTtc)}</span>
        </div>
      </div>
    </Card>
  );
}
