import { NextResponse } from "next/server";
import type { Json } from "@/types/database";
import { withBotAuth, parseJsonBody, jsonError, isUuid } from "@/lib/utils/botRoute";
import { botCreateQuoteSchema, quoteSearchSchema } from "@/lib/schemas/quote";
import * as contactService from "@/lib/services/contactService";
import * as quoteService from "@/lib/services/quoteService";
import * as activityService from "@/lib/services/activityService";

// Query params de la liste : sous-ensemble de quoteSearchSchema
// (defauts page 1 / per_page 25 conserves, coercion string -> number incluse).
const listQuerySchema = quoteSearchSchema.pick({ status: true, page: true, per_page: true });

// Message exact du RAISE EXCEPTION du RPC create_quote_with_lines : la
// validation immediate est une transition draft -> validated, son invariant
// viole sort en 409 INVALID_TRANSITION (cf. spec 025), pas en 500.
const RPC_TOTAL_HT_ERROR = "Le total HT doit etre superieur a 0";

/**
 * GET /api/v1/contacts/:id/quotes — liste les devis de ce contact
 * (?status=, ?page=, ?per_page= optionnels), sans les lignes.
 * POST /api/v1/contacts/:id/quotes — cree un devis complet (lignes incluses)
 * pour ce contact, transactionnel (RPC), valide dans la foulee : la reponse
 * porte reference + totaux derives par les triggers DB. organizationId
 * toujours resolu depuis la cle API, jamais depuis le body.
 * 404 identique pour "inexistant" et "autre organisation" (pas d'oracle).
 */
export const GET = withBotAuth(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Contact introuvable", 404);

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    per_page: searchParams.get("per_page") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Paramètres invalides", 400);
  }

  const exists = await contactService.contactExists(auth.context.organizationId, id, auth.supabase);
  if (!exists) return jsonError("NOT_FOUND", "Contact introuvable", 404);

  const { data, count } = await quoteService.getQuotesByContact(
    auth.context.organizationId,
    id,
    parsed.data,
    auth.supabase,
  );
  return NextResponse.json({ data, count });
});

export const POST = withBotAuth(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("NOT_FOUND", "Contact introuvable", 404);

  const parsed = await parseJsonBody(request, botCreateQuoteSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const exists = await contactService.contactExists(auth.context.organizationId, id, auth.supabase);
  if (!exists) return jsonError("NOT_FOUND", "Contact introuvable", 404);

  // company_id optionnel : defense in depth au-dela de la FK (une FK n'est
  // pas soumise a la RLS — sans ce check, un bot pourrait lier une societe
  // d'une autre organisation).
  if (parsed.data.company_id) {
    const { data: companies, error } = await auth.supabase
      .from("companies")
      .select("id")
      .eq("organization_id", auth.context.organizationId)
      .eq("id", parsed.data.company_id)
      .is("deleted_at", null);
    if (error) throw error;
    if (!companies || companies.length === 0) {
      return jsonError("NOT_FOUND", "Société introuvable", 404);
    }
  }

  const { data: quoteId, error: rpcError } = await auth.supabase.rpc("create_quote_with_lines", {
    p_org_id: auth.context.organizationId,
    p_user_id: auth.context.robotUserId,
    p_contact_id: id,
    p_subject: parsed.data.subject,
    p_validity_days: parsed.data.validity_days,
    // Json : lignes deja validees par botQuoteLineSchema (structure plate
    // serialisable), le generique Json de Supabase n'unifie pas avec un type
    // Zod infere sans ce passage par unknown.
    p_lines: parsed.data.lines as unknown as Json,
    p_validate: true,
    ...(parsed.data.company_id ? { p_company_id: parsed.data.company_id } : {}),
    ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
  });

  if (rpcError) {
    if (rpcError.message.includes(RPC_TOTAL_HT_ERROR)) {
      return jsonError("INVALID_TRANSITION", RPC_TOTAL_HT_ERROR, 409);
    }
    throw rpcError;
  }

  const quote = await quoteService.getQuote(auth.context.organizationId, quoteId, auth.supabase);

  // Log apres succes (meme pattern que transitionQuote / spec 024) :
  // actorId = robot, actions du domaine existantes.
  await activityService.log(
    auth.context.organizationId,
    {
      entityType: "quote",
      entityId: quoteId,
      action: "created",
      actorId: auth.context.robotUserId,
    },
    auth.supabase,
  );
  await activityService.log(
    auth.context.organizationId,
    {
      entityType: "quote",
      entityId: quoteId,
      action: "quote_validated",
      actorId: auth.context.robotUserId,
      metadata: { from: "draft", to: "validated" },
    },
    auth.supabase,
  );

  return NextResponse.json({ data: quote }, { status: 201 });
});
