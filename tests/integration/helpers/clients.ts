import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import type { Database } from "@/types/database";

// Résolution des clés de la stack Supabase locale.
// Priorité aux variables d'env (CI), sinon interrogation de `supabase status`.
// Aucune clé n'est committée dans le repo.
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string | null;
}

let cached: SupabaseConfig | null = null;

function fromEnv(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET ?? null;
  if (url && anonKey && serviceRoleKey) return { url, anonKey, serviceRoleKey, jwtSecret };
  return null;
}

function fromCli(): SupabaseConfig {
  const out = execSync("supabase status -o env", { encoding: "utf8" });
  const get = (key: string): string | null => {
    const match = out.match(new RegExp(`^${key}="?([^"\\n]+)"?`, "m"));
    return match ? match[1] : null;
  };
  const required = (label: string, value: string | null): string => {
    if (!value) {
      throw new Error(
        `${label} introuvable dans \`supabase status\`. La stack locale est-elle démarrée (\`supabase start\`) ?`,
      );
    }
    return value;
  };
  // Préférer le schéma de clés récent (sb_publishable_/sb_secret_), actif quand
  // Supabase local signe les JWT en asymétrique (défaut des CLI récentes, dont la
  // CI). Fallback sur les clés JWT legacy (ANON_KEY/SERVICE_ROLE_KEY) des stacks
  // plus anciens où PostgREST n'accepte pas encore les nouvelles clés.
  return {
    url: required("API_URL", get("API_URL")),
    anonKey: required("clé anon", get("PUBLISHABLE_KEY") ?? get("ANON_KEY")),
    serviceRoleKey: required("clé service_role", get("SECRET_KEY") ?? get("SERVICE_ROLE_KEY")),
    // Absent si la stack locale est deja sur les signing keys asymetriques
    // (JWT_SECRET legacy non pertinent dans ce cas) — cf. createAuthenticatedClient.
    jwtSecret: get("JWT_SECRET"),
  };
}

function resolveConfig(): SupabaseConfig {
  if (cached) return cached;
  cached = fromEnv() ?? fromCli();
  return cached;
}

// persistSession/autoRefresh off : chaque client est éphémère et isolé par test.
const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** Client service_role : bypass RLS, réservé au seeding/setup des tests. */
export function getAdminClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = resolveConfig();
  return createClient<Database>(url, serviceRoleKey, CLIENT_OPTIONS);
}

/** Client anon non authentifié : RLS pleinement appliquée. */
export function createAnonClient(): SupabaseClient<Database> {
  const { url, anonKey } = resolveConfig();
  return createClient<Database>(url, anonKey, CLIENT_OPTIONS);
}

/**
 * Client anon avec un header Authorization: Bearer <token> impose — pour
 * simuler une session RLS-scopee sans passer par un vrai signInWithPassword
 * (ex. le JWT robot signe par src/lib/utils/apiAuth.ts). RLS pleinement
 * appliquee, `auth.uid()` resout le `sub` du token.
 */
export function createClientWithBearerToken(token: string): SupabaseClient<Database> {
  const { url, anonKey } = resolveConfig();
  return createClient<Database>(url, anonKey, {
    ...CLIENT_OPTIONS,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Secret JWT legacy (HS256) de la stack locale, si applicable — null si la
 * stack est deja sur les signing keys asymetriques (cf. fromCli ci-dessus). */
export function getJwtSecret(): string | null {
  return resolveConfig().jwtSecret;
}

/** URL + cle anon de la stack locale — pour injecter les process.env attendus
 * par le code applicatif (ex. les routes /api/v1/* testees en integration). */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const { url, anonKey } = resolveConfig();
  return { url, anonKey };
}
