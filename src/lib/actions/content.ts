"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember, requireAdmin } from "./helpers";
import * as contentIdeaService from "@/lib/services/contentIdeaService";
import * as contentPieceService from "@/lib/services/contentPieceService";
import * as contentPieceReadService from "@/lib/services/contentPieceReadService";
import * as contentScriptService from "@/lib/services/contentScriptService";
import * as deliverableService from "@/lib/services/deliverableService";
import * as contentAssetService from "@/lib/services/contentAssetService";
import * as contentChecklistService from "@/lib/services/contentChecklistService";
import * as contentCalendarService from "@/lib/services/contentCalendarService";
import * as contentTemplateService from "@/lib/services/contentTemplateService";
import {
  createContentIdeaSchema,
  updateContentIdeaSchema,
  createContentPieceSchema,
  updateContentPieceSchema,
  moveContentPieceSchema,
  convertIdeaSchema,
  upsertContentScriptSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
  createContentAssetSchema,
  updateContentAssetSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  createTemplateSchema,
  updateTemplateSchema,
  applyTemplateSchema,
  updateBlockedSchema,
  type CreateContentIdeaInput,
  type UpdateContentIdeaInput,
  type ContentIdeaSearchInput,
  type CreateContentPieceInput,
  type UpdateContentPieceInput,
  type MoveContentPieceInput,
  type ConvertIdeaInput,
  type ContentPieceSearchInput,
  type UpsertContentScriptInput,
  type CreateDeliverableInput,
  type UpdateDeliverableInput,
  type CreateContentAssetInput,
  type UpdateContentAssetInput,
  type CreateChecklistItemInput,
  type UpdateChecklistItemInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type ApplyTemplateInput,
  type UpdateBlockedInput,
} from "@/lib/schemas/content";

// ============================================================================
// Idees
// ============================================================================

export async function fetchContentIdeas(params?: ContentIdeaSearchInput) {
  const { organizationId } = await getAuthContext();
  return contentIdeaService.getContentIdeas(organizationId, params);
}

export async function fetchContentIdea(ideaId: string) {
  const { organizationId } = await getAuthContext();
  return contentIdeaService.getContentIdea(organizationId, ideaId);
}

export async function createContentIdeaAction(input: CreateContentIdeaInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createContentIdeaSchema.parse(input);
  const idea = await contentIdeaService.createContentIdea(organizationId, userId, validated);
  revalidatePath("/studio/ideas");
  return idea;
}

export async function updateContentIdeaAction(ideaId: string, input: UpdateContentIdeaInput) {
  const { organizationId, userId } = await requireMember();
  const validated = updateContentIdeaSchema.parse(input);
  const idea = await contentIdeaService.updateContentIdea(
    organizationId,
    userId,
    ideaId,
    validated,
  );
  revalidatePath("/studio/ideas");
  return idea;
}

export async function deleteContentIdeaAction(ideaId: string) {
  const { organizationId, userId } = await requireAdmin();
  await contentIdeaService.deleteContentIdea(organizationId, userId, ideaId);
  revalidatePath("/studio/ideas");
}

// ============================================================================
// Content pieces
// ============================================================================

export async function fetchContentPieces(params?: ContentPieceSearchInput) {
  const { organizationId } = await getAuthContext();
  return contentPieceReadService.getContentPieces(organizationId, params);
}

export async function fetchBoardPieces() {
  const { organizationId } = await getAuthContext();
  return contentPieceReadService.getBoardPieces(organizationId);
}

export async function fetchContentPiece(pieceId: string) {
  const { organizationId } = await getAuthContext();
  return contentPieceReadService.getContentPiece(organizationId, pieceId);
}

export async function createContentPieceAction(input: CreateContentPieceInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createContentPieceSchema.parse(input);
  const piece = await contentPieceService.createContentPiece(organizationId, userId, validated);
  revalidatePath("/studio/board");
  return piece;
}

export async function convertIdeaAction(input: ConvertIdeaInput) {
  const { organizationId, userId } = await requireMember();
  const validated = convertIdeaSchema.parse(input);
  const piece = await contentPieceService.convertIdeaToPiece(organizationId, userId, validated);
  revalidatePath("/studio/board");
  revalidatePath("/studio/ideas");
  return piece;
}

