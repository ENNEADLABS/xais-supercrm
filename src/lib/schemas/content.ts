import { z } from "zod";

// --- Schemas de validation Content Studio (spec 021) ---

// --- Enums (alignes sur les enums PostgreSQL) ---

export const contentStatusEnum = z.enum([
  "idea",
  "research",
  "script",
  "recording",
  "editing",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const contentFormatEnum = z.enum([
  "youtube_long",
  "youtube_short",
  "skool_post",
  "newsletter",
  "linkedin_post",
  "podcast",
  "course_lesson",
  "blog_article",
  "case_study",
  "other",
]);

export const deliverableStatusEnum = z.enum([
  "planned",
  "draft",
  "ready",
  "scheduled",
  "published",
  "cancelled",
]);

export const assetRoleEnum = z.enum([
  "thumbnail",
  "raw_video",
  "final_video",
  "short_clip",
  "audio",
  "transcript",
  "script_doc",
  "brand_asset",
  "reference",
]);

export const publicationChannelEnum = z.enum([
  "youtube",
  "skool",
  "linkedin",
  "newsletter",
  "instagram",
  "tiktok",
  "x_twitter",
  "podcast",
  "blog",
  "other",
]);

const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const ideaStatusEnum = z.enum(["active", "archived"]);

// ============================================================================
// content_ideas
// ============================================================================

export const createContentIdeaSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  angle: z.string().max(2000).nullish(),
  promise: z.string().max(2000).nullish(),
  hook: z.string().max(2000).nullish(),
  notes: z.string().max(10000).nullish(),
  target: z.string().max(500).nullish(),
  planned_format: contentFormatEnum.nullish(),
  priority: priorityEnum.default("medium"),
  desired_publish_date: z.string().nullish(),
  owner_id: z.string().uuid().nullish(),
});

export const updateContentIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  angle: z.string().max(2000).nullish(),
  promise: z.string().max(2000).nullish(),
  hook: z.string().max(2000).nullish(),
  notes: z.string().max(10000).nullish(),
  target: z.string().max(500).nullish(),
  planned_format: contentFormatEnum.nullish(),
  priority: priorityEnum.optional(),
  desired_publish_date: z.string().nullish(),
  owner_id: z.string().uuid().nullish(),
  status: ideaStatusEnum.optional(),
});

export const contentIdeaSearchSchema = z.object({
  query: z.string().default(""),
  status: ideaStatusEnum.optional(),
  priority: priorityEnum.optional(),
  planned_format: contentFormatEnum.optional(),
  owner_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================================
// content_pieces
// ============================================================================

export const createContentPieceSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  format: contentFormatEnum,
  status: contentStatusEnum.default("idea"),
  summary: z.string().max(5000).nullish(),
  target_audience: z.string().max(500).nullish(),
  priority: priorityEnum.default("medium"),
  owner_id: z.string().uuid().nullish(),
  scheduled_date: z.string().nullish(),
  published_at: z.string().datetime().nullish(),
  published_url: z.string().url().max(2000).nullish(),
  idea_id: z.string().uuid().nullish(),
});

export const updateContentPieceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  format: contentFormatEnum.optional(),
  status: contentStatusEnum.optional(),
  summary: z.string().max(5000).nullish(),
  target_audience: z.string().max(500).nullish(),
  priority: priorityEnum.optional(),
  owner_id: z.string().uuid().nullish(),
  position: z.number().int().optional(),
  scheduled_date: z.string().nullish(),
  published_at: z.string().datetime().nullish(),
  published_url: z.string().url().max(2000).nullish(),
});

// Deplacement kanban (drag & drop) : changement de statut + reordonnancement
export const moveContentPieceSchema = z.object({
  status: contentStatusEnum,
  position: z.number().int().min(0),
});

// Conversion d'une idee en content piece
export const convertIdeaSchema = z.object({
  idea_id: z.string().uuid(),
  format: contentFormatEnum,
  title: z.string().min(1).max(200).optional(),
});

export const contentPieceSearchSchema = z.object({
  query: z.string().default(""),
  status: contentStatusEnum.optional(),
  format: contentFormatEnum.optional(),
  owner_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================================
// content_scripts (upsert : un script par contenu)
// ============================================================================

export const upsertContentScriptSchema = z.object({
  content_piece_id: z.string().uuid(),
  hook: z.string().max(5000).nullish(),
  intro: z.string().max(10000).nullish(),
  structure: z.string().max(50000).nullish(),
  key_points: z.string().max(20000).nullish(),
  cta: z.string().max(5000).nullish(),
  shooting_notes: z.string().max(20000).nullish(),
  short_version: z.string().max(50000).nullish(),
  long_version: z.string().max(100000).nullish(),
});

// ============================================================================
// deliverables
// ============================================================================

export const createDeliverableSchema = z.object({
  content_piece_id: z.string().uuid(),
  title: z.string().min(1, "Le titre est requis").max(200),
  format: contentFormatEnum,
  channel: publicationChannelEnum.nullish(),
  status: deliverableStatusEnum.default("planned"),
  owner_id: z.string().uuid().nullish(),
  scheduled_date: z.string().nullish(),
  published_at: z.string().datetime().nullish(),
  published_url: z.string().url().max(2000).nullish(),
});

export const updateDeliverableSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  format: contentFormatEnum.optional(),
  channel: publicationChannelEnum.nullish(),
  status: deliverableStatusEnum.optional(),
  owner_id: z.string().uuid().nullish(),
  position: z.number().int().optional(),
  scheduled_date: z.string().nullish(),
  published_at: z.string().datetime().nullish(),
  published_url: z.string().url().max(2000).nullish(),
});

