import { Users, Kanban, FileText, TrendingUp, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { computeVariation } from "@/lib/services/dashboard/dateHelpers";
import type { Trends } from "@/lib/services/dashboard/trendQueries";

interface KpiCardsProps {
  totalContacts: number;
  totalCompanies: number;
  openDeals: number;
  openDealsWeighted: number;
  pendingQuotes: number;
  pendingQuotesAmount: number;
  monthlyRevenue: number;
  monthlyRevenueLastMonth: number;
  totalReceivable?: number;
  unpaidInvoices?: number;
  trends?: Trends;
}

/** Formate une variation en texte + classe CSS */
function formatTrend(current: number, previous: number): { text: string; className: string } {
  const pct = computeVariation(current, previous);
  if (previous === 0 && current === 0) return { text: "—", className: "text-muted-foreground" };
  if (pct > 0) return { text: `+${pct}%`, className: "text-green-600" };
  if (pct < 0) return { text: `${pct}%`, className: "text-red-600" };
  return { text: "0%", className: "text-muted-foreground" };
}

export function KpiCards(props: KpiCardsProps) {
  const { trends } = props;

  const contactTrend = trends
    ? formatTrend(trends.contacts.current, trends.contacts.previous)
    : null;
  const dealTrend = trends ? formatTrend(trends.deals.current, trends.deals.previous) : null;
  const quoteTrend = trends ? formatTrend(trends.quotes.current, trends.quotes.previous) : null;
  const revenueTrend = trends
    ? formatTrend(trends.revenue.current, trends.revenue.previous)
    : formatTrend(props.monthlyRevenue, props.monthlyRevenueLastMonth);

  const cards = [
    {
      label: "Contacts",
      value: props.totalContacts.toString(),
      subtitle: contactTrend
        ? `${contactTrend.text} vs période préc.`
        : `${props.totalCompanies} sociétés`,
      subtitleClass: contactTrend?.className ?? "text-muted-foreground",
      detail: `${props.totalCompanies} sociétés`,
      icon: Users,
    },
    {
      label: "Pipeline",
      value: `${props.openDeals} deals`,
      subtitle: dealTrend
        ? `${dealTrend.text} vs période préc.`
        : `${formatCurrency(props.openDealsWeighted)} pondéré`,
      subtitleClass: dealTrend?.className ?? "text-muted-foreground",
      detail: formatCurrency(props.openDealsWeighted),
      icon: Kanban,
    },
    {
      label: "Devis en cours",
      value: props.pendingQuotes.toString(),
      subtitle: quoteTrend
        ? `${quoteTrend.text} vs période préc.`
        : formatCurrency(props.pendingQuotesAmount),
      subtitleClass: quoteTrend?.className ?? "text-muted-foreground",
      detail: formatCurrency(props.pendingQuotesAmount),
      icon: FileText,
    },
    {
      label: "À encaisser",
      value: formatCurrency(props.totalReceivable ?? 0),
      subtitle: `${props.unpaidInvoices ?? 0} facture${(props.unpaidInvoices ?? 0) > 1 ? "s" : ""} en attente`,
      subtitleClass: "text-muted-foreground",
      detail: null,
      icon: Wallet,
    },
    {
      label: "Chiffre d'affaires",
      value: formatCurrency(trends?.revenue.current ?? props.monthlyRevenue),
      subtitle: `${revenueTrend.text} vs période préc.`,
      subtitleClass: revenueTrend.className,
      detail: null,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <card.icon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className={`text-xs ${card.subtitleClass}`}>{card.subtitle}</p>
              {card.detail && <p className="text-xs text-muted-foreground">{card.detail}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
