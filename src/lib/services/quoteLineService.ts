import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateQuoteLineInput, UpdateQuoteLineInput } from "@/lib/schemas/quote";

// --- Helper : verifier que le devis est en brouillon ---

async function assertQuoteIsDraft(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  quoteId: string,
) {
  const { data } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("organization_id", orgId);

  if (!data || data.length === 0) throw new Error("Devis introuvable");
  if (data[0].status !== "draft") {
    throw new Error("Modification impossible : le devis n'est plus en brouillon");
  }
}

// --- Liste des lignes d'un devis (ordonnees par position) ---

export async function getQuoteLines(orgId: string, quoteId: string) {
  const supabase = await createServerSupabaseClient();

  // Verifier l'acces au devis via organization_id
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("organization_id", orgId);

  if (!quotes || quotes.length === 0) throw new Error("Devis introuvable");

  const { data, error } = await supabase
    .from("quote_lines")
    .select("*")
    .eq("quote_id", quoteId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// --- Ajout d'une ligne (uniquement si brouillon) ---

export async function addQuoteLine(orgId: string, quoteId: string, input: CreateQuoteLineInput) {
  const supabase = await createServerSupabaseClient();
  await assertQuoteIsDraft(supabase, orgId, quoteId);

  const { data, error } = await supabase
    .from("quote_lines")
    .insert({ ...input, quote_id: quoteId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Quote line creation failed");
  return data[0];
}

// --- Mise a jour d'une ligne (uniquement si devis en brouillon) ---

export async function updateQuoteLine(
  orgId: string,
  quoteId: string,
  lineId: string,
  input: UpdateQuoteLineInput,
) {
  const supabase = await createServerSupabaseClient();
  await assertQuoteIsDraft(supabase, orgId, quoteId);

  const { data, error } = await supabase
    .from("quote_lines")
    .update(input)
    .eq("id", lineId)
    .eq("quote_id", quoteId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Ligne introuvable");
  return data[0];
}

// --- Suppression d'une ligne (uniquement si devis en brouillon) ---

export async function deleteQuoteLine(orgId: string, quoteId: string, lineId: string) {
  const supabase = await createServerSupabaseClient();
  await assertQuoteIsDraft(supabase, orgId, quoteId);

  const { error } = await supabase
    .from("quote_lines")
    .delete()
    .eq("id", lineId)
    .eq("quote_id", quoteId);
  if (error) throw error;
}

// --- Reordonnancement des lignes ---

export async function reorderQuoteLines(orgId: string, quoteId: string, lineIds: string[]) {
  const supabase = await createServerSupabaseClient();
  await assertQuoteIsDraft(supabase, orgId, quoteId);

  // Mettre a jour la position de chaque ligne
  const updates = lineIds.map((id, index) =>
    supabase.from("quote_lines").update({ position: index }).eq("id", id).eq("quote_id", quoteId),
  );

  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

// --- Ajout depuis un produit du catalogue ---

export async function addFromProduct(
  orgId: string,
  quoteId: string,
  productId: string,
  quantity: number,
) {
  const supabase = await createServerSupabaseClient();
  await assertQuoteIsDraft(supabase, orgId, quoteId);

  // Charger le produit
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("organization_id", orgId);

  if (prodError) throw prodError;
  if (!products || products.length === 0) throw new Error("Produit introuvable");

  const product = products[0];

  // Determiner la prochaine position
  const { data: existingLines } = await supabase
    .from("quote_lines")
    .select("position")
    .eq("quote_id", quoteId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existingLines && existingLines.length > 0 ? (existingLines[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("quote_lines")
    .insert({
      quote_id: quoteId,
      product_id: productId,
      description: product.name as string,
      quantity,
      unit: (product.unit as string) ?? "unite",
      unit_price: product.unit_price as number,
      vat_rate: product.vat_rate as number,
      discount_percent: 0,
      position: nextPosition,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Quote line creation failed");
  return data[0];
}
