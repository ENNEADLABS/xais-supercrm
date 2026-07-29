import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as activityService from "./activityService";
import * as tenantConfigService from "./tenantConfigService";

// --- Helper interne ---

async function fetchDeal(orgId: string, dealId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("deals")
    .select("stage, deal_status")
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .is("deleted_at", null);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal not found");
  return { supabase, deal: data[0] as Record<string, unknown> };
}

// --- Deplacement de stage (kanban) ---

export async function moveDeal(orgId: string, dealId: string, stage: string, position: number) {
  const { supabase, deal } = await fetchDeal(orgId, dealId);
  const fromStage = deal.stage as string;

  if (stage === "lost") throw new Error("Cannot move to lost stage — use closeDeal instead");

  const probability = await tenantConfigService.getProbabilityForStage(orgId, stage);
  const isWon = stage === "won";
  const payload: Record<string, unknown> = {
    stage,
    position,
    probability: isWon ? 100 : probability,
    ...(isWon && { deal_status: "won", closed_at: new Date().toISOString() }),
  };

  const { data, error } = await supabase
    .from("deals")
    .update(payload)
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .select("*");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal not found");

  await activityService.log(orgId, {
    entityType: "deal",
    entityId: dealId,
    action: isWon ? "deal_won" : "stage_changed",
    metadata: { from: fromStage, to: stage },
  });
  return data[0];
}

// --- Fermeture (won/lost) ---

export async function closeDeal(
  orgId: string,
  dealId: string,
  status: "won" | "lost",
  lostReason?: string | null,
) {
  const { supabase, deal } = await fetchDeal(orgId, dealId);
  if (deal.deal_status !== "open") throw new Error("Deal is already closed");

  const { data, error } = await supabase
    .from("deals")
    .update({
      deal_status: status,
      stage: status,
      probability: status === "won" ? 100 : 0,
      closed_at: new Date().toISOString(),
      lost_reason: status === "lost" ? (lostReason ?? null) : null,
    })
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal not found");

  await activityService.log(orgId, {
    entityType: "deal",
    entityId: dealId,
    action: status === "won" ? "deal_won" : "deal_lost",
  });
  return data[0];
}

// --- Reouverture d'un deal ferme ---

export async function reopenDeal(orgId: string, dealId: string, stage: string) {
  const { supabase, deal } = await fetchDeal(orgId, dealId);
  if (deal.deal_status === "open") throw new Error("Deal is already open");

  const probability = await tenantConfigService.getProbabilityForStage(orgId, stage);
  const { data, error } = await supabase
    .from("deals")
    .update({ deal_status: "open", stage, probability, closed_at: null, lost_reason: null })
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deal not found");

  await activityService.log(orgId, {
    entityType: "deal",
    entityId: dealId,
    action: "deal_reopened",
    metadata: { stage },
  });
  return data[0];
}

// --- Liaison deal <-> contact ---

export async function linkDealContact(
  orgId: string,
  dealId: string,
  contactId: string,
  role?: string,
) {
  const { supabase } = await fetchDeal(orgId, dealId);
  const { error } = await supabase
    .from("deal_contacts")
    .insert({ deal_id: dealId, contact_id: contactId, role: role ?? null });
  if (error) throw error;
}

export async function unlinkDealContact(orgId: string, dealId: string, contactId: string) {
  const { supabase } = await fetchDeal(orgId, dealId);
  const { error } = await supabase
    .from("deal_contacts")
    .delete()
    .eq("deal_id", dealId)
    .eq("contact_id", contactId);
  if (error) throw error;
}
