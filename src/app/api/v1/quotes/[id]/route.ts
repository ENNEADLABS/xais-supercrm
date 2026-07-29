import { NextResponse } from "next/server";
import { withBotAuth, parseJsonBody, jsonError, isUuid } from "@/lib/utils/botRoute";
import { botQuoteTransitionSchema } from "@/lib/schemas/quote";
import * as quoteService from "@/lib/services/quoteService";
import {
  applyQuoteTransition,
  QuoteNotFoundError,
  QuoteTransitionError,
} from "@/lib/services/quoteLifecycleService";

/**
 * GET /api/v1/quotes/:id — detail d'un devis + lignes ordonnees.
 * PATCH /api/v1/quotes/:id — transition de statut UNIQUEMENT (matrice
 * ALLOWED_QUOTE_TRANSITIONS via les fonctions lifecycle — jamais d'update
 * status direct, pas d'edition de champs par le bot). Transition hors
 * matrice ou invariant viole -> 409 INVALID_TRANSITION.
 * 404 identique pour "inexistant" et "autre organisation" (pas d'oracle).
 */
export const GET = withBotAuth(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Devis introuvable", 404);

  const quote = await quoteService.getQuote(auth.context.organizationId, id, auth.supabase);
  if (!quote) return jsonError("NOT_FOUND", "Devis introuvable", 404);

  return NextResponse.json({ data: quote });
});

export const PATCH = withBotAuth(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Devis introuvable", 404);

  const parsed = await parseJsonBody(request, botQuoteTransitionSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  try {
    const quote = await applyQuoteTransition(
      auth.context.organizationId,
      id,
      parsed.data,
      auth.context.robotUserId,
      auth.supabase,
    );
    return NextResponse.json({ data: quote });
  } catch (error) {
    if (error instanceof QuoteNotFoundError) {
      return jsonError("NOT_FOUND", "Devis introuvable", 404);
    }
    if (error instanceof QuoteTransitionError) {
      return jsonError("INVALID_TRANSITION", error.message, 409);
    }
    throw error; // withBotAuth capture -> 500 INTERNAL + Sentry
  }
});
