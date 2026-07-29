import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

interface OverdueInvoice {
  id: string;
  reference: string | null;
  subject: string;
  company_name: string;
  total_ttc: number;
  due_date: string;
}

interface ExpiringQuote {
  id: string;
  reference: string | null;
  subject: string;
  company_name: string;
  total_ttc: number;
  expires_at: string;
}

interface StaleDeal {
  id: string;
  name: string;
  company_name: string;
  amount: number | null;
  stage: string;
  updated_at: string;
}

interface TaskItem {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  entity_type: string | null;
  entity_id: string | null;
}

interface UrgentItemsProps {
  overdueInvoices: OverdueInvoice[];
  expiringQuotes: ExpiringQuote[];
  staleDeals: StaleDeal[];
  overdueTasks?: TaskItem[];
  upcomingTasks?: TaskItem[];
}

/** Calcule le nombre de jours depuis une date ISO */
function daysFrom(isoDate: string): number {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
}

/** Libellé de priorité pour l'affichage */
function priorityLabel(priority: string): string {
  switch (priority) {
    case "urgent":
      return "Urgent";
    case "high":
      return "Haute";
    case "normal":
      return "Normale";
    case "low":
      return "Basse";
    default:
      return priority;
  }
}

export function UrgentItems({
  overdueInvoices,
  expiringQuotes,
  staleDeals,
  overdueTasks = [],
  upcomingTasks = [],
}: UrgentItemsProps) {
  const hasItems =
    overdueInvoices.length > 0 ||
    expiringQuotes.length > 0 ||
    staleDeals.length > 0 ||
    overdueTasks.length > 0 ||
    upcomingTasks.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>À traiter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasItems ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="size-5" />
            <span className="text-sm font-medium">Tout est à jour !</span>
          </div>
        ) : (
          <>
            {/* Factures en retard */}
            {overdueInvoices.length > 0 && (
              <Section title="Factures en retard" variant="destructive">
                {overdueInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="block hover:bg-muted/50 rounded px-1 py-1"
                  >
                    <span className="text-sm font-medium">{inv.reference ?? inv.subject}</span>
                    <span className="text-xs text-muted-foreground"> — {inv.company_name}</span>
                    <span className="float-right text-xs font-medium">
                      {formatCurrency(inv.total_ttc)} &middot; {daysFrom(inv.due_date)}j
                    </span>
                  </Link>
                ))}
              </Section>
            )}

            {/* Devis expirant */}
            {expiringQuotes.length > 0 && (
              <Section title="Devis expirant" variant="outline">
                {expiringQuotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="block hover:bg-muted/50 rounded px-1 py-1"
                  >
                    <span className="text-sm font-medium">{q.reference ?? q.subject}</span>
                    <span className="text-xs text-muted-foreground"> — {q.company_name}</span>
                    <span className="float-right text-xs font-medium">
                      {formatCurrency(q.total_ttc)}
                    </span>
                  </Link>
                ))}
              </Section>
            )}

            {/* Deals inactifs */}
            {staleDeals.length > 0 && (
              <Section title="Deals inactifs" variant="secondary">
                {staleDeals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="block hover:bg-muted/50 rounded px-1 py-1"
                  >
                    <span className="text-sm font-medium">{d.name}</span>
                    <span className="text-xs text-muted-foreground"> — {d.company_name}</span>
                    <span className="float-right text-xs font-medium">
                      {daysFrom(d.updated_at)}j
                    </span>
                  </Link>
                ))}
              </Section>
            )}

            {/* Tâches en retard */}
            {overdueTasks.length > 0 && (
              <Section title="Tâches en retard" variant="destructive">
                {overdueTasks.map((t) => (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="block hover:bg-muted/50 rounded px-1 py-1"
                  >
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      — {priorityLabel(t.priority)}
                    </span>
                    <span className="float-right text-xs font-medium text-red-600">
                      {daysFrom(t.due_date)}j de retard
                    </span>
                  </Link>
                ))}
              </Section>
            )}

            {/* Tâches à venir */}
            {upcomingTasks.length > 0 && (
              <Section title="Tâches à venir" variant="outline">
                {upcomingTasks.map((t) => (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="block hover:bg-muted/50 rounded px-1 py-1"
                  >
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      — {priorityLabel(t.priority)}
                    </span>
                    <span className="float-right text-xs font-medium">
                      {new Date(t.due_date).toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                ))}
              </Section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Sous-section avec badge titre */
function Section({
  title,
  variant,
  children,
}: {
  title: string;
  variant: "destructive" | "outline" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <div>
      <Badge variant={variant} className="mb-2">
        {title}
      </Badge>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
