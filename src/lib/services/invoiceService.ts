import { createServerSupabaseClient } from "@/lib/supabase/server";
import { softDeleteRecord } from "@/lib/supabase/softDelete";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceSearchInput,
} from "@/lib/schemas/invoice";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// Re-export des fonctions lifecycle depuis le module dedie
export {
  validateInvoice,
  sendInvoice,
  markOverdue,
  cancelInvoice,
} from "./invoiceLifecycleService";

// --- Liste paginee avec recherche et filtres ---

export async function getInvoices(organizationId: string, params?: InvoiceSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("invoices")
    .select("*, companies(name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (params?.query) {
    query = query.or(
      `subject.ilike.%${escapeLike(params.query)}%,reference.ilike.%${escapeLike(params.query)}%`,
    );
  }
  if (params?.status) query = query.eq("status", params.status);
  if (params?.company_id) query = query.eq("company_id", params.company_id);
  if (params?.deal_id) query = query.eq("deal_id", params.deal_id);
  if (params?.is_credit_note !== undefined) {
    query = query.eq("is_credit_note", params.is_credit_note);
  }
  // Filtre factures en retard : echeance depassee et statut sent ou partial
  if (params?.overdue) {
    query = query
      .lt("due_date", new Date().toISOString().split("T")[0])
      .in("status", ["sent", "partial"]);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// --- Detail d'une facture avec relations ---

export async function getInvoice(organizationId: string, invoiceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*, companies(id, name), contacts(id, first_name, last_name, email), deals(id, name)")
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!invoices || invoices.length === 0) return null;

  // Charger la facture source (devis) si existante
  const invoice = invoices[0];
  let sourceQuote = null;
  if (invoice.source_quote_id) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("id, reference, subject")
      .eq("organization_id", organizationId)
      .eq("id", invoice.source_quote_id as string)
      .is("deleted_at", null);
    if (quotes && quotes.length > 0) sourceQuote = quotes[0];
  }

  // Charger les lignes separement, ordonnees par position
  const { data: lines, error: linesError } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true });

  if (linesError) throw linesError;

  return { ...invoice, source_quote: sourceQuote, lines: lines ?? [] };
}

// --- Creation (toujours en draft) ---

export async function createInvoice(
  organizationId: string,
  userId: string,
  input: CreateInvoiceInput,
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      ...input,
      organization_id: organizationId,
      status: "draft",
      created_by: userId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Invoice creation failed");

  await activityService.log(organizationId, {
    entityType: "invoice",
    entityId: data[0].id as string,
    action: "created",
    actorId: userId,
  });
  return data[0];
}

// --- Mise a jour (uniquement si brouillon) ---

export async function updateInvoice(
  organizationId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
) {
  const supabase = await createServerSupabaseClient();

  // Verifier le statut avant mise a jour
  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .is("deleted_at", null);

  if (!existing || existing.length === 0) throw new Error("Facture introuvable");
  if (existing[0].status !== "draft") {
    throw new Error("Modification impossible : la facture n'est plus en brouillon");
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Facture introuvable");

  await activityService.log(organizationId, {
    entityType: "invoice",
    entityId: invoiceId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });
  return data[0];
}

// --- Suppression (uniquement si brouillon — obligation legale FR) ---

export async function deleteInvoice(organizationId: string, invoiceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .is("deleted_at", null);

  if (!existing || existing.length === 0) throw new Error("Facture introuvable");
  if (existing[0].status !== "draft") {
    throw new Error("Suppression impossible : une facture validee ne peut jamais etre supprimee");
  }

  await softDeleteRecord(supabase, "invoices", organizationId, invoiceId);
}
