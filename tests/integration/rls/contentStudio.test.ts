import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { getAdminClient } from "../helpers/clients";
import { SOFT_DELETED_AT } from "../helpers/seed";

// RLS Content Studio (spec 021) : isolation par organization_id + grille
// admin/member/viewer. Soft-delete (ideas/pieces/deliverables) reserve a l'admin
// pour le hard-delete ; les enfants (checklist) sont hard-deletables par member.
//
// Rappel : un UPDATE/DELETE refuse par `USING` n'erre pas, il affecte 0 ligne.
// On verifie donc l'etat reel en relisant via service_role.

async function seedPiece(orgId: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("content_pieces")
    .insert({ organization_id: orgId, title: "Seed Piece", format: "youtube_long", ...overrides })
    .select("id");
  if (error || !data?.length) throw new Error(`seedPiece: ${error?.message}`);
  return data[0].id;
}

async function readPieceAsAdmin(id: string) {
  const { data, error } = await getAdminClient().from("content_pieces").select("*").eq("id", id);
  if (error) throw new Error(`readPieceAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

async function readChecklistItemAsAdmin(id: string) {
  const { data, error } = await getAdminClient()
    .from("content_checklist_items")
    .select("*")
    .eq("id", id);
  if (error) throw new Error(`readChecklistItemAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

describe("RLS Content Studio", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let admin: TestUser;
  let member: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    admin = orgA.owner;
    member = await ctx.addMember(orgA.orgId, "member");
    viewer = await ctx.addMember(orgA.orgId, "viewer");
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("isole les contenus par organisation (une autre org ne voit rien)", async () => {
    const pieceId = await seedPiece(orgA.orgId);
    const clientB = await ctx.authClientFor(orgB.owner);

    const { data } = await clientB.from("content_pieces").select("id").eq("id", pieceId);
    expect(data).toEqual([]);
  });

  it("isole aussi les idees par organisation", async () => {
    const { data: idea } = await getAdminClient()
      .from("content_ideas")
      .insert({ organization_id: orgA.orgId, title: "Idee A" })
      .select("id");
    const ideaId = idea![0].id;

    const clientB = await ctx.authClientFor(orgB.owner);
    const { data } = await clientB.from("content_ideas").select("id").eq("id", ideaId);
    expect(data).toEqual([]);
  });

  it("un viewer ne peut pas creer de contenu (insert refuse)", async () => {
    const client = await ctx.authClientFor(viewer);
    const { error } = await client
      .from("content_pieces")
      .insert({ organization_id: orgA.orgId, title: "Viewer", format: "youtube_long" });
    expect(error).not.toBeNull();
  });

  it("un member peut creer un contenu", async () => {
    const client = await ctx.authClientFor(member);
    const { data, error } = await client
      .from("content_pieces")
      .insert({ organization_id: orgA.orgId, title: "Member", format: "youtube_short" })
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("un viewer ne peut pas changer le statut (update refuse)", async () => {
    const pieceId = await seedPiece(orgA.orgId, { status: "idea" });
    const client = await ctx.authClientFor(viewer);

    await client.from("content_pieces").update({ status: "editing" }).eq("id", pieceId);

    expect((await readPieceAsAdmin(pieceId))?.status).toBe("idea");
  });

  it("un member peut changer le statut", async () => {
    const pieceId = await seedPiece(orgA.orgId, { status: "idea" });
    const client = await ctx.authClientFor(member);

    await client.from("content_pieces").update({ status: "editing" }).eq("id", pieceId);

    expect((await readPieceAsAdmin(pieceId))?.status).toBe("editing");
  });

  it("seul l'admin peut hard-delete un contenu en corbeille (pas le member)", async () => {
    const pieceId = await seedPiece(orgA.orgId, { deleted_at: SOFT_DELETED_AT });

    const memberClient = await ctx.authClientFor(member);
    await memberClient.from("content_pieces").delete().eq("id", pieceId);
    expect(await readPieceAsAdmin(pieceId)).not.toBeNull();

    const adminClient = await ctx.authClientFor(admin);
    await adminClient.from("content_pieces").delete().eq("id", pieceId);
    expect(await readPieceAsAdmin(pieceId)).toBeNull();
  });

  it("un admin ne peut pas hard-delete un contenu hors corbeille", async () => {
    const pieceId = await seedPiece(orgA.orgId); // deleted_at null
    const client = await ctx.authClientFor(admin);

    await client.from("content_pieces").delete().eq("id", pieceId);

    expect(await readPieceAsAdmin(pieceId)).not.toBeNull();
  });

  it("seul l'admin voit la corbeille des contenus", async () => {
    const pieceId = await seedPiece(orgA.orgId, { deleted_at: SOFT_DELETED_AT });

    const memberClient = await ctx.authClientFor(member);
    const { data: memberView } = await memberClient
      .from("content_pieces")
      .select("id")
      .eq("id", pieceId);
    expect(memberView).toEqual([]);

    const adminClient = await ctx.authClientFor(admin);
    const { data: adminView } = await adminClient
      .from("content_pieces")
      .select("id")
      .eq("id", pieceId);
    expect(adminView?.map((p) => p.id)).toContain(pieceId);
  });

  it("un member peut hard-delete un item de checklist (enfant, pas de soft-delete)", async () => {
    const pieceId = await seedPiece(orgA.orgId);
    const { data: item } = await getAdminClient()
      .from("content_checklist_items")
      .insert({ organization_id: orgA.orgId, content_piece_id: pieceId, label: "A faire" })
      .select("id");
    const itemId = item![0].id;

    const client = await ctx.authClientFor(member);
    await client.from("content_checklist_items").delete().eq("id", itemId);

    expect(await readChecklistItemAsAdmin(itemId)).toBeNull();
  });
});
