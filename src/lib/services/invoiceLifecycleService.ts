import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceStatus } from "@/lib/schemas/invoice";
import { ALLOWED_INVOICE_TRANSITIONS } from "./invoiceTransitions";
import * as activityService from "./activityService";

// --- Helper interne : charger une facture et verifier la transition ---

interface InvoiceState {
  id: string;
  status: InvoiceStatus;
  organization_id: string;
  total_ttc: number;
  paid_amount: number;
  is_credit_note: boolean;
}

async function fetchInvoiceAndCheckTransition(
  orgId: string,
  invoiceId: string,
  targetStatus: InvoiceStatus,
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, status, organization_id, total_ttc, paid_amount, is_credit_note")
    .eq("organization_id", orgId)
    .eq("id", invoiceId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Facture introuvable");

  const invoice = data[0] as InvoiceState;
  const allowed = ALLOWED_INVOICE_TRANSITIONS[invoice.status] ?? [];

  if (!allowed.includes(targetStatus)) {
    throw new Error(`Transition impossible : ${invoice.status} -> ${targetStatus}`);
  }

  return { supabase, invoice };
}

// --- Transition generique ---

async function transitionInvoice(
  orgId: string,
  invoiceId: string,
  targetStatus: InvoiceStatus,
  extraFields: Record<string, unknown> = {},
  activityAction: string,
  metadata: Record<string, unknown> = {},
) {
  const { supabase, invoice } = await fetchInvoiceAndCheckTransition(
    orgId,
    invoiceId,
    targetStatus,
  );

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: targetStatus, ...extraFields })
    .eq("organization_id", orgId)
    .eq("id", invoiceId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Facture introuvable");

  await activityService.log(orgId, {
    entityType: "invoice",
    entityId: invoiceId,
    action: activityAction,
    metadata: { from: invoice.status, to: targetStatus, ...metadata },
  });

  return data[0];
}

// --- draft -> validated ---

export async function validateInvoice(orgId: string, invoiceId: string) {
  const supabase = await createServerSupabaseClient();

  // Verifier l'appartenance a l'org avant de lire les lignes
  const { data: invoiceCheck } = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", invoiceId)
    .is("deleted_at", null);
  if (!invoiceCheck || invoiceCheck.length === 0) throw new Error("Facture introuvable");

  // Verifier qu'il y a au moins une ligne avec un total > 0
  const { data: lines, error: linesError } = await supabase
    .from("invoice_lines")
    .select("line_total_ht")
    .eq("invoice_id", invoiceId);

  if (linesError) throw linesError;
  if (!lines || lines.length === 0) {
    throw new Error("La facture doit contenir au moins une ligne");
  }

  const totalHt = lines.reduce((sum, line) => sum + ((line.line_total_ht as number) ?? 0), 0);
  if (totalHt <= 0) {
    throw new Error("Le total HT doit etre superieur a 0");
  }

  // Generer la reference via RPC
  const { data: refData, error: refError } = await supabase.rpc("generate_invoice_reference", {
    p_org_id: orgId,
  });
  if (refError) throw refError;

  return transitionInvoice(
    orgId,
    invoiceId,
    "validated",
    { reference: refData, issued_at: new Date().toISOString() },
    "invoice_validated",
  );
}

// --- validated -> sent ---

export async function sendInvoice(orgId: string, invoiceId: string) {
  return transitionInvoice(
    orgId,
    invoiceId,
    "sent",
    { sent_at: new Date().toISOString() },
    "invoice_sent",
  );
}

// --- Paiements ---
// SUPPRIME : recordPayment() — remplace par paymentService.createPayment() + trigger SQL
// Les paiements passent desormais par la table payments avec recalcul automatique via trigger

// --- sent/partial -> overdue ---

export async function markOverdue(orgId: string, invoiceId: string) {
  return transitionInvoice(orgId, invoiceId, "overdue", {}, "invoice_overdue");
}

// --- Annulation avec gestion avoir ---

export async function cancelInvoice(orgId: string, invoiceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", invoiceId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Facture introuvable");

  const invoice = data[0];

  // Si brouillon : passer en cancelled + soft delete (statut conserve si restauration)
  if (invoice.status === "draft") {
    const { error: delError } = await supabase
      .from("invoices")
      .update({
        status: "cancelled" as const,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .eq("id", invoiceId);
    if (delError) throw delError;
    return null;
  }

  // Verifier que la transition est autorisee
  const allowed = ALLOWED_INVOICE_TRANSITIONS[invoice.status as InvoiceStatus] ?? [];
  if (!allowed.includes("cancelled")) {
    throw new Error(`Annulation impossible avec le statut : ${invoice.status}`);
  }

  // Appel RPC transactionnel (atomique : creer avoir + copier lignes + annuler facture)
  const { data: creditNoteId, error: rpcError } = await supabase.rpc(
    "cancel_invoice_with_credit_note",
    {
      p_org_id: orgId,
      p_invoice_id: invoiceId,
    },
  );

  if (rpcError) throw rpcError;
  if (!creditNoteId) throw new Error("Credit note creation failed");

  // Charger les resultats (pas de filtre deleted_at ici : la facture annulee reste visible)
  const { data: cancelledInvoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", invoiceId);

  const { data: creditNote } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", creditNoteId as string);

  await activityService.log(orgId, {
    entityType: "invoice",
    entityId: invoiceId,
    action: "invoice_cancelled",
    metadata: { credit_note_id: creditNoteId },
  });

  return {
    cancelled: cancelledInvoice?.[0] ?? null,
    creditNote: creditNote?.[0] ?? null,
  };
}
