"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// --- Contexte d'authentification pour les server actions ---

export interface AuthContext {
  userId: string;
  organizationId: string;
}

/**
 * Recupere le userId et l'organizationId depuis le JWT Supabase.
 * Lance une erreur si l'utilisateur n'est pas authentifie ou n'a pas d'org.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (!data || data.length === 0) throw new Error("Aucune organisation");

  return { userId: user.id, organizationId: data[0].organization_id };
}

// --- Contexte avec role ---

export interface AuthContextWithRole extends AuthContext {
  role: string;
}

/**
 * Recupere le contexte d'auth enrichi du role du membre.
 */
export async function getAuthContextWithRole(): Promise<AuthContextWithRole> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1);

  if (!data || data.length === 0) throw new Error("Aucune organisation");

  return {
    userId: user.id,
    organizationId: data[0].organization_id,
    role: data[0].role,
  };
}

// --- Verification du role admin ---

/**
 * Verifie que l'utilisateur courant est admin de son organisation.
 * Lance une erreur si ce n'est pas le cas.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContextWithRole();
  if (ctx.role !== "admin") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return { userId: ctx.userId, organizationId: ctx.organizationId };
}

// --- Verification du role member ou admin (bloque les viewers) ---

/**
 * Verifie que l'utilisateur courant a un role d'ecriture (admin ou member).
 * Les viewers n'ont acces qu'en lecture.
 */
export async function requireMember(): Promise<AuthContext> {
  const ctx = await getAuthContextWithRole();
  if (ctx.role === "viewer") {
    throw new Error("Accès en lecture seule — modification non autorisée");
  }
  return { userId: ctx.userId, organizationId: ctx.organizationId };
}
