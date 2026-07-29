import { NextResponse } from "next/server";
import { z } from "zod";
import { withBotAuth, parseJsonBody, jsonError, isUuid } from "@/lib/utils/botRoute";
import * as contactService from "@/lib/services/contactService";
import * as noteService from "@/lib/services/noteService";

const createBotNoteSchema = z.object({
  content: z.string().min(1, "Le contenu est requis").max(10000),
});

/**
 * POST /api/v1/contacts/:id/notes — cree une note liee a ce contact.
 * entity_type/entity_id sont implicites (contact + :id), pas dans le body.
 * 404 si le contact n'existe pas dans l'organisation de la cle : le lien
 * polymorphe (entity_type, entity_id) n'a pas de FK, sans ce check un bot
 * qui hallucine un id recevrait 201 et creerait une note orpheline.
 * author_id = compte robot de la cle (attribution visible dans le fil
 * d'activite existant, cf. specs/done/024-bot-api-contacts-notes.md).
 */
export const POST = withBotAuth(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError("NOT_FOUND", "Contact introuvable", 404);
  }

  const parsed = await parseJsonBody(request, createBotNoteSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  // La RLS du client robot rend les contacts cross-org invisibles : ce check
  // renvoie le meme 404 pour "inexistant" et "autre organisation" (pas d'oracle).
  const exists = await contactService.contactExists(auth.context.organizationId, id, auth.supabase);
  if (!exists) {
    return jsonError("NOT_FOUND", "Contact introuvable", 404);
  }

  const note = await noteService.createNote(
    auth.context.organizationId,
    auth.context.robotUserId,
    { entity_type: "contact", entity_id: id, content: parsed.data.content },
    auth.supabase,
  );

  return NextResponse.json({ data: note }, { status: 201 });
});
