import { NextResponse } from "next/server";
import { withBotAuth, parseJsonBody, jsonError } from "@/lib/utils/botRoute";
import { createContactSchema } from "@/lib/schemas/contact";
import * as contactService from "@/lib/services/contactService";

/**
 * GET /api/v1/contacts?email=... ou ?phone=... — lookup exact, union des
 * matches (OR), email insensible a la casse. 400 si aucun filtre : un 200 []
 * serait indiscernable de "aucun match" et pousserait un bot mal configure
 * a creer des doublons.
 * POST /api/v1/contacts — creation, organizationId toujours resolu depuis
 * la cle API, jamais depuis le body.
 */
export const GET = withBotAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;
  const phone = searchParams.get("phone") ?? undefined;

  if (!email && !phone) {
    return jsonError("BAD_REQUEST", "Paramètre email ou phone requis", 400);
  }

  const contacts = await contactService.findContactsByEmailOrPhone(
    auth.context.organizationId,
    { email, phone },
    auth.supabase,
  );

  return NextResponse.json({ data: contacts });
});

export const POST = withBotAuth(async (request, auth) => {
  const parsed = await parseJsonBody(request, createContactSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const contact = await contactService.createContact(
    auth.context.organizationId,
    parsed.data,
    auth.supabase,
    auth.context.robotUserId,
  );

  return NextResponse.json({ data: contact }, { status: 201 });
});
