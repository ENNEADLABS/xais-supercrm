import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats, fetchDashboardTrends } from "@/lib/actions/dashboard";
import { useDashboardStore } from "@/stores/dashboardStore";

// --- Stats du dashboard (donnees de base, independantes de la periode) ---

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchDashboardStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// --- Tendances et series temporelles (dependantes de la periode) ---

export function useDashboardTrends() {
  const periodId = useDashboardStore((s) => s.periodId);
  return useQuery({
    queryKey: ["dashboard-trends", periodId],
    queryFn: () => fetchDashboardTrends(periodId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
