"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthContext } from "./helpers";
import { getDashboardStats } from "@/lib/services/dashboardService";
import { computePeriodRange } from "@/lib/services/dashboard/dateHelpers";
import { fetchTrends } from "@/lib/services/dashboard/trendQueries";
import {
  fetchRevenueTimeSeries,
  fetchConversionTimeSeries,
} from "@/lib/services/dashboard/timeSeriesQueries";
import type { PeriodPresetId } from "@/stores/dashboardStore";

// --- Recuperation des stats dashboard ---

export async function fetchDashboardStats() {
  const { organizationId } = await getAuthContext();
  return getDashboardStats(organizationId);
}

// --- Recuperation des donnees enrichies avec periode ---

export async function fetchDashboardTrends(periodId: PeriodPresetId) {
  const { organizationId } = await getAuthContext();
  const supabase = await createServerSupabaseClient();
  const range = computePeriodRange(periodId);

  const [trends, revenueTimeSeries, conversionTimeSeries] = await Promise.all([
    fetchTrends(supabase, organizationId, range),
    fetchRevenueTimeSeries(supabase, organizationId, range),
    fetchConversionTimeSeries(supabase, organizationId, range),
  ]);

  return { trends, revenueTimeSeries, conversionTimeSeries, granularity: range.granularity };
}
