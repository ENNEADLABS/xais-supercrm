import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { getAdminClient } from "../helpers/clients";
import { SOFT_DELETED_AT } from "../helpers/seed";
import type { Json } from "@/types/database";

// RLS content_templates (spec 022) : isolation par organization_id + grille
// admin/member/viewer + soft-delete. ET couverture de la fonction
// apply_content_template (SECURITY DEFINER) : autorite derivee du contexte
// d'auth (jamais de p_org/p_user), inserts transactionnels, refus cross-org.
//
// Rappel : un UPDATE/DELETE refuse par `USING` n'erre pas, il affecte 0 ligne.
// On relit via service_role pour verifier l'etat reel.

async function seedTemplate(
  orgId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("content_templates")
    .insert({
      organization_id: orgId,
      name: "Seed Template",
      format: "youtube_long",
      checklist_items: ["Etape 1", "Etape 2", "Etape 3"] as Json,
      deliverable_specs: [
        { title: "Short", format: "youtube_short", channel: "youtube", offset_days: 1 },
        { title: "Post Skool", format: "skool_post", channel: "skool", offset_days: 0 },
      ] as Json,
      script_skeleton: { hook: "Accroche", cta: "Abonne-toi" } as Json,
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedTemplate: ${error?.message}`);
  return data[0].id;
}

async function readTemplateAsAdmin(id: string) {
  const { data, error } = await getAdminClient().from("content_templates").select("*").eq("id", id);
  if (error) throw new Error(`readTemplateAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

describe("RLS content_templates", () => {
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

  // --- Isolation + grille de roles (CRUD) ----------------------------------

  it("isole les templates par organisation (une autre org ne voit rien)", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const clientB = await ctx.authClientFor(orgB.owner);

    const { data } = await clientB.from("content_templates").select("id").eq("id", templateId);
    expect(data).toEqual([]);
  });

  it("un viewer ne peut pas creer de template (insert refuse)", async () => {
    const client = await ctx.authClientFor(viewer);
    const { error } = await client
      .from("content_templates")
      .insert({ organization_id: orgA.orgId, name: "Viewer", format: "youtube_long" });
    expect(error).not.toBeNull();
  });

  it("un member peut creer un template", async () => {
    const client = await ctx.authClientFor(member);
    const { data, error } = await client
      .from("content_templates")
      .insert({ organization_id: orgA.orgId, name: "Member", format: "skool_post" })
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("un viewer ne peut pas modifier un template (update refuse)", async () => {
    const templateId = await seedTemplate(orgA.orgId, { name: "Avant" });
    const client = await ctx.authClientFor(viewer);

    await client.from("content_templates").update({ name: "Apres" }).eq("id", templateId);

    expect((await readTemplateAsAdmin(templateId))?.name).toBe("Avant");
  });

  it("un member ne peut PAS soft-delete un template (update deleted_at refusé par RLS)", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const client = await ctx.authClientFor(member);

    await client
      .from("content_templates")
      .update({ deleted_at: SOFT_DELETED_AT })
      .eq("id", templateId);

    expect((await readTemplateAsAdmin(templateId))?.deleted_at).toBeNull();
  });

  it("un admin peut soft-delete un template (update deleted_at)", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const client = await ctx.authClientFor(admin);

    await client
      .from("content_templates")
      .update({ deleted_at: SOFT_DELETED_AT })
      .eq("id", templateId);

    expect((await readTemplateAsAdmin(templateId))?.deleted_at).not.toBeNull();
  });

  it("un member PEUT modifier les données d'un template (sans toucher deleted_at)", async () => {
    const templateId = await seedTemplate(orgA.orgId, { name: "Avant" });
    const client = await ctx.authClientFor(member);

    await client.from("content_templates").update({ name: "Après" }).eq("id", templateId);

    const row = await readTemplateAsAdmin(templateId);
    expect(row?.name).toBe("Après");
    expect(row?.deleted_at).toBeNull();
  });

  it("seul l'admin peut hard-delete un template en corbeille (pas le member)", async () => {
    const templateId = await seedTemplate(orgA.orgId, { deleted_at: SOFT_DELETED_AT });

    const memberClient = await ctx.authClientFor(member);
    await memberClient.from("content_templates").delete().eq("id", templateId);
    expect(await readTemplateAsAdmin(templateId)).not.toBeNull();

    const adminClient = await ctx.authClientFor(admin);
    await adminClient.from("content_templates").delete().eq("id", templateId);
    expect(await readTemplateAsAdmin(templateId)).toBeNull();
  });

  it("seul l'admin voit la corbeille des templates", async () => {
    const templateId = await seedTemplate(orgA.orgId, { deleted_at: SOFT_DELETED_AT });

    const memberClient = await ctx.authClientFor(member);
    const { data: memberView } = await memberClient
      .from("content_templates")
      .select("id")
      .eq("id", templateId);
    expect(memberView).toEqual([]);

    const adminClient = await ctx.authClientFor(admin);
    const { data: adminView } = await adminClient
      .from("content_templates")
      .select("id")
      .eq("id", templateId);
    expect(adminView?.map((t) => t.id)).toContain(templateId);
  });

  // --- apply_content_template (SECURITY DEFINER) ---------------------------

  it("apply_content_template cree piece + script + checklist + livrables dans la bonne org", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const client = await ctx.authClientFor(member);

    const { data: pieceId, error } = await client.rpc("apply_content_template", {
      p_template_id: templateId,
      p_title: "Ma video",
      p_scheduled_date: "2026-07-01T00:00:00Z",
    });
    expect(error).toBeNull();
    expect(pieceId).toBeTruthy();

    const admin = getAdminClient();

    // Piece : bonne org, format herite, titre, date
    const { data: pieces } = await admin
      .from("content_pieces")
      .select("*")
      .eq("id", pieceId as string);
    expect(pieces?.length).toBe(1);
    expect(pieces![0].organization_id).toBe(orgA.orgId);
    expect(pieces![0].format).toBe("youtube_long");
    expect(pieces![0].title).toBe("Ma video");
    expect(pieces![0].scheduled_date).toBe("2026-07-01");

    // Script pre-rempli depuis le squelette
    const { data: scripts } = await admin
      .from("content_scripts")
      .select("*")
      .eq("content_piece_id", pieceId as string);
    expect(scripts?.length).toBe(1);
    expect(scripts![0].hook).toBe("Accroche");
    expect(scripts![0].cta).toBe("Abonne-toi");

    // Checklist : 3 items, ordonnes
    const { data: items } = await admin
      .from("content_checklist_items")
      .select("*")
      .eq("content_piece_id", pieceId as string)
      .order("position", { ascending: true });
    expect(items?.map((i) => i.label)).toEqual(["Etape 1", "Etape 2", "Etape 3"]);

    // Livrables : offset_days applique (Short J+1, Post Skool J+0)
    const { data: deliverables } = await admin
      .from("deliverables")
      .select("*")
      .eq("content_piece_id", pieceId as string)
      .order("position", { ascending: true });
    expect(deliverables?.length).toBe(2);
    expect(deliverables![0].title).toBe("Short");
    expect(deliverables![0].channel).toBe("youtube");
    expect(deliverables![0].scheduled_date).toBe("2026-07-02");
    expect(deliverables![1].scheduled_date).toBe("2026-07-01");
  });

  it("apply_content_template refuse l'application cross-org", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const clientB = await ctx.authClientFor(orgB.owner);

    const { error } = await clientB.rpc("apply_content_template", {
      p_template_id: templateId,
      p_title: "Tentative cross-org",
      p_scheduled_date: "2026-07-01T00:00:00Z",
    });
    expect(error).not.toBeNull();
  });

  it("apply_content_template refuse un viewer (insufficient role)", async () => {
    const templateId = await seedTemplate(orgA.orgId);
    const client = await ctx.authClientFor(viewer);

    const { error } = await client.rpc("apply_content_template", {
      p_template_id: templateId,
      p_title: "Tentative viewer",
    });
    expect(error).not.toBeNull();
  });
});
