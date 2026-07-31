import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentTemplate, ContentPiece, Database, Json } from "@/types/database";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateInput,
} from "@/lib/schemas/content";
import * as activityService from "./activityService";

// --- Liste (actifs + inactifs, hors soft-deleted) ---

export async function getTemplates(organizationId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as ContentTemplate[]) ?? [];
}

// --- Detail ---

export async function getTemplate(organizationId: string, templateId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as ContentTemplate;
}

// --- Creation ---

export async function createTemplate(
  organizationId: string,
  userId: string,
  input: CreateTemplateInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_templates")
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? null,
      format: input.format,
      target_audience: input.target_audience ?? null,
      default_priority: input.default_priority,
      // JSONB embarques (deja valides par Zod cote action)
      script_skeleton: (input.script_skeleton ?? null) as Json,
      checklist_items: input.checklist_items as Json,
      deliverable_specs: input.deliverable_specs as Json,
      is_active: input.is_active,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Template creation failed");

  const template = data[0] as ContentTemplate;
  await activityService.log(organizationId, {
    entityType: "content_template",
    entityId: template.id,
    action: "template_created",
    actorId: userId,
    metadata: { template_id: template.id, name: template.name },
  });
  return template;
}

// --- Mise a jour ---

export async function updateTemplate(
  organizationId: string,
  userId: string,
  templateId: string,
  input: UpdateTemplateInput,
) {
  const supabase = await createServerSupabaseClient();

  // Construire le patch en castant uniquement les JSONB presents
  const patch: Database["public"]["Tables"]["content_templates"]["Update"] = { ...input };
  if ("script_skeleton" in input) patch.script_skeleton = (input.script_skeleton ?? null) as Json;
  if ("checklist_items" in input) patch.checklist_items = input.checklist_items as Json;
  if ("deliverable_specs" in input) patch.deliverable_specs = input.deliverable_specs as Json;

  const { data, error } = await supabase
    .from("content_templates")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Template not found");

  await activityService.log(organizationId, {
    entityType: "content_template",
    entityId: templateId,
    action: "template_updated",
    actorId: userId,
    metadata: { template_id: templateId, fields: Object.keys(input) },
  });
  return data[0] as ContentTemplate;
}

// --- Suppression (soft-delete : update deleted_at, jamais .delete()) ---

export async function softDeleteTemplate(
  organizationId: string,
  userId: string,
  templateId: string,
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("content_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .is("deleted_at", null);

  if (error) throw error;

  await activityService.log(organizationId, {
    entityType: "content_template",
    entityId: templateId,
    action: "template_deleted",
    actorId: userId,
    metadata: { template_id: templateId },
  });
}

// --- Application d'un template -> piece complete (RPC transactionnelle) ---
// L'autorite (org/user) est derivee du contexte d'auth cote PG : aucun org/user
// transmis a la fonction. org/user ici servent au filtre de relecture + activite.

export async function applyTemplate(
  organizationId: string,
  userId: string,
  input: ApplyTemplateInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data: pieceId, error } = await supabase.rpc("apply_content_template", {
    p_template_id: input.template_id,
    p_title: input.title,
    p_scheduled_date: input.scheduled_date ?? undefined,
  });

  if (error) throw error;
  if (!pieceId) throw new Error("Template application failed: no piece ID returned");

  // Charger la piece creee pour la retourner
  const { data: pieces, error: fetchError } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pieceId as string);

  if (fetchError) throw fetchError;
  if (!pieces || pieces.length === 0) throw new Error("Piece creee introuvable");

  const piece = pieces[0] as ContentPiece;
  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: piece.id,
    action: "template_applied",
    actorId: userId,
    metadata: { template_id: input.template_id },
  });
  return piece;
}
