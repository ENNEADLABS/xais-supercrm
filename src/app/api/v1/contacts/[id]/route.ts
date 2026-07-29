import { NextResponse } from "next/server";
import { withBotAuth, parseJsonBody, jsonError, isUuid } from "@/lib/utils/botRoute";
import { updateContactSchema } from "@/lib/schemas/contact";
import * as contactService from "@/lib/services/contactService";

/**
 * PATCH /api/v1/contacts/:id — met a jour un contact de l'organisation de
 * la cle. 404 (jamais 403) si le contact appartient a une autre organisation
 * ou n'existe pas — ne pas confirmer l'existence cross-org.
 */
export const PATCH = withBotAuth(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError("NOT_FOUND", "Contact introuvable", 404);
  }

  const parsed = await parseJsonBody(request, updateContactSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  if (Object.keys(parsed.data).length === 0) {
    return jsonError("BAD_REQUEST", "Aucun champ à mettre à jour", 400);
  }

  try {
    const contact = await contactService.updateContact(
      auth.context.organizationId,
      id,
      parsed.data,
      auth.supabase,
      auth.context.robotUserId,
    );
    return NextResponse.json({ data: contact });
  } catch (error) {
    if (error instanceof Error && error.message === "Contact not found") {
      return jsonError("NOT_FOUND", "Contact introuvable", 404);
    }
    throw error;
  }
});
