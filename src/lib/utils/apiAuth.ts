import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { checkRateLimit, BOT_API_LIMIT } from "@/lib/utils/rate-limit";
import type { Database } from "@/types/database";

// --- Authentification de l'API bot externe (contacts + notes) ---

const KEY_PREFIX = "sk_live_";
const ROBOT_JWT_EXPIRY = "5m";

export interface ApiKeyContext {
  apiKeyId: string;
  organizationId: string;
  robotUserId: string;
}

export function generateRawKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function keyPrefixFor(rawKey: string): string {
  return rawKey.slice(0, KEY_PREFIX.length + 4);
}

export function extractBearerToken(authHeader: string | null): string | null {
  // Scheme insensible a la casse (RFC 7235) : "bearer x" est valide.
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() || null : null;
}

/** Resout une cle API brute en organisation/robot via une fonction SECURITY
 * DEFINER (resolve_api_key) : aucune session n'existe encore a ce stade, la
 * RLS admin-only de api_keys bloquerait sinon structurellement cette lecture. */
export async function resolveApiKey(rawKey: string): Promise<ApiKeyContext | null> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc("resolve_api_key", {
    p_key_hash: hashApiKey(rawKey),
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;
  return { apiKeyId: row.id, organizationId: row.organization_id, robotUserId: row.robot_user_id };
}

/** Meme raison d'etre que resolveApiKey : touche last_used_at sans session admin. */
export async function touchApiKeyUsage(rawKey: string): Promise<void> {
  const supabase = createAnonSupabaseClient();
  const { error } = await supabase.rpc("touch_api_key_usage", { p_key_hash: hashApiKey(rawKey) });
  if (error) throw error;
}

/** Signe un JWT robot sans mot de passe ni secret stocke : expiration courte,
 * jamais persiste. auth.uid() resout `sub` cote Postgres, la RLS s'applique
 * exactement comme pour une session utilisateur normale. */
export function createRobotJwt(robotUserId: string): string {
  return jwt.sign({ role: "authenticated", sub: robotUserId }, getSupabaseJwtSecret(), {
    algorithm: "HS256", // explicite : ne pas dependre du defaut de la lib
    expiresIn: ROBOT_JWT_EXPIRY,
  });
}

/** Cree une session RLS-scopee pour le compte robot a partir de ce JWT. */
export function createRobotSupabaseClient(robotUserId: string) {
  const token = createRobotJwt(robotUserId);

  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export interface AuthenticatedBotRequest {
  context: ApiKeyContext;
  supabase: SupabaseClient<Database>;
}

/** Point d'entree commun aux routes /api/v1/* : extrait + resout la cle,
 * renvoie soit le contexte pret a l'emploi, soit une reponse d'erreur JSON
 * a retourner telle quelle (401 cle absente/invalide/revoquee). */
export async function authenticateBotRequest(
  authHeader: string | null,
): Promise<AuthenticatedBotRequest | { errorResponse: NextResponse }> {
  const rawKey = extractBearerToken(authHeader);
  if (!rawKey) {
    return {
      errorResponse: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Clé API manquante" } },
        { status: 401 },
      ),
    };
  }

  const context = await resolveApiKey(rawKey);
  if (!context) {
    return {
      errorResponse: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Clé API invalide ou révoquée" } },
        { status: 401 },
      ),
    };
  }

  const rateLimit = await checkRateLimit(`bot-api:${context.apiKeyId}`, BOT_API_LIMIT);
  if (!rateLimit.allowed) {
    return {
      errorResponse: NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Trop de requêtes — réessayez plus tard" } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
        },
      ),
    };
  }

  await touchApiKeyUsage(rawKey);

  return { context, supabase: createRobotSupabaseClient(context.robotUserId) };
}

function createAnonSupabaseClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

function getSupabaseJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  return secret;
}
