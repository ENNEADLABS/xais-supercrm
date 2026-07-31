import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateInvoiceLineInput, UpdateInvoiceLineInput } from "@/lib/schemas/invoice";
import type { Product } from "@/types/database";

type InvoiceLineProduct = Pick<Product, "id" | "name" | "unit" | "unit_price" | "vat_rate">;

export function buildInvoiceLineFromProduct(
  invoiceId: string,
  product: InvoiceLineProduct,
  quantity: number,
  position: number,
): CreateInvoiceLineInput {
  return {
    invoice_id: invoiceId,
    product_id: product.id,
    description: product.name,
    quantity,
    unit: product.unit ?? "unite",
    unit_price: product.unit_price,
    discount_percent: 0,
    vat_rate: product.vat_rate,
    position,
  };
}

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

// --- Ajout depuis un produit du catalogue ---

export async function addFromProduct(
  orgId: string,
  invoiceId: string,
  productId: string,
  quantity: number,
) {
  const supabase = await createServerSupabaseClient();
  await assertInvoiceIsDraft(supabase, orgId, invoiceId);

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, unit, unit_price, vat_rate")
    .eq("id", productId)
    .eq("organization_id", orgId);

  if (productError) throw productError;
  if (!products || products.length === 0) throw new Error("Produit introuvable");

  const { data: existingLines } = await supabase
    .from("invoice_lines")
    .select("position")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existingLines?.length ? existingLines[0].position + 1 : 0;
  const input = buildInvoiceLineFromProduct(invoiceId, products[0], quantity, nextPosition);

  const { data, error } = await supabase.from("invoice_lines").insert(input).select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Invoice line creation failed");
  return data[0];
}
