import type { DashboardStats } from "./dashboard/types";
import { fetchDashboardData } from "./dashboard/statsQueries";
import { buildDashboardStats } from "./dashboard/statsAggregator";

export type { DashboardStats };

// --- Service principal ---

/** Recupere toutes les stats du dashboard (I/O parallele -> agregation pure). */
export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const raw = await fetchDashboardData(organizationId);
  return buildDashboardStats(raw);
}
