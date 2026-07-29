import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeriodRange } from "./dateHelpers";

export interface TrendData {
  current: number;
  previous: number;
}

export interface Trends {
  contacts: TrendData;
  deals: TrendData;
  quotes: TrendData;
  revenue: TrendData;
}

/** Recupere les tendances (current vs previous period) */
export async function fetchTrends(
  supabase: SupabaseClient,
  orgId: string,
  range: PeriodRange,
): Promise<Trends> {
  const { startDate, endDate, prevStartDate, prevEndDate } = range;

  const [
    contactsCurrent,
    contactsPrev,
    dealsCurrent,
    dealsPrev,
    quotesCurrent,
    quotesPrev,
    revenueCurrent,
    revenuePrev,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .is("deleted_at", null),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", prevStartDate)
      .lte("created_at", prevEndDate)
      .is("deleted_at", null),
    supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .is("deleted_at", null),
    supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", prevStartDate)
      .lte("created_at", prevEndDate)
      .is("deleted_at", null),
    supabase
      .from("quotes")
      .select("total_ttc")
      .eq("organization_id", orgId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .is("deleted_at", null),
    supabase
      .from("quotes")
      .select("total_ttc")
      .eq("organization_id", orgId)
      .gte("created_at", prevStartDate)
      .lte("created_at", prevEndDate)
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("paid_amount")
      .eq("organization_id", orgId)
      .in("status", ["paid", "partial"])
      .gte("paid_at", startDate)
      .lte("paid_at", endDate)
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("paid_amount")
      .eq("organization_id", orgId)
      .in("status", ["paid", "partial"])
      .gte("paid_at", prevStartDate)
      .lte("paid_at", prevEndDate)
      .is("deleted_at", null),
  ]);

  const sumTtc = (data: Array<{ total_ttc: number }> | null) =>
    (data ?? []).reduce((s, r) => s + r.total_ttc, 0);
  const sumPaid = (data: Array<{ paid_amount: number }> | null) =>
    (data ?? []).reduce((s, r) => s + r.paid_amount, 0);

  return {
    contacts: { current: contactsCurrent.count ?? 0, previous: contactsPrev.count ?? 0 },
    deals: { current: dealsCurrent.count ?? 0, previous: dealsPrev.count ?? 0 },
    quotes: { current: sumTtc(quotesCurrent.data), previous: sumTtc(quotesPrev.data) },
    revenue: { current: sumPaid(revenueCurrent.data), previous: sumPaid(revenuePrev.data) },
  };
}
