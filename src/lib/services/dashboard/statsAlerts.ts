import { daysFromNow } from "./dashboardHelpers";
import type { DashboardRawData } from "./statsQueries";

// Mappers des "urgences" du dashboard (factures en retard, devis expirant,
// deals inactifs, taches en retard / a venir). Pur, testable sans base.

type InvoiceWithCompany = {
  id: string;
  reference: string | null;
  subject: string;
  company_id: string;
  total_ttc: number;
  due_date: string | null;
  companies: { name: string } | null;
};

type QuoteWithCompany = {
  id: string;
  reference: string | null;
  subject: string;
  company_id: string;
  total_ttc: number;
  issued_at: string | null;
  validity_days: number;
  companies: { name: string } | null;
};

type DealWithCompany = {
  id: string;
  name: string;
  company_id: string;
  amount: number | null;
  stage: string;
  updated_at: string;
  companies: { name: string } | null;
};

export function buildAlerts(raw: DashboardRawData) {
  const { overdueRes, sentQuotesRes, staleDealsRes, overdueTasksRes, upcomingTasksRes } = raw;

  // --- Factures en retard ---
  const overdueInvoices = ((overdueRes.data as unknown as InvoiceWithCompany[] | null) ?? []).map(
    (inv) => ({
      id: inv.id,
      reference: inv.reference,
      subject: inv.subject,
      company_name: inv.companies?.name ?? "",
      total_ttc: inv.total_ttc,
      due_date: inv.due_date ?? "",
    }),
  );

  // --- Devis expirant dans 7 jours ---
  const sevenDaysFromNow = new Date(daysFromNow(7)).getTime();
  const nowTs = Date.now();
  const expiringQuotes = ((sentQuotesRes.data as unknown as QuoteWithCompany[] | null) ?? [])
    .filter((q) => {
      if (!q.issued_at) return false;
      const expiresAt = new Date(q.issued_at);
      expiresAt.setDate(expiresAt.getDate() + q.validity_days);
      const expiresTs = expiresAt.getTime();
      // Expire dans les 7 prochains jours (pas deja expire)
      return expiresTs >= nowTs && expiresTs <= sevenDaysFromNow;
    })
    .slice(0, 5)
    .map((q) => {
      const expiresAt = new Date(q.issued_at!);
      expiresAt.setDate(expiresAt.getDate() + q.validity_days);
      return {
        id: q.id,
        reference: q.reference,
        subject: q.subject,
        company_name: q.companies?.name ?? "",
        total_ttc: q.total_ttc,
        expires_at: expiresAt.toISOString(),
      };
    });

  // --- Deals inactifs ---
  const staleDeals = ((staleDealsRes.data as unknown as DealWithCompany[] | null) ?? []).map(
    (d) => ({
      id: d.id,
      name: d.name,
      company_name: d.companies?.name ?? "",
      amount: d.amount,
      stage: d.stage,
      updated_at: d.updated_at,
    }),
  );

  // --- Tâches en retard ---
  const overdueTasks = (overdueTasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date ?? "",
    priority: t.priority,
    entity_type: t.entity_type,
    entity_id: t.entity_id,
  }));

  // --- Tâches à venir ---
  const upcomingTasks = (upcomingTasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date ?? "",
    priority: t.priority,
    entity_type: t.entity_type,
    entity_id: t.entity_id,
  }));

  return { overdueInvoices, expiringQuotes, staleDeals, overdueTasks, upcomingTasks };
}
