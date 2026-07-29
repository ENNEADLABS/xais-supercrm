import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { readNoteAsAdmin, seedNote } from "../helpers/seed";

// Cas spécial RLS : `notes_update` n'autorise que l'AUTEUR (author_id = auth.uid()),
// indépendamment du rôle — même un admin ne peut pas éditer la note d'autrui.
// Rappel : un UPDATE refusé par `USING` affecte 0 ligne sans erreur → on relit
// l'état via service_role.
describe("RLS notes — update réservé à l'auteur + isolation", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let author: TestUser;
  let otherMember: TestUser;
  let noteId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    author = await ctx.addMember(orgA.orgId, "member");
    otherMember = await ctx.addMember(orgA.orgId, "member");
    noteId = await seedNote(orgA.orgId, author.userId, { content: "original" });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("l'auteur peut mettre à jour sa note", async () => {
    const client = await ctx.authClientFor(author);

    await client.from("notes").update({ content: "édité par auteur" }).eq("id", noteId);

    expect((await readNoteAsAdmin(noteId))?.content).toBe("édité par auteur");
  });

  it("un autre membre ne peut pas mettre à jour la note d'autrui", async () => {
    const before = (await readNoteAsAdmin(noteId))?.content;
    const client = await ctx.authClientFor(otherMember);

    await client.from("notes").update({ content: "tentative non-auteur" }).eq("id", noteId);

    expect((await readNoteAsAdmin(noteId))?.content).toBe(before);
  });

  it("un admin non-auteur ne peut pas mettre à jour la note d'autrui", async () => {
    const before = (await readNoteAsAdmin(noteId))?.content;
    const client = await ctx.authClientFor(orgA.owner); // admin, mais pas l'auteur

    await client.from("notes").update({ content: "tentative admin" }).eq("id", noteId);

    expect((await readNoteAsAdmin(noteId))?.content).toBe(before);
  });

  it("une org ne voit pas les notes d'une autre org", async () => {
    const client = await ctx.authClientFor(orgB.owner);

    const { data } = await client.from("notes").select("id").eq("id", noteId);

    expect(data).toEqual([]);
  });
});
