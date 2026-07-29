import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentAsset } from "@/types/database";
import type { CreateContentAssetInput, UpdateContentAssetInput } from "@/lib/schemas/content";
import * as activityService from "./activityService";

// --- Assets d'un contenu ---

export async function getAssetsForPiece(organizationId: string, contentPieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("content_piece_id", contentPieceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ContentAsset[]) ?? [];
}

// --- Assets d'un livrable ---

export async function getAssetsForDeliverable(organizationId: string, deliverableId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_assets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("deliverable_id", deliverableId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ContentAsset[]) ?? [];
}

// --- Creation ---

export async function createAsset(
  organizationId: string,
  userId: string,
  input: CreateContentAssetInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_assets")
    .insert({ ...input, organization_id: organizationId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Asset creation failed");

  const asset = data[0] as ContentAsset;
  if (input.content_piece_id) {
    await activityService.log(organizationId, {
      entityType: "content_piece",
      entityId: input.content_piece_id,
      action: "asset_added",
      actorId: userId,
      metadata: { role: input.role },
    });
  }
  return asset;
}

// --- Mise a jour (role, version, finale, lien) ---

export async function updateAsset(
  organizationId: string,
  userId: string,
  assetId: string,
  input: UpdateContentAssetInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_assets")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", assetId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Asset not found");

  const asset = data[0] as ContentAsset;
  if (input.is_final === true && asset.content_piece_id) {
    await activityService.log(organizationId, {
      entityType: "content_piece",
      entityId: asset.content_piece_id,
      action: "asset_validated",
      actorId: userId,
      metadata: { role: asset.role },
    });
  }
  return asset;
}

// --- Suppression (hard-delete : asset = composant enfant) ---

export async function deleteAsset(organizationId: string, assetId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("content_assets")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", assetId);

  if (error) throw error;
}
