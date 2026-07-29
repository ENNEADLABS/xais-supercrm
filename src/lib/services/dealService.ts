import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateDealInput, UpdateDealInput, DealSearchInput } from "@/lib/schemas/deal";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";
import * as tenantConfigService from "./tenantConfigService";

// Type local en attendant la generation des types DB
type DealStatus = "open" | "won" | "lost";

// Re-export des fonctions lifecycle depuis le module dedie
export {
  moveDeal,
  closeDeal,
  reopenDeal,
  linkDealContact,
  unlinkDealContact,
} from "./dealLifecycleService";

// --- Liste paginee avec recherche et filtres ---

export async function getDeals(organizationId: string, params?: DealSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("deals")
    .select("*, companies(name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (params?.query) query = query.ilike("name", `%${escapeLike(params.query)}%`);
  if (params?.stage) query = query.eq("stage", params.stage);
  if (params?.deal_status) query = query.eq("deal_status", params.deal_status);
  if (params?.company_id) query = query.eq("company_id", params.company_id);
  if (params?.assigned_to) query = query.eq("assigned_to", params.assigned_to);

  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// --- Deals par stage (vue kanban) ---

export async function getDealsByStage(orgId: string): Promise<Record<string, unknown[]>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, companies(name)")
    .eq("organization_id", orgId)
    .eq("deal_status", "open")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) throw error;

  // Grouper par stage
  const grouped: Record<string, unknown[]> = {};
  for (const deal of data ?? []) {
    const stage = (deal as Record<string, unknown>).stage as string;
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(deal);
  }
  return grouped;
}

// --- Detail d'un deal avec relations ---

export async function getDeal(organizationId: string, dealId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*, companies(name)")
    .eq("organization_id", organizationId)
    .eq("id", dealId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!deals || deals.length === 0) return null;

  // Charger contacts et tags en parallele
  const [{ data: contacts }, { data: tags }] = await Promise.all([
    supabase.from("deal_contacts").select("*, contacts(*)").eq("deal_id", dealId),
    supabase.from("deal_tags").select("*, tags(*)").eq("deal_id", dealId),
  ]);

  const activeContacts = (contacts ?? []).filter(
    (dc) => !(dc.contacts as Record<string, unknown> | null)?.deleted_at,
  );

  return { ...deals[0], contacts: activeContacts, tags: tags ?? [] };
}

// --- Creation ---

export async function createDeal(organizationId: string, input: CreateDealInput) {
  const supabase = await createServerSupabaseClient();
  const stage = input.stage ?? "new";
  const probability =
    input.probability ?? (await tenantConfigService.getProbabilityForStage(organizationId, stage));

  const { data, error } = await supabase
    .from("deals")
    .insert({
      ...input,
      organization_id: organizationId,
      deal_status: "open" as DealStatus,
      probability,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal creation failed");

  await activityService.log(organizationId, {
    entityType: "deal",
    entityId: data[0].id as string,
    action: "created",
  });
  return data[0];
}

// --- Mise a jour ---

export async function updateDeal(organizationId: string, dealId: string, input: UpdateDealInput) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("deals")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", dealId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal not found");

  await activityService.log(organizationId, {
    entityType: "deal",
    entityId: dealId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });
  return data[0];
}