export async function updateContentPieceAction(pieceId: string, input: UpdateContentPieceInput) {
  const { organizationId, userId } = await requireMember();
  const validated = updateContentPieceSchema.parse(input);
  const piece = await contentPieceService.updateContentPiece(
    organizationId,
    userId,
    pieceId,
    validated,
  );
  revalidatePath("/studio/board");
  revalidatePath(`/studio/content/${pieceId}`);
  return piece;
}

export async function moveContentPieceAction(pieceId: string, input: MoveContentPieceInput) {
  const { organizationId, userId } = await requireMember();
  const validated = moveContentPieceSchema.parse(input);
  const piece = await contentPieceService.moveContentPiece(
    organizationId,
    userId,
    pieceId,
    validated,
  );
  revalidatePath("/studio/board");
  return piece;
}

export async function deleteContentPieceAction(pieceId: string) {
  const { organizationId, userId } = await requireAdmin();
  await contentPieceService.deleteContentPiece(organizationId, userId, pieceId);
  revalidatePath("/studio/board");
}

// --- Blocage / validation ---

export async function blockPieceAction(pieceId: string, input: UpdateBlockedInput) {
  const { organizationId, userId } = await requireMember();
  const validated = updateBlockedSchema.parse(input);
  const piece = await contentPieceService.setBlockedState(
    organizationId,
    userId,
    pieceId,
    validated,
  );
  revalidatePath("/studio/board");
  revalidatePath(`/studio/content/${pieceId}`);
  return piece;
}

export async function unblockPieceAction(pieceId: string) {
  const { organizationId, userId } = await requireMember();
  const piece = await contentPieceService.setBlockedState(organizationId, userId, pieceId, {
    is_blocked: false,
  });
  revalidatePath("/studio/board");
  revalidatePath(`/studio/content/${pieceId}`);
  return piece;
}

export async function validatePieceAction(pieceId: string) {
  const { organizationId, userId } = await requireMember();
  const piece = await contentPieceService.validatePiece(organizationId, userId, pieceId);
  revalidatePath("/studio/board");
  revalidatePath(`/studio/content/${pieceId}`);
  return piece;
}

// ============================================================================
// Script
// ============================================================================

export async function fetchScript(contentPieceId: string) {
  const { organizationId } = await getAuthContext();
  return contentScriptService.getScript(organizationId, contentPieceId);
}

export async function upsertScriptAction(input: UpsertContentScriptInput) {
  const { organizationId, userId } = await requireMember();
  const validated = upsertContentScriptSchema.parse(input);
  const script = await contentScriptService.upsertScript(organizationId, userId, validated);
  revalidatePath(`/studio/content/${input.content_piece_id}`);
  return script;
}

// ============================================================================
// Deliverables
// ============================================================================

export async function fetchDeliverables(contentPieceId: string) {
  const { organizationId } = await getAuthContext();
  return deliverableService.getDeliverablesForPiece(organizationId, contentPieceId);
}

export async function createDeliverableAction(input: CreateDeliverableInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createDeliverableSchema.parse(input);
  const deliverable = await deliverableService.createDeliverable(organizationId, userId, validated);
  revalidatePath(`/studio/content/${input.content_piece_id}`);
  return deliverable;
}

export async function updateDeliverableAction(
  deliverableId: string,
  contentPieceId: string,
  input: UpdateDeliverableInput,
) {
  const { organizationId, userId } = await requireMember();
  const validated = updateDeliverableSchema.parse(input);
  const deliverable = await deliverableService.updateDeliverable(
    organizationId,
    userId,
    deliverableId,
    validated,
  );
  revalidatePath(`/studio/content/${contentPieceId}`);
  return deliverable;
}

export async function deleteDeliverableAction(deliverableId: string, contentPieceId: string) {
  const { organizationId, userId } = await requireAdmin();
  await deliverableService.deleteDeliverable(organizationId, userId, deliverableId);
  revalidatePath(`/studio/content/${contentPieceId}`);
}

// ============================================================================
// Assets
// ============================================================================

export async function fetchAssets(contentPieceId: string) {
  const { organizationId } = await getAuthContext();
  return contentAssetService.getAssetsForPiece(organizationId, contentPieceId);
}

