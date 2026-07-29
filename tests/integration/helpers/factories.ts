import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAnonClient, getAdminClient } from "./clients";

type Role = "admin" | "member" | "viewer";

export interface TestUser {
  userId: string;
  email: string;
  password: string;
}

export interface Tenant {
  orgId: string;
  owner: TestUser;
}

const PASSWORD = "test-password-123456";

/**
 * Contexte de test : provisionne tenants/users via service_role et nettoie
 * tout en fin de suite. Chaque test travaille sur des orgs dédiées → isolation
 * par construction (pas de wipe global de la DB entre les runs).
 */
export interface TestContext {
  /** Crée une org (via le trigger handle_new_user) + son owner admin. */
  createTenant(): Promise<Tenant>;
  /** Ajoute un user à une org existante avec le rôle voulu. */
  addMember(orgId: string, role: Role): Promise<TestUser>;
  /** Client anon authentifié en tant que `user` (RLS appliquée). */
  authClientFor(user: TestUser): Promise<SupabaseClient<Database>>;
  /** Supprime orgs (cascade) et users auth créés par ce contexte. */
  cleanup(): Promise<void>;
}

export function createTestContext(): TestContext {
  const admin = getAdminClient();
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  async function createAuthUser(): Promise<TestUser> {
    const email = `u-${randomUUID()}@test.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`createUser a échoué: ${error?.message ?? "no user"}`);
    }
    createdUserIds.push(data.user.id);
    return { userId: data.user.id, email, password: PASSWORD };
  }

  async function setSoleMembership(userId: string, orgId: string, role: Role): Promise<void> {
    // handle_new_user a déjà créé une org + membership admin "jetable" pour ce
    // user. On supprime cette org (cascade → membership + config) pour garantir
    // une membership unique : get_user_org_id() fait un `limit 1` sans order by,
    // donc plusieurs memberships donneraient une org arbitraire.
    const { data: throwaway, error: lookupError } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId);
    if (lookupError) throw new Error(`lookup membership: ${lookupError.message}`);
    for (const row of throwaway ?? []) {
      const del = await admin.from("organizations").delete().eq("id", row.organization_id);
      if (del.error) throw new Error(`delete throwaway org: ${del.error.message}`);
    }

    const ins = await admin
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: userId, role });
    if (ins.error) throw new Error(`insert membership: ${ins.error.message}`);
  }

  return {
    async createTenant() {
      const owner = await createAuthUser();
      // L'org auto-créée par le trigger devient le tenant ; owner en est admin.
      const { data, error } = await admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", owner.userId);
      if (error || !data?.length) {
        throw new Error(`org du tenant introuvable: ${error?.message}`);
      }
      const orgId = data[0].organization_id;
      createdOrgIds.push(orgId);
      return { orgId, owner };
    },

    async addMember(orgId, role) {
      const user = await createAuthUser();
      await setSoleMembership(user.userId, orgId, role);
      return user;
    },

    async authClientFor(user) {
      const client = createAnonClient();
      const { error } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      if (error) {
        throw new Error(`signIn ${user.email} a échoué: ${error.message}`);
      }
      return client;
    },

    async cleanup() {
      // Supprimer les orgs purge en cascade contacts/membres/config.
      for (const orgId of createdOrgIds) {
        await admin.from("organizations").delete().eq("id", orgId);
      }
      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    },
  };
}
