"use client";

import { useDashboardStats, useDashboardTrends } from "@/lib/hooks/useDashboard";

import { PeriodSelector } from "./PeriodSelector";
import { KpiCards } from "./KpiCards";
import { RevenueChart } from "./RevenueChart";
import { PipelineFunnel } from "./PipelineFunnel";
import { ConversionChart } from "./ConversionChart";
import { UrgentItems } from "./UrgentItems";
import { RecentPayments } from "./RecentPayments";
import { RecentActivity } from "./RecentActivity";

/** Squelette de chargement — blocs gris animes */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats();
  const { data: trendsData } = useDashboardTrends();

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">
          Erreur lors du chargement du tableau de bord.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Veuillez réessayer."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selecteur de periode */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <PeriodSelector />
      </div>

      {/* Ligne 1 : KPIs avec tendances */}
      <KpiCards
        totalContacts={data.totalContacts}
        totalCompanies={data.totalCompanies}
        openDeals={data.openDeals}
        openDealsWeighted={data.openDealsWeighted}
        pendingQuotes={data.pendingQuotes}
        pendingQuotesAmount={data.pendingQuotesAmount}
        monthlyRevenue={data.monthlyRevenue}
        monthlyRevenueLastMonth={data.monthlyRevenueLastMonth}
        totalReceivable={data.totalReceivable}
        unpaidInvoices={data.unpaidInvoices}
        trends={trendsData?.trends}
      />

      {/* Ligne 2 : CA (Recharts) + Pipeline (funnel + donut) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart data={trendsData?.revenueTimeSeries ?? []} />
        </div>
        <div className="lg:col-span-2">
          <PipelineFunnel pipelineByStage={data.pipelineByStage} />
        </div>
      </div>

      {/* Ligne 3 : Conversion pipeline + Urgents */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConversionChart data={trendsData?.conversionTimeSeries ?? []} />
        <UrgentItems
          overdueInvoices={data.overdueInvoices}
          expiringQuotes={data.expiringQuotes}
          staleDeals={data.staleDeals}
          overdueTasks={data.overdueTasks}
          upcomingTasks={data.upcomingTasks}
        />
      </div>

      {/* Ligne 4 : Paiements recents + Activite recente */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentPayments payments={data.recentPayments} />
        <div className="lg:col-span-2">
          <RecentActivity activities={data.recentActivities} />
        </div>
      </div>
    </div>
  );
}
