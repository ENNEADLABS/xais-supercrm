"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as paymentService from "@/lib/services/paymentService";
import { createPaymentSchema, type CreatePaymentInput } from "@/lib/schemas/payment";

// --- Liste des paiements d'une facture ---

export async function fetchPaymentsByInvoice(invoiceId: string) {
  const { organizationId } = await getAuthContext();
  return paymentService.getPaymentsByInvoice(organizationId, invoiceId);
}

// --- Creation d'un paiement ---

export async function createPaymentAction(input: CreatePaymentInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createPaymentSchema.parse(input);
  const payment = await paymentService.createPayment(organizationId, userId, validated);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${validated.invoice_id}`);
  revalidatePath("/dashboard");
  return payment;
}

// --- Suppression d'un paiement ---

export async function deletePaymentAction(paymentId: string, invoiceId: string) {
  const { organizationId } = await requireMember();
  await paymentService.deletePayment(organizationId, paymentId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}