// ============================================================================
// content_assets
// ============================================================================

export const createContentAssetSchema = z
  .object({
    content_piece_id: z.string().uuid().nullish(),
    deliverable_id: z.string().uuid().nullish(),
    document_id: z.string().uuid().nullish(),
    external_url: z.string().url().max(2000).nullish(),
    role: assetRoleEnum,
    version_label: z.string().max(100).nullish(),
    is_final: z.boolean().default(false),
  })
  .refine((data) => data.content_piece_id != null || data.deliverable_id != null, {
    message: "L'asset doit etre rattache a un contenu ou un livrable",
    path: ["content_piece_id"],
  })
  .refine((data) => data.document_id != null || data.external_url != null, {
    message: "L'asset doit avoir un fichier ou un lien externe",
    path: ["document_id"],
  });

export const updateContentAssetSchema = z.object({
  role: assetRoleEnum.optional(),
  version_label: z.string().max(100).nullish(),
  is_final: z.boolean().optional(),
  external_url: z.string().url().max(2000).nullish(),
});

// ============================================================================
// content_checklist_items
// ============================================================================

export const createChecklistItemSchema = z.object({
  content_piece_id: z.string().uuid(),
  label: z.string().min(1, "Le libelle est requis").max(300),
  position: z.number().int().min(0).optional(),
});

export const updateChecklistItemSchema = z.object({
  label: z.string().min(1).max(300).optional(),
  position: z.number().int().min(0).optional(),
  is_done: z.boolean().optional(),
});

// ============================================================================
// content_templates — JSONB embarques (valides a l'ecriture ET a l'application)
// ============================================================================

// script_skeleton : tous les champs optionnels, alignes sur content_scripts.
export const scriptSkeletonSchema = z.object({
  hook: z.string().max(5000).optional(),
  intro: z.string().max(10000).optional(),
  structure: z.string().max(50000).optional(),
  key_points: z.string().max(20000).optional(),
  cta: z.string().max(5000).optional(),
  shooting_notes: z.string().max(20000).optional(),
});

// checklist_items : libelles ordonnes.
export const checklistItemsSchema = z.array(z.string().min(1).max(300)).max(100);

// deliverable_specs : declinaisons a generer a l'application du template.
// offset_days = decalage (en jours) de scheduled_date par rapport a la piece.
export const deliverableSpecSchema = z.object({
  title: z.string().min(1).max(200),
  format: contentFormatEnum,
  channel: publicationChannelEnum.optional(),
  status: deliverableStatusEnum.optional(),
  offset_days: z.number().int().min(0).max(365).optional(),
});

export const deliverableSpecsSchema = z.array(deliverableSpecSchema).max(50);

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(2000).nullish(),
  format: contentFormatEnum,
  target_audience: z.string().max(500).nullish(),
  default_priority: priorityEnum.default("medium"),
  script_skeleton: scriptSkeletonSchema.nullish(),
  checklist_items: checklistItemsSchema.default([]),
  deliverable_specs: deliverableSpecsSchema.default([]),
  is_active: z.boolean().default(true),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  format: contentFormatEnum.optional(),
  target_audience: z.string().max(500).nullish(),
  default_priority: priorityEnum.optional(),
  script_skeleton: scriptSkeletonSchema.nullish(),
  checklist_items: checklistItemsSchema.optional(),
  deliverable_specs: deliverableSpecsSchema.optional(),
  is_active: z.boolean().optional(),
});

// Application d'un template -> rpc('apply_content_template', ...).
// Aucun org/user : l'autorite est derivee du contexte d'auth cote PG.
export const applyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  title: z.string().min(1, "Le titre est requis").max(200),
  scheduled_date: z.string().nullish(),
});

// ============================================================================
// content_pieces — blocage manuel + validation
// ============================================================================

export const updateBlockedSchema = z.object({
  is_blocked: z.boolean(),
  blocked_reason: z.string().max(2000).nullish(),
});

// ============================================================================
// Types derives
// ============================================================================

export type CreateContentIdeaInput = z.infer<typeof createContentIdeaSchema>;
export type UpdateContentIdeaInput = z.infer<typeof updateContentIdeaSchema>;
export type ContentIdeaSearchInput = z.infer<typeof contentIdeaSearchSchema>;

export type CreateContentPieceInput = z.infer<typeof createContentPieceSchema>;
export type UpdateContentPieceInput = z.infer<typeof updateContentPieceSchema>;
export type MoveContentPieceInput = z.infer<typeof moveContentPieceSchema>;
export type ConvertIdeaInput = z.infer<typeof convertIdeaSchema>;
export type ContentPieceSearchInput = z.infer<typeof contentPieceSearchSchema>;

export type UpsertContentScriptInput = z.infer<typeof upsertContentScriptSchema>;

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;

export type CreateContentAssetInput = z.infer<typeof createContentAssetSchema>;
export type UpdateContentAssetInput = z.infer<typeof updateContentAssetSchema>;

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export type ScriptSkeleton = z.infer<typeof scriptSkeletonSchema>;
export type DeliverableSpec = z.infer<typeof deliverableSpecSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type UpdateBlockedInput = z.infer<typeof updateBlockedSchema>;
