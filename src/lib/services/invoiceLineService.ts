import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateInvoiceLineInput, UpdateInvoiceLineInput } from "@/lib/schemas/invoice";

// --- Helper : verifier que la facture est en brouillon ---

async function assertInvoiceIsDraft(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  invoiceId: string,
) {
  const { data } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .eq("organization_id", orgId);

  if (!data || data.length === 0) throw new Error("Facture introuvable");
  if (data[0].status !== "draft") {
    throw new Error("Modification impossible : la facture n'est plus en brouillon");
  }
}

// --- Liste des lignes d'une facture (ordonnees par position) ---

export async function getInvoiceLines(orgId: string, invoiceId: string) {
  const supabase = await createServerSupabaseClient();

  // Verifier l'acces a la facture via organization_id
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .eq("organization_id", orgId);

  if (!invoices || invoices.length === 0) throw new Error("Facture introuvable");

  const { data, error } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// --- Ajout d'une ligne (uniquement si brouillon) ---

export async function addInvoiceLine(
  orgId: string,
  invoiceId: string,
  input: CreateInvoiceLineInput,
) {
  const supabase = await createServerSupabaseClient();
  await assertInvoiceIsDraft(supabase, orgId, invoiceId);

  const { data, error } = await supabase
    .from("invoice_lines")
    .insert({ ...input, invoice_id: invoiceId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Invoice line creation failed");
  return data[0];
}

// --- Mise a jour d'une ligne (uniquement si facture en brouillon) ---

export async function updateInvoiceLine(
  orgId: string,
  invoiceId: string,
  lineId: string,
  input: UpdateInvoiceLineInput,
) {
  const supabase = await createServerSupabaseClient();
  await assertInvoiceIsDraft(supabase, orgId, invoiceId);

  const { data, error } = await supabase
    .from("invoice_lines")
    .update(input)
    .eq("id", lineId)
    .eq("invoice_id", invoiceId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Ligne introuvable");
  return data[0];
}

// --- Suppression d'une ligne (uniquement si facture en brouillon) ---

export async function deleteInvoiceLine(orgId: string, invoiceId: string, lineId: string) {
  const supabase = await createServerSupabaseClient();
  await assertInvoiceIsDraft(supabase, orgId, invoiceId);

  const { error } = await supabase
    .from("invoice_lines")
    .delete()
    .eq("id", lineId)
    .eq("invoice_id", invoiceId);
  if (error) throw error;
}

// --- Reordonnancement des lignes ---

export async function reorderInvoiceLines(orgId: string, invoiceId: string, lineIds: string[]) {
  const supabase = await createServerSupabaseClient();
  await assertInvoiceIsDraft(supabase, orgId, invoiceId);

  // Mettre a jour la position de chaque ligne
  const updates = lineIds.map((id, index) =>
    supabase
      .from("invoice_lines")
      .update({ position: index })
      .eq("id", id)
      .eq("invoice_id", invoiceId),
  );

  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}
