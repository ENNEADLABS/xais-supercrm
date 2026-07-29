import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { softDeleteRecord } from "@/lib/supabase/softDelete";
import type { CreateQuoteInput, UpdateQuoteInput, QuoteSearchInput } from "@/lib/schemas/quote";
import type { Database } from "@/types/database";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// Re-export des fonctions lifecycle depuis le module dedie
export {
  validateQuote,
  sendQuote,
  signQuote,
  refuseQuote,
  cancelQuote,
  applyQuoteTransition,
  QuoteNotFoundError,
  QuoteTransitionError,
} from "./quoteLifecycleService";

// --- Liste paginee avec recherche et filtres ---

export async function getQuotes(organizationId: string, params?: QuoteSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("quotes")
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

  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// --- Liste des devis d'un contact (API bot) ---
// `client` optionnel : par defaut la session cookie de l'utilisateur courant,
// sinon un client injecte (ex. le client robot, cf. src/lib/utils/apiAuth.ts).

export async function getQuotesByContact(
  organizationId: string,
  contactId: string,
  params?: Pick<QuoteSearchInput, "status" | "page" | "per_page">,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;

  let query = supabase
    .from("quotes")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .is("deleted_at", null);

  if (params?.status) query = query.eq("status", params.status);

  query = query.order("created_at", { ascending: false }).range(from, from + perPage - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// --- Detail d'un devis avec relations ---

export async function getQuote(
  organizationId: string,
  quoteId: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*, companies(id, name), contacts(id, first_name, last_name, email), deals(id, name)")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!quotes || quotes.length === 0) return null;

  // Charger les lignes separement, ordonnees par position
  const { data: lines, error: linesError } = await supabase
    .from("quote_lines")
    .select("*")
    .eq("quote_id", quoteId)
    .order("position", { ascending: true });

  if (linesError) throw linesError;

  return { ...quotes[0], lines: lines ?? [] };
}

// --- Creation (toujours en draft) ---

export async function createQuote(organizationId: string, userId: string, input: CreateQuoteInput) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...input,
      organization_id: organizationId,
      status: "draft",
      created_by: userId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Quote creation failed");

  await activityService.log(organizationId, {
    entityType: "quote",
    entityId: data[0].id as string,
    action: "created",
    actorId: userId,
  });
  return data[0];
}

// --- Mise a jour (uniquement si brouillon) ---

export async function updateQuote(
  organizationId: string,
  quoteId: string,
  input: UpdateQuoteInput,
) {
  const supabase = await createServerSupabaseClient();

  // Verifier le statut avant mise a jour
  const { data: existing } = await supabase
    .from("quotes")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .is("deleted_at", null);

  if (!existing || existing.length === 0) throw new Error("Devis introuvable");
  if (existing[0].status !== "draft") {
    throw new Error("Modification impossible : le devis n'est plus en brouillon");
  }

  const { data, error } = await supabase
    .from("quotes")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Devis introuvable");

  await activityService.log(organizationId, {
    entityType: "quote",
    entityId: quoteId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });
  return data[0];
}

// --- Suppression (uniquement si brouillon) ---

export async function deleteQuote(organizationId: string, quoteId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("quotes")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .is("deleted_at", null);

  if (!existing || existing.length === 0) throw new Error("Devis introuvable");
  if (existing[0].status !== "draft") {
    throw new Error("Suppression impossible : le devis n'est plus en brouillon");
  }

  await softDeleteRecord(supabase, "quotes", organizationId, quoteId);
}
