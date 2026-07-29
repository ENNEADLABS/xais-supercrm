import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { QuoteStatus, BotQuoteTransitionInput } from "@/lib/schemas/quote";
import { ALLOWED_QUOTE_TRANSITIONS } from "./quoteTransitions";
import * as activityService from "./activityService";

// `client` optionnel sur chaque transition : par defaut la session cookie de
// l'utilisateur courant, sinon un client injecte (ex. le client robot de
// l'API bot, cf. src/lib/utils/apiAuth.ts). `actorId` optionnel : attribution
// de l'activite (le bot le renseigne toujours ; l'UI pourra suivre).

// --- Erreurs typees : la route bot mappe NotFound -> 404 et Transition -> 409.
// Sous-classes d'Error : les callers UI existants (error.message) sont intacts.

export class QuoteNotFoundError extends Error {
  constructor() {
    super("Devis introuvable");
    this.name = "QuoteNotFoundError";
  }
}

export class QuoteTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteTransitionError";
  }
}

// --- Helper interne : charger un devis et verifier la transition ---

interface QuoteState {
  id: string;
  status: QuoteStatus;
  organization_id: string;
}

async function fetchQuoteAndCheckTransition(
  supabase: SupabaseClient<Database>,
  orgId: string,
  quoteId: string,
  targetStatus: QuoteStatus,
) {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, status, organization_id")
    .eq("organization_id", orgId)
    .eq("id", quoteId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) throw new QuoteNotFoundError();

  const quote = data[0] as QuoteState;
  const allowed = ALLOWED_QUOTE_TRANSITIONS[quote.status] ?? [];

  if (!allowed.includes(targetStatus)) {
    throw new QuoteTransitionError(`Transition impossible : ${quote.status} -> ${targetStatus}`);
  }

  return quote;
}

// --- Transition generique ---

async function transitionQuote(
  orgId: string,
  quoteId: string,
  targetStatus: QuoteStatus,
  extraFields: Record<string, unknown> = {},
  activityAction: string,
  metadata: Record<string, unknown> = {},
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());
  const quote = await fetchQuoteAndCheckTransition(supabase, orgId, quoteId, targetStatus);

  const { data, error } = await supabase
    .from("quotes")
    .update({ status: targetStatus, ...extraFields })
    .eq("organization_id", orgId)
    .eq("id", quoteId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new QuoteNotFoundError();

  await activityService.log(
    orgId,
    {
      entityType: "quote",
      entityId: quoteId,
      action: activityAction,
      actorId,
      metadata: { from: quote.status, to: targetStatus, ...metadata },
    },
    supabase,
  );

  return data[0];
}

// --- draft -> validated ---

export async function validateQuote(
  orgId: string,
  quoteId: string,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());

  // Verifier l'appartenance a l'org avant de lire les lignes
  const { data: quoteCheck } = await supabase
    .from("quotes")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", quoteId)
    .is("deleted_at", null);
  if (!quoteCheck || quoteCheck.length === 0) throw new QuoteNotFoundError();

  // Verifier qu'il y a au moins une ligne avec un total > 0
  const { data: lines, error: linesError } = await supabase
    .from("quote_lines")
    .select("line_total_ht")
    .eq("quote_id", quoteId);

  if (linesError) throw linesError;
  if (!lines || lines.length === 0) {
    throw new QuoteTransitionError("Le devis doit contenir au moins une ligne");
  }

  const totalHt = lines.reduce((sum, line) => sum + ((line.line_total_ht as number) ?? 0), 0);
  if (totalHt <= 0) {
    throw new QuoteTransitionError("Le total HT doit etre superieur a 0");
  }

  // Generer la reference via RPC
  const { data: refData, error: refError } = await supabase.rpc("generate_quote_reference", {
    p_org_id: orgId,
  });
  if (refError) throw refError;

  return transitionQuote(
    orgId,
    quoteId,
    "validated",
    { reference: refData, issued_at: new Date().toISOString() },
    "quote_validated",
    {},
    actorId,
    supabase,
  );
}

// --- validated -> sent ---

export async function sendQuote(
  orgId: string,
  quoteId: string,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  return transitionQuote(
    orgId,
    quoteId,
    "sent",
    { sent_at: new Date().toISOString() },
    "quote_sent",
    {},
    actorId,
    client,
  );
}

// --- sent -> signed ---

export async function signQuote(
  orgId: string,
  quoteId: string,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  return transitionQuote(
    orgId,
    quoteId,
    "signed",
    { signed_at: new Date().toISOString() },
    "quote_signed",
    {},
    actorId,
    client,
  );
}

// --- sent -> refused ---

export async function refuseQuote(
  orgId: string,
  quoteId: string,
  reason?: string,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  return transitionQuote(
    orgId,
    quoteId,
    "refused",
    {
      refused_at: new Date().toISOString(),
      refused_reason: reason ?? null,
    },
    "quote_refused",
    reason ? { reason } : {},
    actorId,
    client,
  );
}

// --- any (sauf invoiced) -> cancelled ---

export async function cancelQuote(
  orgId: string,
  quoteId: string,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  return transitionQuote(orgId, quoteId, "cancelled", {}, "quote_cancelled", {}, actorId, client);
}

// --- Dispatch des transitions de l'API bot (statut -> fonction dediee) ---
// Jamais d'update `status` direct : chaque cible passe par sa transition,
// qui verifie la matrice ALLOWED_QUOTE_TRANSITIONS et ses invariants.

export async function applyQuoteTransition(
  orgId: string,
  quoteId: string,
  input: BotQuoteTransitionInput,
  actorId?: string,
  client?: SupabaseClient<Database>,
) {
  switch (input.status) {
    case "validated":
      return validateQuote(orgId, quoteId, actorId, client);
    case "sent":
      return sendQuote(orgId, quoteId, actorId, client);
    case "signed":
      return signQuote(orgId, quoteId, actorId, client);
    case "refused":
      return refuseQuote(orgId, quoteId, input.refused_reason ?? undefined, actorId, client);
    case "cancelled":
      return cancelQuote(orgId, quoteId, actorId, client);
  }
}
