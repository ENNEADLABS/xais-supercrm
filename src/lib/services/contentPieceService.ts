import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentPiece } from "@/types/database";
import type {
  CreateContentPieceInput,
  UpdateContentPieceInput,
  MoveContentPieceInput,
  ConvertIdeaInput,
  UpdateBlockedInput,
} from "@/lib/schemas/content";
import * as activityService from "./activityService";
import * as contentIdeaService from "./contentIdeaService";
import { getContentPiece } from "./contentPieceReadService";

// --- Creation ---

export async function createContentPiece(
  organizationId: string,
  userId: string,
  input: CreateContentPieceInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_pieces")
    .insert({ ...input, organization_id: organizationId, owner_id: input.owner_id ?? userId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content piece creation failed");

  const piece = data[0] as ContentPiece;
  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: piece.id,
    action: "created",
    actorId: userId,
  });
  return piece;
}

// --- Conversion d'une idee en content piece (l'idee passe en archived) ---

export async function convertIdeaToPiece(
  organizationId: string,
  userId: string,
  input: ConvertIdeaInput,
) {
  const idea = await contentIdeaService.getContentIdea(organizationId, input.idea_id);
  if (!idea) throw new Error("Content idea not found");

  const piece = await createContentPiece(organizationId, userId, {
    title: input.title ?? idea.title,
    format: input.format,
    status: "idea",
    summary: idea.angle,
    priority: idea.priority,
    owner_id: idea.owner_id,
    scheduled_date: idea.desired_publish_date,
    idea_id: idea.id,
  });

  // L'idee a accompli son role : on l'archive (decision spec 021).
  await contentIdeaService.updateContentIdea(organizationId, userId, idea.id, {
    status: "archived",
  });

  return piece;
}

// --- Mise a jour ---

export async function updateContentPiece(
  organizationId: string,
  userId: string,
  pieceId: string,
  input: UpdateContentPieceInput,
) {
  const supabase = await createServerSupabaseClient();

  const current = await getContentPiece(organizationId, pieceId);
  if (!current) throw new Error("Content piece not found");

  const updateData: Record<string, unknown> = { ...input };

  // Passage en published : horodatage automatique si absent
  if (input.status === "published" && current.status !== "published" && !input.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("content_pieces")
    .update(updateData)
    .eq("organization_id", organizationId)
    .eq("id", pieceId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content piece not found");

  const action = input.status && input.status !== current.status ? "status_changed" : "updated";
  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: pieceId,
    action,
    actorId: userId,
    metadata:
      action === "status_changed"
        ? { from: current.status, to: input.status }
        : { fields: Object.keys(input) },
  });
  return data[0] as ContentPiece;
}

// --- Deplacement kanban (statut + position) ---

export async function moveContentPiece(
  organizationId: string,
  userId: string,
  pieceId: string,
  input: MoveContentPieceInput,
) {
  return updateContentPiece(organizationId, userId, pieceId, {
    status: input.status,
    position: input.position,
  });
}

// --- Blocage manuel (set/clear via un seul point d'entree) ---

export async function setBlockedState(
  organizationId: string,
  userId: string,
  pieceId: string,
  input: UpdateBlockedInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_pieces")
    .update({
      is_blocked: input.is_blocked,
      blocked_reason: input.is_blocked ? (input.blocked_reason ?? null) : null,
      blocked_at: input.is_blocked ? new Date().toISOString() : null,
    })
    .eq("organization_id", organizationId)
    .eq("id", pieceId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content piece not found");

  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: pieceId,
    action: input.is_blocked ? "blocked" : "unblocked",
    actorId: userId,
    metadata: input.is_blocked ? { reason: input.blocked_reason ?? null } : {},
  });
  return data[0] as ContentPiece;
}

// --- Validation (horodatage validated_at/by + activite) ---

export async function validatePiece(organizationId: string, userId: string, pieceId: string) {
  const supabase = await createServerSupabaseClient();

  // La validation s'applique a une piece en relecture (spec : passage review -> scheduled).
  const current = await getContentPiece(organizationId, pieceId);
  if (!current) throw new Error("Content piece not found");
  if (current.status !== "review") {
    throw new Error("Only a piece in review can be validated");
  }

  const { data, error } = await supabase
    .from("content_pieces")
    .update({ validated_at: new Date().toISOString(), validated_by: userId })
    .eq("organization_id", organizationId)
    .eq("id", pieceId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content piece not found");

  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: pieceId,
    action: "validated",
    actorId: userId,
  });
  return data[0] as ContentPiece;
}

// --- Suppression (soft-delete) ---

export async function deleteContentPiece(organizationId: string, userId: string, pieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("content_pieces")
    .update({ deleted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", pieceId);

  if (error) throw error;

  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: pieceId,
    action: "deleted",
    actorId: userId,
  });
}
