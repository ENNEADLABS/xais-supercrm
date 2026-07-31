import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Deliverable } from "@/types/database";
import type { CreateDeliverableInput, UpdateDeliverableInput } from "@/lib/schemas/content";
import * as activityService from "./activityService";

// --- Livrables d'un contenu (matrice de repurposing) ---

export async function getDeliverablesForPiece(organizationId: string, contentPieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("content_piece_id", contentPieceId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as Deliverable[]) ?? [];
}

// --- Detail ---

export async function getDeliverable(organizationId: string, deliverableId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", deliverableId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Deliverable;
}

// --- Creation ---

export async function createDeliverable(
  organizationId: string,
  userId: string,
  input: CreateDeliverableInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("deliverables")
    .insert({ ...input, organization_id: organizationId, owner_id: input.owner_id ?? userId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deliverable creation failed");

  const deliverable = data[0] as Deliverable;
  await activityService.log(organizationId, {
    entityType: "deliverable",
    entityId: deliverable.id,
    action: "created",
    actorId: userId,
    metadata: { content_piece_id: input.content_piece_id },
  });
  return deliverable;
}

// --- Mise a jour ---

export async function updateDeliverable(
  organizationId: string,
  userId: string,
  deliverableId: string,
  input: UpdateDeliverableInput,
) {
  const supabase = await createServerSupabaseClient();

  const current = await getDeliverable(organizationId, deliverableId);
  if (!current) throw new Error("Deliverable not found");

  const updateData: Database["public"]["Tables"]["deliverables"]["Update"] = { ...input };
  if (input.status === "published" && current.status !== "published" && !input.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("deliverables")
    .update(updateData)
    .eq("organization_id", organizationId)
    .eq("id", deliverableId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Deliverable not found");

  const action = input.status && input.status !== current.status ? "status_changed" : "updated";
  await activityService.log(organizationId, {
    entityType: "deliverable",
    entityId: deliverableId,
    action,
    actorId: userId,
    metadata:
      action === "status_changed"
        ? { from: current.status, to: input.status }
        : { fields: Object.keys(input) },
  });
  return data[0] as Deliverable;
}

// --- Suppression (soft-delete) ---

export async function deleteDeliverable(
  organizationId: string,
  userId: string,
  deliverableId: string,
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("deliverables")
    .update({ deleted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", deliverableId);

  if (error) throw error;

  await activityService.log(organizationId, {
    entityType: "deliverable",
    entityId: deliverableId,
    action: "deleted",
    actorId: userId,
  });
}