export async function createAssetAction(input: CreateContentAssetInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createContentAssetSchema.parse(input);
  const asset = await contentAssetService.createAsset(organizationId, userId, validated);
  if (input.content_piece_id) revalidatePath(`/studio/content/${input.content_piece_id}`);
  return asset;
}

export async function updateAssetAction(
  assetId: string,
  contentPieceId: string,
  input: UpdateContentAssetInput,
) {
  const { organizationId, userId } = await requireMember();
  const validated = updateContentAssetSchema.parse(input);
  const asset = await contentAssetService.updateAsset(organizationId, userId, assetId, validated);
  revalidatePath(`/studio/content/${contentPieceId}`);
  return asset;
}

export async function deleteAssetAction(assetId: string, contentPieceId: string) {
  const { organizationId } = await requireMember();
  await contentAssetService.deleteAsset(organizationId, assetId);
  revalidatePath(`/studio/content/${contentPieceId}`);
}

// ============================================================================
// Checklist
// ============================================================================

export async function fetchChecklist(contentPieceId: string) {
  const { organizationId } = await getAuthContext();
  return contentChecklistService.getChecklist(organizationId, contentPieceId);
}

export async function createChecklistItemAction(input: CreateChecklistItemInput) {
  const { organizationId } = await requireMember();
  const validated = createChecklistItemSchema.parse(input);
  const item = await contentChecklistService.createChecklistItem(organizationId, validated);
  revalidatePath(`/studio/content/${input.content_piece_id}`);
  return item;
}

export async function updateChecklistItemAction(
  itemId: string,
  contentPieceId: string,
  input: UpdateChecklistItemInput,
) {
  const { organizationId } = await requireMember();
  const validated = updateChecklistItemSchema.parse(input);
  const item = await contentChecklistService.updateChecklistItem(organizationId, itemId, validated);
  revalidatePath(`/studio/content/${contentPieceId}`);
  return item;
}

export async function deleteChecklistItemAction(itemId: string, contentPieceId: string) {
  const { organizationId } = await requireMember();
  await contentChecklistService.deleteChecklistItem(organizationId, itemId);
  revalidatePath(`/studio/content/${contentPieceId}`);
}

// ============================================================================
// Calendrier
// ============================================================================

export async function fetchCalendarEntries(from: string, to: string) {
  const { organizationId } = await getAuthContext();
  return contentCalendarService.getCalendarEntries(organizationId, from, to);
}

export async function fetchPublications() {
  const { organizationId } = await getAuthContext();
  return contentCalendarService.getPublications(organizationId);
}

// ============================================================================
// Templates
// ============================================================================

export async function fetchTemplates() {
  const { organizationId } = await getAuthContext();
  return contentTemplateService.getTemplates(organizationId);
}

export async function fetchTemplate(templateId: string) {
  const { organizationId } = await getAuthContext();
  return contentTemplateService.getTemplate(organizationId, templateId);
}

export async function createTemplateAction(input: CreateTemplateInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createTemplateSchema.parse(input);
  const template = await contentTemplateService.createTemplate(organizationId, userId, validated);
  revalidatePath("/studio/templates");
  return template;
}

export async function updateTemplateAction(templateId: string, input: UpdateTemplateInput) {
  const { organizationId, userId } = await requireMember();
  const validated = updateTemplateSchema.parse(input);
  const template = await contentTemplateService.updateTemplate(
    organizationId,
    userId,
    templateId,
    validated,
  );
  revalidatePath("/studio/templates");
  revalidatePath(`/studio/templates/${templateId}`);
  return template;
}

export async function deleteTemplateAction(templateId: string) {
  const { organizationId, userId } = await requireAdmin();
  await contentTemplateService.softDeleteTemplate(organizationId, userId, templateId);
  revalidatePath("/studio/templates");
}

// Application d'un template -> nouvelle piece pre-remplie (org/user derives cote PG)
export async function createPieceFromTemplateAction(input: ApplyTemplateInput) {
  const { organizationId, userId } = await requireMember();
  const validated = applyTemplateSchema.parse(input);
  const piece = await contentTemplateService.applyTemplate(organizationId, userId, validated);
  revalidatePath("/studio/board");
  return piece;
}
