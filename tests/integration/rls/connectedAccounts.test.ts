import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { readConnectedAccountAsAdmin, seedConnectedAccount } from "../helpers/seed";

// `connected_accounts` (boîtes email) a une RLS user-scopée particulière :
// - select : org-wide (tout membre de l'org voit les comptes de l'org)
// - insert : uniquement le sien (user_id = auth.uid())
// - update/delete : le sien OU si admin
// Rappel : un DELETE refusé par `USING` affecte 0 ligne sans erreur → relecture.
function newEmail(): string {
  return `acc-${randomUUID()}@test.local`;
}

describe("RLS connected_accounts — user-scopé (propre compte) + admin", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let member1: TestUser;
  let member2: TestUser;
  let sharedAccountId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    member1 = await ctx.addMember(orgA.orgId, "member");
    member2 = await ctx.addMember(orgA.orgId, "member");
    sharedAccountId = await seedConnectedAccount(orgA.orgId, member1.userId);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("une autre org ne voit pas les comptes connectés", async () => {
    const clientB = await ctx.authClientFor(orgB.owner);

    const { data } = await clientB
      .from("connected_accounts")
      .select("id")
      .eq("id", sharedAccountId);

    expect(data).toEqual([]);
  });

  it("un collègue de la même org voit le compte (select org-wide)", async () => {
    const client = await ctx.authClientFor(member2);

    const { data } = await client.from("connected_accounts").select("id").eq("id", sharedAccountId);

    expect(data?.map((a) => a.id)).toContain(sharedAccountId);
  });

  it("un membre peut créer son propre compte", async () => {
    const client = await ctx.authClientFor(member2);

    const { data, error } = await client
      .from("connected_accounts")
      .insert({
        organization_id: orgA.orgId,
        user_id: member2.userId,
        provider: "gmail",
        email_address: newEmail(),
        credentials_encrypted: "enc",
      })
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un membre ne peut pas créer un compte au nom d'un autre user", async () => {
    const client = await ctx.authClientFor(member2);

    const { error } = await client.from("connected_accounts").insert({
      organization_id: orgA.orgId,
      user_id: member1.userId, // pas auth.uid()
      provider: "gmail",
      email_address: newEmail(),
      credentials_encrypted: "enc",
    });

    expect(error).not.toBeNull();
  });

  it("un membre ne peut pas supprimer le compte d'un autre", async () => {
    const accountId = await seedConnectedAccount(orgA.orgId, member1.userId);
    const client = await ctx.authClientFor(member2);

    await client.from("connected_accounts").delete().eq("id", accountId);

    expect(await readConnectedAccountAsAdmin(accountId)).not.toBeNull();
  });

  it("un membre peut supprimer son propre compte", async () => {
    const accountId = await seedConnectedAccount(orgA.orgId, member1.userId);
    const client = await ctx.authClientFor(member1);

    await client.from("connected_accounts").delete().eq("id", accountId);

    expect(await readConnectedAccountAsAdmin(accountId)).toBeNull();
  });

  it("un admin peut supprimer le compte d'un autre membre", async () => {
    const accountId = await seedConnectedAccount(orgA.orgId, member1.userId);
    const client = await ctx.authClientFor(orgA.owner); // admin

    await client.from("connected_accounts").delete().eq("id", accountId);

    expect(await readConnectedAccountAsAdmin(accountId)).toBeNull();
  });
});
