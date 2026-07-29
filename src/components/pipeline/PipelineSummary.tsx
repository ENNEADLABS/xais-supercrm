import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { Deal } from "@/types/database";

interface PipelineSummaryProps {
  deals: Deal[];
}

/**
 * Barre de synthese du pipeline : nombre de deals, montant total, montant pondere.
 */
export function PipelineSummary({ deals }: PipelineSummaryProps) {
  // Filtrer uniquement les deals ouverts
  const openDeals = deals.filter((d) => d.deal_status === "open");

  const totalAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const totalWeighted = openDeals.reduce((sum, d) => sum + (d.weighted_amount ?? 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground">Deals ouverts</p>
          <p className="text-2xl font-bold">{openDeals.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground">Montant total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground">Montant pondéré</p>
          <p className="text-2xl font-bold">{formatCurrency(totalWeighted)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
