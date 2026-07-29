import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { readContactAsAdmin, seedContact, SOFT_DELETED_AT } from "../helpers/seed";

// Soft-delete générique (ADR-0006) sur `contacts` :
// - update (incl. mise en corbeille) : admin/member, pas viewer
// - hard delete : admin seulement ET uniquement si déjà en corbeille
// - visibilité corbeille : admin via contacts_select_deleted, pas les autres
//
// Rappel RLS : un UPDATE/DELETE refusé par `USING` ne lève PAS d'erreur, il
// affecte 0 ligne. On vérifie donc l'état réel en relisant via service_role.
describe("RLS contacts — soft-delete / hard-delete", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let admin: TestUser;
  let member: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    admin = orgA.owner;
    member = await ctx.addMember(orgA.orgId, "member");
    viewer = await ctx.addMember(orgA.orgId, "viewer");
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("un viewer ne peut pas mettre un contact en corbeille (update refusé)", async () => {
    const contactId = await seedContact(orgA.orgId);
    const client = await ctx.authClientFor(viewer);

    await client.from("contacts").update({ deleted_at: SOFT_DELETED_AT }).eq("id", contactId);

    const row = await readContactAsAdmin(contactId);
    expect(row?.deleted_at).toBeNull();
  });

  it("un admin peut mettre en corbeille puis hard-delete", async () => {
    const contactId = await seedContact(orgA.orgId);
    const client = await ctx.authClientFor(admin);

    // Soft-delete
    await client.from("contacts").update({ deleted_at: SOFT_DELETED_AT }).eq("id", contactId);
    expect((await readContactAsAdmin(contactId))?.deleted_at).not.toBeNull();

    // Hard-delete (autorisé car en corbeille)
    await client.from("contacts").delete().eq("id", contactId);
    expect(await readContactAsAdmin(contactId)).toBeNull();
  });

  it("un admin ne peut pas hard-delete un contact qui n'est pas en corbeille", async () => {
    const contactId = await seedContact(orgA.orgId); // deleted_at null
    const client = await ctx.authClientFor(admin);

    await client.from("contacts").delete().eq("id", contactId);

    expect(await readContactAsAdmin(contactId)).not.toBeNull();
  });

  it("un member ne peut pas hard-delete, même un contact en corbeille", async () => {
    const contactId = await seedContact(orgA.orgId, { deleted_at: SOFT_DELETED_AT });
    const client = await ctx.authClientFor(member);

    await client.from("contacts").delete().eq("id", contactId);

    expect(await readContactAsAdmin(contactId)).not.toBeNull();
  });

  it("seul l'admin voit la corbeille (member ne voit pas les soft-deleted)", async () => {
    const contactId = await seedContact(orgA.orgId, { deleted_at: SOFT_DELETED_AT });

    const memberClient = await ctx.authClientFor(member);
    const { data: memberView } = await memberClient
      .from("contacts")
      .select("id")
      .eq("id", contactId);
    expect(memberView).toEqual([]);

    const adminClient = await ctx.authClientFor(admin);
    const { data: adminView } = await adminClient.from("contacts").select("id").eq("id", contactId);
    expect(adminView?.map((c) => c.id)).toContain(contactId);
  });
});
