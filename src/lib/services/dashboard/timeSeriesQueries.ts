import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeriodRange } from "./dateHelpers";
import { toGroupKey, generateGroupKeys } from "./dateHelpers";

export interface TimeSeriesPoint {
  date: string;
  label: string;
  revenue: number;
  invoiced: number;
  quoted: number;
}

export interface ConversionPoint {
  date: string;
  label: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
}

/** Recupere les series temporelles pour le graphique CA */
export async function fetchRevenueTimeSeries(
  supabase: SupabaseClient,
  orgId: string,
  range: PeriodRange,
): Promise<TimeSeriesPoint[]> {
  const { startDate, endDate, granularity } = range;

  const [paidRes, invoicedRes, quotedRes] = await Promise.all([
    // Factures payees
    supabase
      .from("invoices")
      .select("paid_amount, paid_at")
      .eq("organization_id", orgId)
      .in("status", ["paid", "partial"])
      .gte("paid_at", startDate)
      .lte("paid_at", endDate)
      .is("deleted_at", null),
    // Factures emises (issued_at est renseigne a la validation)
    supabase
      .from("invoices")
      .select("total_ttc, issued_at")
      .eq("organization_id", orgId)
      .not("issued_at", "is", null)
      .gte("issued_at", startDate)
      .lte("issued_at", endDate)
      .is("deleted_at", null),
    // Devis crees
    supabase
      .from("quotes")
      .select("total_ttc, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .is("deleted_at", null),
  ]);

  const keys = generateGroupKeys(startDate, endDate, granularity);
  const revenueMap = new Map<string, number>();
  const invoicedMap = new Map<string, number>();
  const quotedMap = new Map<string, number>();

  for (const key of keys) {
    revenueMap.set(key, 0);
    invoicedMap.set(key, 0);
    quotedMap.set(key, 0);
  }

  for (const inv of paidRes.data ?? []) {
    if (!inv.paid_at) continue;
    const key = toGroupKey(inv.paid_at, granularity);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + inv.paid_amount);
  }

  for (const inv of invoicedRes.data ?? []) {
    if (!inv.issued_at) continue;
    const key = toGroupKey(inv.issued_at, granularity);
    invoicedMap.set(key, (invoicedMap.get(key) ?? 0) + inv.total_ttc);
  }

  for (const q of quotedRes.data ?? []) {
    const key = toGroupKey(q.created_at, granularity);
    quotedMap.set(key, (quotedMap.get(key) ?? 0) + q.total_ttc);
  }

  // Import formatGroupLabel dynamiquement pour eviter le bundling client
  const { formatGroupLabel } = await import("./dateHelpers");

  return keys.map((key) => ({
    date: key,
    label: formatGroupLabel(key, granularity),
    revenue: revenueMap.get(key) ?? 0,
    invoiced: invoicedMap.get(key) ?? 0,
    quoted: quotedMap.get(key) ?? 0,
  }));
}

/** Recupere les series temporelles pour le graphique conversion */
export async function fetchConversionTimeSeries(
  supabase: SupabaseClient,
  orgId: string,
  range: PeriodRange,
): Promise<ConversionPoint[]> {
  const { startDate, endDate, granularity } = range;

  // Deals clos (won ou lost) dans la periode
  const { data: closedDeals } = await supabase
    .from("deals")
    .select("deal_status, closed_at")
    .eq("organization_id", orgId)
    .in("deal_status", ["won", "lost"])
    .gte("closed_at", startDate)
    .lte("closed_at", endDate)
    .is("deleted_at", null);

  const keys = generateGroupKeys(startDate, endDate, granularity);
  const wonMap = new Map<string, number>();
  const lostMap = new Map<string, number>();

  for (const key of keys) {
    wonMap.set(key, 0);
    lostMap.set(key, 0);
  }

  for (const deal of closedDeals ?? []) {
    if (!deal.closed_at) continue;
    const key = toGroupKey(deal.closed_at, granularity);
    if (deal.deal_status === "won") {
      wonMap.set(key, (wonMap.get(key) ?? 0) + 1);
    } else {
      lostMap.set(key, (lostMap.get(key) ?? 0) + 1);
    }
  }

  const { formatGroupLabel } = await import("./dateHelpers");

  return keys.map((key) => {
    const won = wonMap.get(key) ?? 0;
    const lost = lostMap.get(key) ?? 0;
    const total = won + lost;
    return {
      date: key,
      label: formatGroupLabel(key, granularity),
      totalDeals: total,
      wonDeals: won,
      lostDeals: lost,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  });
}
