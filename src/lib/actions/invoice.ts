"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as invoiceService from "@/lib/services/invoiceService";
import * as invoiceLifecycleService from "@/lib/services/invoiceLifecycleService";
import * as invoiceLineService from "@/lib/services/invoiceLineService";
import * as quoteToInvoiceService from "@/lib/services/quoteToInvoiceService";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createInvoiceLineSchema,
  updateInvoiceLineSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type InvoiceSearchInput,
  type CreateInvoiceLineInput,
  type UpdateInvoiceLineInput,
} from "@/lib/schemas/invoice";

// ==========================================
// Factures (Invoices)
// ==========================================

// --- Liste des factures avec filtres ---

export async function fetchInvoices(params?: InvoiceSearchInput) {
  const { organizationId } = await getAuthContext();
  return invoiceService.getInvoices(organizationId, params);
}

// --- Detail d'une facture ---

export async function fetchInvoice(invoiceId: string) {
  const { organizationId } = await getAuthContext();
  return invoiceService.getInvoice(organizationId, invoiceId);
}

// --- Creation ---

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createInvoiceSchema.parse(input);
  const invoice = await invoiceService.createInvoice(organizationId, userId, validated);
  revalidatePath("/invoices");
  return invoice;
}

// --- Mise a jour ---

export async function updateInvoiceAction(invoiceId: string, input: UpdateInvoiceInput) {
  const { organizationId } = await requireMember();
  const validated = updateInvoiceSchema.parse(input);
  const invoice = await invoiceService.updateInvoice(organizationId, invoiceId, validated);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return invoice;
}

// --- Suppression ---

export async function deleteInvoiceAction(invoiceId: string) {
  const { organizationId } = await requireMember();
  await invoiceService.deleteInvoice(organizationId, invoiceId);
  revalidatePath("/invoices");
}

// ==========================================
// Cycle de vie de la facture
// ==========================================

// --- Validation (draft -> validated, attribue un numero sequentiel) ---

export async function validateInvoiceAction(invoiceId: string) {
  const { organizationId } = await requireMember();
  const invoice = await invoiceLifecycleService.validateInvoice(organizationId, invoiceId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return invoice;
}

// --- Envoi (validated -> sent) ---

export async function sendInvoiceAction(invoiceId: string) {
  const { organizationId } = await requireMember();
  const invoice = await invoiceLifecycleService.sendInvoice(organizationId, invoiceId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return invoice;
}

// --- Marquage en retard (sent -> overdue) ---

export async function markOverdueAction(invoiceId: string) {
  const { organizationId } = await requireMember();
  const invoice = await invoiceLifecycleService.markOverdue(organizationId, invoiceId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return invoice;
}

// --- Annulation (-> cancelled, obligation legale : jamais supprimee) ---

export async function cancelInvoiceAction(invoiceId: string) {
  const { organizationId } = await requireMember();
  const invoice = await invoiceLifecycleService.cancelInvoice(organizationId, invoiceId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return invoice;
}

// ==========================================
// Conversion devis -> facture
// ==========================================

// --- Cree une facture depuis un devis signe ---

export async function convertQuoteToInvoiceAction(quoteId: string) {
  const { organizationId, userId } = await requireMember();
  const invoice = await quoteToInvoiceService.convertQuoteToInvoice(
    organizationId,
    userId,
    quoteId,
  );
  revalidatePath("/invoices");
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return invoice;
}

// ==========================================
// Lignes de facture (Invoice Lines)
// ==========================================

// --- Liste des lignes d'une facture ---

export async function fetchInvoiceLines(invoiceId: string) {
  const { organizationId } = await getAuthContext();
  return invoiceLineService.getInvoiceLines(organizationId, invoiceId);
}

// --- Ajout d'une ligne ---

export async function addInvoiceLineAction(invoiceId: string, input: CreateInvoiceLineInput) {
  const { organizationId } = await requireMember();
  const validated = createInvoiceLineSchema.parse(input);
  const line = await invoiceLineService.addInvoiceLine(organizationId, invoiceId, validated);
  revalidatePath(`/invoices/${invoiceId}`);
  return line;
}

// --- Mise a jour d'une ligne ---

export async function updateInvoiceLineAction(
  invoiceId: string,
  lineId: string,
  input: UpdateInvoiceLineInput,
) {
  const { organizationId } = await requireMember();
  const validated = updateInvoiceLineSchema.parse(input);
  const line = await invoiceLineService.updateInvoiceLine(
    organizationId,
    invoiceId,
    lineId,
    validated,
  );
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return line;
}

// --- Suppression d'une ligne ---

export async function deleteInvoiceLineAction(invoiceId: string, lineId: string) {
  const { organizationId } = await requireMember();
  await invoiceLineService.deleteInvoiceLine(organizationId, invoiceId, lineId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

// --- Reordonnancement des lignes ---

export async function reorderInvoiceLinesAction(invoiceId: string, lineIds: string[]) {
  const { organizationId } = await requireMember();
  await invoiceLineService.reorderInvoiceLines(organizationId, invoiceId, lineIds);
  revalidatePath(`/invoices/${invoiceId}`);
}
