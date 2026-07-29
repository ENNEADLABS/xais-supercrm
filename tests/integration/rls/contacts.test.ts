import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAdminClient } from "../helpers/clients";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";

// Isolation multi-tenant via RLS sur `contacts` (ADR-0008).
// On exerce la vraie chaîne JWT → auth.uid() → get_user_org_id()/get_user_role()
// → policies, avec des clients anon authentifiés. Le client service_role ne sert
// qu'au seeding (il bypasse la RLS).
describe("RLS contacts — isolation multi-tenant + rôles", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("un membre d'une org ne voit pas les contacts d'une autre org", async () => {
    // Arrange — seed un contact dans l'org A (service_role, bypass RLS).
    const { data: seeded, error: seedError } = await getAdminClient()
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Alice", last_name: "OrgA" })
      .select("id");
    expect(seedError).toBeNull();
    const seededId = seeded![0].id;

    // Act — le owner de l'org B lit les contacts.
    const clientB = await ctx.authClientFor(orgB.owner);
    const { data, error } = await clientB.from("contacts").select("id");

    // Assert — aucune fuite cross-tenant.
    expect(error).toBeNull();
    expect(data!.some((c) => c.id === seededId)).toBe(false);
  });

  it("le WITH CHECK empêche d'insérer dans l'org d'autrui", async () => {
    const clientB = await ctx.authClientFor(orgB.owner);
    const { error } = await clientB
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Mallory", last_name: "X" });

    expect(error).not.toBeNull();
  });

  it("un viewer ne peut pas insérer dans sa propre org", async () => {
    const viewer = await ctx.addMember(orgA.orgId, "viewer");
    const client = await ctx.authClientFor(viewer);
    const { error } = await client
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Vince", last_name: "Viewer" });

    expect(error).not.toBeNull();
  });

  it("un member peut insérer dans sa propre org", async () => {
    const member = await ctx.addMember(orgA.orgId, "member");
    const client = await ctx.authClientFor(member);
    const { data, error } = await client
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Mona", last_name: "Member" })
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
