import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { authenticateBotRequest, type AuthenticatedBotRequest } from "@/lib/utils/apiAuth";

// --- Plomberie commune des routes /api/v1/* (API bot externe) ---
// Toute route bot DOIT passer par withBotAuth : le proxy laisse passer
// /api/v1/* sans session cookie (cf. src/proxy.ts), l'auth par cle API est
// donc le seul rempart — le wrapper rend son oubli impossible et garantit
// que toute erreur inattendue sort au format d'erreur standard du projet.

interface BotRouteContext {
  params: Promise<Record<string, string>>;
}

type BotHandler = (
  request: NextRequest,
  auth: AuthenticatedBotRequest,
  ctx: BotRouteContext,
) => Promise<NextResponse>;

export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function withBotAuth(handler: BotHandler) {
  // ctx optionnel : les routes sans segment dynamique (/api/v1/contacts) sont
  // appelees sans second argument.
  return async (request: NextRequest, ctx?: BotRouteContext): Promise<NextResponse> => {
    try {
      const auth = await authenticateBotRequest(request.headers.get("authorization"));
      if ("errorResponse" in auth) return auth.errorResponse;
      return await handler(request, auth, ctx ?? { params: Promise.resolve({}) });
    } catch (error) {
      Sentry.captureException(error);
      return jsonError("INTERNAL", "Erreur interne", 500);
    }
  };
}

/** Parse + valide le body JSON d'une requete bot ; erreur deja formatee sinon.
 * Type sur Request (pas NextRequest) : seul .json() est utilise. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { errorResponse: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { errorResponse: jsonError("BAD_REQUEST", "JSON invalide", 400) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      errorResponse: jsonError(
        "BAD_REQUEST",
        parsed.error.issues[0]?.message ?? "Payload invalide",
        400,
      ),
    };
  }
  return { data: parsed.data };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id malformé ne peut correspondre à aucun contact : 404 (jamais d'oracle
 * d'existence), plutôt qu'une erreur Postgres 22P02 propagée en 500. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
