import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPipelineStages } from "@/lib/services/tenantConfigService";
import { sixMonthsAgo, daysAgo, daysFromNow } from "./dashboardHelpers";

// I/O du dashboard : lance toutes les requetes en parallele et retourne les
// resultats bruts. La transformation vit dans statsAggregator (pure, testable).

export async function fetchDashboardData(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const orgId = organizationId;
  const today = new Date().toISOString().slice(0, 10);

  const [
    contactsRes,
    companiesRes,
    dealsRes,
    quotesRes,
    invoicesRes,
    overdueRes,
    sentQuotesRes,
    staleDealsRes,
    activitiesRes,
    pipelineStages,
    overdueTasksRes,
    upcomingTasksRes,
    receivableRes,
    recentPaymentsRes,
  ] = await Promise.all([
    // 1. Contacts actifs (count)
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .is("deleted_at", null),

    // 2. Societes actives (count)
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .is("deleted_at", null),

    // 3. Deals ouverts (montants + stage pour pipeline)
    supabase
      .from("deals")
      .select("amount, weighted_amount, stage")
      .eq("organization_id", orgId)
      .eq("deal_status", "open")
      .is("deleted_at", null),

    // 4. Devis en attente
    supabase
      .from("quotes")
      .select("total_ttc")
      .eq("organization_id", orgId)
      .in("status", ["validated", "sent"])
      .is("deleted_at", null),

    // 5. Factures payees (6 derniers mois)
    supabase
      .from("invoices")
      .select("paid_amount, paid_at")
      .eq("organization_id", orgId)
      .in("status", ["paid", "partial"])
      .is("deleted_at", null)
      .gte("paid_at", sixMonthsAgo()),

    // 6. Factures en retard
    supabase
      .from("invoices")
      .select("id, reference, subject, company_id, total_ttc, due_date, companies(name)")
      .eq("organization_id", orgId)
      .in("status", ["sent", "partial"])
      .is("deleted_at", null)
      .lt("due_date", today)
      .order("due_date")
      .limit(5),

    // 7. Devis envoyes (pour calcul expiration)
    supabase
      .from("quotes")
      .select(
        "id, reference, subject, company_id, total_ttc, issued_at, validity_days, companies(name)",
      )
      .eq("organization_id", orgId)
      .eq("status", "sent")
      .is("deleted_at", null),

    // 8. Deals inactifs depuis 14 jours
    supabase
      .from("deals")
      .select("id, name, company_id, amount, stage, updated_at, companies(name)")
      .eq("organization_id", orgId)
      .eq("deal_status", "open")
      .is("deleted_at", null)
      .lt("updated_at", daysAgo(14))
      .order("updated_at")
      .limit(5),

    // 9. Activites recentes
    supabase
      .from("activities")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),

    // 10. Config pipeline
    getPipelineStages(orgId),

    // 11. Tâches en retard (due_date < maintenant, statut todo/in_progress)
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, entity_type, entity_id")
      .eq("organization_id", orgId)
      .in("status", ["todo", "in_progress"])
      .lt("due_date", today)
      .order("due_date")
      .limit(5),

    // 12. Tâches à venir (due_date entre maintenant et maintenant+3 jours)
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, entity_type, entity_id")
      .eq("organization_id", orgId)
      .in("status", ["todo", "in_progress"])
      .gte("due_date", today)
      .lte("due_date", daysFromNow(3).slice(0, 10))
      .order("due_date")
      .limit(5),

    // 13. Total a encaisser (factures non payees)
    supabase
      .from("invoices")
      .select("total_ttc, paid_amount")
      .eq("organization_id", orgId)
      .in("status", ["sent", "partial", "overdue"])
      .is("deleted_at", null),

    // 14. Paiements recents (5 derniers)
    supabase
      .from("payments")
      .select(
        "id, amount, payment_date, payment_method, invoices!inner(reference, companies!inner(name))",
      )
      .eq("organization_id", orgId)
      .order("payment_date", { ascending: false })
      .limit(5),
  ]);

  return {
    contactsRes,
    companiesRes,
    dealsRes,
    quotesRes,
    invoicesRes,
    overdueRes,
    sentQuotesRes,
    staleDealsRes,
    activitiesRes,
    pipelineStages,
    overdueTasksRes,
    upcomingTasksRes,
    receivableRes,
    recentPaymentsRes,
  };
}

export type DashboardRawData = Awaited<ReturnType<typeof fetchDashboardData>>;
