"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as quoteService from "@/lib/services/quoteService";
import * as quoteLifecycleService from "@/lib/services/quoteLifecycleService";
import * as quoteLineService from "@/lib/services/quoteLineService";
import {
  createQuoteSchema,
  updateQuoteSchema,
  createQuoteLineSchema,
  updateQuoteLineSchema,
  type CreateQuoteInput,
  type UpdateQuoteInput,
  type QuoteSearchInput,
  type CreateQuoteLineInput,
  type UpdateQuoteLineInput,
} from "@/lib/schemas/quote";

// ==========================================
// Devis (Quotes)
// ==========================================

// --- Liste des devis avec filtres ---

export async function fetchQuotes(params?: QuoteSearchInput) {
  const { organizationId } = await getAuthContext();
  return quoteService.getQuotes(organizationId, params);
}

// --- Detail d'un devis ---

export async function fetchQuote(quoteId: string) {
  const { organizationId } = await getAuthContext();
  return quoteService.getQuote(organizationId, quoteId);
}

// --- Creation ---

export async function createQuoteAction(input: CreateQuoteInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createQuoteSchema.parse(input);
  const quote = await quoteService.createQuote(organizationId, userId, validated);
  revalidatePath("/quotes");
  return quote;
}

// --- Mise a jour ---

export async function updateQuoteAction(quoteId: string, input: UpdateQuoteInput) {
  const { organizationId } = await requireMember();
  const validated = updateQuoteSchema.parse(input);
  const quote = await quoteService.updateQuote(organizationId, quoteId, validated);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// --- Suppression ---

export async function deleteQuoteAction(quoteId: string) {
  const { organizationId } = await requireMember();
  await quoteService.deleteQuote(organizationId, quoteId);
  revalidatePath("/quotes");
}

// ==========================================
// Cycle de vie du devis
// ==========================================

// --- Validation (draft -> validated) ---

export async function validateQuoteAction(quoteId: string) {
  const { organizationId } = await requireMember();
  const quote = await quoteLifecycleService.validateQuote(organizationId, quoteId);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// --- Envoi (validated -> sent) ---

export async function sendQuoteAction(quoteId: string) {
  const { organizationId } = await requireMember();
  const quote = await quoteLifecycleService.sendQuote(organizationId, quoteId);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// --- Signature (sent -> signed) ---

export async function signQuoteAction(quoteId: string) {
  const { organizationId } = await requireMember();
  const quote = await quoteLifecycleService.signQuote(organizationId, quoteId);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// --- Refus (sent -> refused) ---

export async function refuseQuoteAction(quoteId: string, reason?: string) {
  const { organizationId } = await requireMember();
  const quote = await quoteLifecycleService.refuseQuote(organizationId, quoteId, reason);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// --- Annulation (-> cancelled) ---

export async function cancelQuoteAction(quoteId: string) {
  const { organizationId } = await requireMember();
  const quote = await quoteLifecycleService.cancelQuote(organizationId, quoteId);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return quote;
}

// ==========================================
// Lignes de devis (Quote Lines)
// ==========================================

// --- Liste des lignes d'un devis ---

export async function fetchQuoteLines(quoteId: string) {
  const { organizationId } = await getAuthContext();
  return quoteLineService.getQuoteLines(organizationId, quoteId);
}

// --- Ajout d'une ligne ---

export async function addQuoteLineAction(quoteId: string, input: CreateQuoteLineInput) {
  const { organizationId } = await requireMember();
  const validated = createQuoteLineSchema.parse(input);
  const line = await quoteLineService.addQuoteLine(organizationId, quoteId, validated);
  revalidatePath(`/quotes/${quoteId}`);
  return line;
}

// --- Mise a jour d'une ligne ---

export async function updateQuoteLineAction(
  quoteId: string,
  lineId: string,
  input: UpdateQuoteLineInput,
) {
  const { organizationId } = await requireMember();
  const validated = updateQuoteLineSchema.parse(input);
  const line = await quoteLineService.updateQuoteLine(organizationId, quoteId, lineId, validated);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return line;
}

// --- Suppression d'une ligne ---

export async function deleteQuoteLineAction(quoteId: string, lineId: string) {
  const { organizationId } = await requireMember();
  await quoteLineService.deleteQuoteLine(organizationId, quoteId, lineId);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
}

// --- Reordonnancement des lignes ---

export async function reorderQuoteLinesAction(quoteId: string, lineIds: string[]) {
  const { organizationId } = await requireMember();
  await quoteLineService.reorderQuoteLines(organizationId, quoteId, lineIds);
  revalidatePath(`/quotes/${quoteId}`);
}

// --- Ajout depuis un produit ---

export async function addFromProductAction(quoteId: string, productId: string, quantity: number) {
  const { organizationId } = await requireMember();
  const line = await quoteLineService.addFromProduct(organizationId, quoteId, productId, quantity);
  revalidatePath(`/quotes/${quoteId}`);
  return line;
}
