import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreatePaymentInput } from "@/lib/schemas/payment";
import type { Payment } from "@/types/database";
import * as activityService from "./activityService";

// --- Liste des paiements d'une facture ---

export async function getPaymentsByInvoice(orgId: string, invoiceId: string): Promise<Payment[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Payment[];
}

// --- Paiements recents (pour dashboard) ---

export async function getRecentPayments(
  orgId: string,
  limit = 5,
): Promise<(Payment & { invoice_reference: string | null; company_name: string | null })[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, invoices!inner(reference, companies!inner(name))")
    .eq("organization_id", orgId)
    .order("payment_date", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Aplatir les jointures
  return (data ?? []).map((row) => {
    const invoice = row.invoices as {
      reference: string | null;
      companies: { name: string };
    } | null;
    return {
      ...row,
      invoices: undefined,
      invoice_reference: invoice?.reference ?? null,
      company_name: invoice?.companies?.name ?? null,
    } as Payment & { invoice_reference: string | null; company_name: string | null };
  });
}

// --- Creation d'un paiement ---

export async function createPayment(
  orgId: string,
  userId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  const supabase = await createServerSupabaseClient();

  // Verifier que la facture est dans un statut qui accepte les paiements
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status, total_ttc, paid_amount")
    .eq("organization_id", orgId)
    .eq("id", input.invoice_id)
    .is("deleted_at", null);

  if (invoiceError) throw invoiceError;
  if (!invoiceData || invoiceData.length === 0) throw new Error("Facture introuvable");

  const invoice = invoiceData[0];
  const validStatuses = ["sent", "partial", "overdue"];
  if (!validStatuses.includes(invoice.status as string)) {
    throw new Error(`Paiement impossible avec le statut : ${invoice.status}`);
  }

  // Verifier que le montant ne depasse pas le reste a payer
  const remaining = (invoice.total_ttc as number) - (invoice.paid_amount as number);
  if (input.amount > remaining) {
    throw new Error(`Le montant (${input.amount}) depasse le reste a payer (${remaining})`);
  }

  // Inserer le paiement (le trigger recalcule paid_amount + statut)
  const { data, error } = await supabase
    .from("payments")
    .insert({
      organization_id: orgId,
      invoice_id: input.invoice_id,
      amount: input.amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Erreur creation paiement");

  await activityService.log(orgId, {
    entityType: "invoice",
    entityId: input.invoice_id,
    action: "payment_created",
    metadata: {
      payment_id: data[0].id,
      amount: input.amount,
      payment_method: input.payment_method,
      reference: input.reference,
    },
  });

  return data[0] as Payment;
}

// --- Suppression d'un paiement ---

export async function deletePayment(orgId: string, paymentId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Charger le paiement pour le log
  const { data: paymentData, error: fetchError } = await supabase
    .from("payments")
    .select("id, invoice_id, amount, payment_method")
    .eq("organization_id", orgId)
    .eq("id", paymentId);

  if (fetchError) throw fetchError;
  if (!paymentData || paymentData.length === 0) throw new Error("Paiement introuvable");

  const payment = paymentData[0];

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("organization_id", orgId)
    .eq("id", paymentId);

  if (error) throw error;

  await activityService.log(orgId, {
    entityType: "invoice",
    entityId: payment.invoice_id as string,
    action: "payment_deleted",
    metadata: {
      payment_id: paymentId,
      amount: payment.amount,
      payment_method: payment.payment_method,
    },
  });
}

// --- Stats financieres (pour dashboard) ---

export async function getPaymentStats(orgId: string): Promise<{
  totalReceivable: number;
  monthPayments: number;
  avgDso: number;
}> {
  const supabase = await createServerSupabaseClient();

  // Total a encaisser : somme (total_ttc - paid_amount) des factures non payees
  const { data: receivableData, error: receivableError } = await supabase
    .from("invoices")
    .select("total_ttc, paid_amount")
    .eq("organization_id", orgId)
    .in("status", ["sent", "partial", "overdue"])
    .is("deleted_at", null);

  if (receivableError) throw receivableError;

  const totalReceivable = (receivableData ?? []).reduce(
    (sum, inv) => sum + ((inv.total_ttc as number) - (inv.paid_amount as number)),
    0,
  );

  // Paiements du mois en cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthData, error: monthError } = await supabase
    .from("payments")
    .select("amount")
    .eq("organization_id", orgId)
    .gte("payment_date", startOfMonth.toISOString().split("T")[0]);

  if (monthError) throw monthError;

  const monthPayments = (monthData ?? []).reduce((sum, p) => sum + (p.amount as number), 0);

  // DSO moyen : jours entre sent_at et paid_at des factures payees
  const { data: dsoData, error: dsoError } = await supabase
    .from("invoices")
    .select("sent_at, paid_at")
    .eq("organization_id", orgId)
    .eq("status", "paid")
    .is("deleted_at", null)
    .not("sent_at", "is", null)
    .not("paid_at", "is", null);

  if (dsoError) throw dsoError;

  let avgDso = 0;
  if (dsoData && dsoData.length > 0) {
    const totalDays = dsoData.reduce((sum, inv) => {
      const sent = new Date(inv.sent_at as string);
      const paid = new Date(inv.paid_at as string);
      return sum + Math.max(0, Math.floor((paid.getTime() - sent.getTime()) / 86400000));
    }, 0);
    avgDso = Math.round(totalDays / dsoData.length);
  }

  return { totalReceivable, monthPayments, avgDso };
}
