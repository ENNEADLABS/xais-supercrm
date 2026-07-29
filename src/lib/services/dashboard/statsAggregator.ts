import type { DashboardStats, PaymentWithInvoice } from "./types";
import { toMonthKey } from "./dashboardHelpers";
import type { DashboardRawData } from "./statsQueries";
import { buildAlerts } from "./statsAlerts";

// Transformation pure des resultats bruts du dashboard en DashboardStats.
// Aucun I/O : testable sans base.

export function buildDashboardStats(raw: DashboardRawData): DashboardStats {
  const {
    contactsRes,
    companiesRes,
    dealsRes,
    quotesRes,
    invoicesRes,
    activitiesRes,
    pipelineStages,
    receivableRes,
    recentPaymentsRes,
  } = raw;

  // --- Aggregation contacts / societes ---
  const totalContacts = contactsRes.count ?? 0;
  const totalCompanies = companiesRes.count ?? 0;

  // --- Aggregation deals ouverts ---
  const openDealsData = dealsRes.data ?? [];
  const openDeals = openDealsData.length;
  const openDealsAmount = openDealsData.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const openDealsWeighted = openDealsData.reduce((sum, d) => sum + (d.weighted_amount ?? 0), 0);

  // --- Pipeline par stage (enrichi avec labels/couleurs du tenant) ---
  const stageMap = new Map<string, { count: number; amount: number }>();
  for (const deal of openDealsData) {
    const entry = stageMap.get(deal.stage) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += deal.amount ?? 0;
    stageMap.set(deal.stage, entry);
  }
  const pipelineByStage = pipelineStages.map((s) => ({
    stage: s.id,
    label: s.label,
    color: s.color,
    count: stageMap.get(s.id)?.count ?? 0,
    amount: stageMap.get(s.id)?.amount ?? 0,
  }));

  // --- Devis en attente ---
  const pendingQuotesData = quotesRes.data ?? [];
  const pendingQuotes = pendingQuotesData.length;
  const pendingQuotesAmount = pendingQuotesData.reduce((sum, q) => sum + q.total_ttc, 0);

  // --- Revenus par mois (6 derniers mois) ---
  const invoicesData = invoicesRes.data ?? [];
  const revenueMap = new Map<string, number>();
  const now = new Date();
  // Initialiser les 6 derniers mois a 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueMap.set(toMonthKey(d.toISOString()), 0);
  }
  for (const inv of invoicesData) {
    if (!inv.paid_at) continue;
    const key = toMonthKey(inv.paid_at);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + inv.paid_amount);
  }
  const revenueByMonth = Array.from(revenueMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Revenu du mois courant et precedent
  const currentMonthKey = toMonthKey(now.toISOString());
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = toMonthKey(lastMonth.toISOString());
  const monthlyRevenue = revenueMap.get(currentMonthKey) ?? 0;
  const monthlyRevenueLastMonth = revenueMap.get(lastMonthKey) ?? 0;

  // --- Urgences (factures en retard, devis expirant, deals inactifs, taches) ---
  const { overdueInvoices, expiringQuotes, staleDeals, overdueTasks, upcomingTasks } =
    buildAlerts(raw);

  // --- Activites recentes ---
  const recentActivities = (activitiesRes.data ?? []).map((a) => ({
    id: a.id,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    action: a.action,
    metadata: a.metadata as Record<string, unknown>,
    created_at: a.created_at,
  }));

  // --- Total a encaisser ---
  const receivableInvoices = receivableRes.data ?? [];
  const totalReceivable = receivableInvoices.reduce(
    (sum, inv) => sum + ((inv.total_ttc as number) - (inv.paid_amount as number)),
    0,
  );
  const unpaidInvoices = receivableInvoices.length;

  // --- Paiements recents ---
  const recentPayments = (
    (recentPaymentsRes.data as unknown as PaymentWithInvoice[] | null) ?? []
  ).map((p) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    invoice_reference: p.invoices?.reference ?? null,
    company_name: p.invoices?.companies?.name ?? null,
  }));

  return {
    totalContacts,
    totalCompanies,
    openDeals,
    openDealsAmount,
    openDealsWeighted,
    pendingQuotes,
    pendingQuotesAmount,
    monthlyRevenue,
    monthlyRevenueLastMonth,
    pipelineByStage,
    revenueByMonth,
    overdueInvoices,
    expiringQuotes,
    staleDeals,
    overdueTasks,
    upcomingTasks,
    recentActivities,
    totalReceivable,
    unpaidInvoices,
    recentPayments,
  };
}
