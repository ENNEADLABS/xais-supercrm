import { randomBytes, createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";
import { getAdminClient, getJwtSecret, getSupabaseEnv } from "../helpers/clients";

// Tests route-level de l'API bot /api/v1/* : le flux HTTP assemble
// (authenticateBotRequest → RLS robot → services), la ou les tests RLS
// (rls/apiKeys.test.ts) ne couvrent que la couche SQL. Verifient le contrat
// d'erreur { error: { code, message } } et les status codes de la spec 024.
//
// Prerequis identique aux autres tests d'integration : stack locale +
// db:reset. Le JWT robot est signe en HS256 avec le secret legacy local —
// suite inoperante si la stack est passee aux signing keys asymetriques
// (meme limite documentee que rls/apiKeys.test.ts, Open Question spec 024).

interface SeededApiKey {
  rawKey: string;
  robotUserId: string;
}

async function seedApiKey(orgId: string): Promise<SeededApiKey> {
  const admin = getAdminClient();

  const { data: robot, error: robotError } = await admin.auth.admin.createUser({
    email: `robot-${randomUUID()}@test.local`,
    password: randomBytes(32).toString("hex"),
    email_confirm: true,
  });
  if (robotError || !robot.user) throw new Error(`createUser robot: ${robotError?.message}`);
  const robotUserId = robot.user.id;

  const { data: junk } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", robotUserId);
  for (const row of junk ?? []) {
    await admin.from("organizations").delete().eq("id", row.organization_id);
  }

  const memberIns = await admin
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: robotUserId, role: "member" });
  if (memberIns.error) throw new Error(`insert membership robot: ${memberIns.error.message}`);

  const rawKey = "sk_live_" + randomBytes(32).toString("base64url");
  const keyIns = await admin.from("api_keys").insert({
    organization_id: orgId,
    robot_user_id: robotUserId,
    label: "Bot route-level",
    key_prefix: rawKey.slice(0, 12),
    key_hash: createHash("sha256").update(rawKey).digest("hex"),
    created_by: robotUserId,
  });
  if (keyIns.error) throw new Error(`insert api_keys: ${keyIns.error.message}`);

  return { rawKey, robotUserId };
}

function botRequest(
  path: string,
  init: { method?: string; body?: string; rawKey?: string } = {},
): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.rawKey) headers.authorization = `Bearer ${init.rawKey}`;
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers,
  });
}

function routeParams(id: string): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve({ id }) };
}

describe("API bot /api/v1/* (route-level)", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let keyA: SeededApiKey;
  // Import dynamique : les routes lisent process.env a l'execution, il doit
  // etre injecte avant (beforeAll) depuis la config de la stack locale.
  let contactsRoute: typeof import("@/app/api/v1/contacts/route");
  let contactByIdRoute: typeof import("@/app/api/v1/contacts/[id]/route");
  let notesRoute: typeof import("@/app/api/v1/contacts/[id]/notes/route");

  beforeAll(async () => {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      throw new Error(
        "Secret JWT legacy indisponible (stack locale sur signing keys asymetriques ?)",
      );
    }
    const { url, anonKey } = getSupabaseEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_JWT_SECRET = jwtSecret;

    contactsRoute = await import("@/app/api/v1/contacts/route");
    contactByIdRoute = await import("@/app/api/v1/contacts/[id]/route");
    notesRoute = await import("@/app/api/v1/contacts/[id]/notes/route");

    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    keyA = await seedApiKey(orgA.orgId);
  });

  afterAll(async () => {
    await getAdminClient().auth.admin.deleteUser(keyA.robotUserId);
    await ctx.cleanup();
  });

  it("401 au format standard sans header Authorization", async () => {
    const response = await contactsRoute.GET(botRequest("/api/v1/contacts?email=x@y.z"));
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  it("401 pour une cle inconnue", async () => {
    const response = await contactsRoute.GET(
      botRequest("/api/v1/contacts?email=x@y.z", { rawKey: "sk_live_inconnue" }),
    );
    expect(response.status).toBe(401);
  });

  it("400 sur GET sans email ni phone (jamais un 200 [] ambigu)", async () => {
    const response = await contactsRoute.GET(
      botRequest("/api/v1/contacts", { rawKey: keyA.rawKey }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("BAD_REQUEST");
  });

  it("201 sur POST contact, avec activite attribuee au robot", async () => {
    const response = await contactsRoute.POST(
      botRequest("/api/v1/contacts", {
        method: "POST",
        rawKey: keyA.rawKey,
        body: JSON.stringify({
          first_name: "Jean",
          last_name: "Bot",
          email: "Jean.Bot@Example.COM",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const { data: contact } = await response.json();
    expect(contact.organization_id).toBe(orgA.orgId);

    const { data: activities } = await getAdminClient()
      .from("activities")
      .select("action, actor_id")
      .eq("entity_type", "contact")
      .eq("entity_id", contact.id);
    expect(activities).toHaveLength(1);
    expect(activities![0].actor_id).toBe(keyA.robotUserId); // attribution bot (spec 024)
  });

  it("GET lookup email insensible a la casse (anti-doublon)", async () => {
    const response = await contactsRoute.GET(
      botRequest("/api/v1/contacts?email=jean.bot@example.com", { rawKey: keyA.rawKey }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].last_name).toBe("Bot");
  });

  it("400 sur POST au payload invalide", async () => {
    const response = await contactsRoute.POST(
      botRequest("/api/v1/contacts", {
        method: "POST",
        rawKey: keyA.rawKey,
        body: JSON.stringify({ first_name: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("404 (pas 500) sur PATCH avec un id non-UUID", async () => {
    const response = await contactByIdRoute.PATCH(
      botRequest("/api/v1/contacts/pas-un-uuid", {
        method: "PATCH",
        rawKey: keyA.rawKey,
        body: JSON.stringify({ job_title: "x" }),
      }),
      routeParams("pas-un-uuid"),
    );
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error.code).toBe("NOT_FOUND");
  });

  it("400 sur PATCH au body vide (aucun champ)", async () => {
    const response = await contactByIdRoute.PATCH(
      botRequest(`/api/v1/contacts/${randomUUID()}`, {
        method: "PATCH",
        rawKey: keyA.rawKey,
        body: JSON.stringify({}),
      }),
      routeParams(randomUUID()),
    );
    expect(response.status).toBe(400);
  });

  it("404 sur POST note vers un contact inexistant (pas de note orpheline)", async () => {
    const ghostId = randomUUID();
    const response = await notesRoute.POST(
      botRequest(`/api/v1/contacts/${ghostId}/notes`, {
        method: "POST",
        rawKey: keyA.rawKey,
        body: JSON.stringify({ content: "note fantome" }),
      }),
      routeParams(ghostId),
    );
    expect(response.status).toBe(404);

    const { data: notes } = await getAdminClient()
      .from("notes")
      .select("id")
      .eq("entity_id", ghostId);
    expect(notes).toHaveLength(0); // aucune note orpheline creee
  });

  it("404 sur POST note vers un contact d'une AUTRE organisation (pas d'oracle cross-org)", async () => {
    const { data: contactB, error } = await getAdminClient()
      .from("contacts")
      .insert({ organization_id: orgB.orgId, first_name: "Org B", last_name: "Contact" })
      .select("id");
    if (error || !contactB?.length) throw new Error(`seed contact orgB: ${error?.message}`);

    const response = await notesRoute.POST(
      botRequest(`/api/v1/contacts/${contactB[0].id}/notes`, {
        method: "POST",
        rawKey: keyA.rawKey,
        body: JSON.stringify({ content: "intrusion" }),
      }),
      routeParams(contactB[0].id),
    );
    expect(response.status).toBe(404); // meme reponse que "inexistant"
  });

  it("201 sur POST note vers un contact de l'organisation", async () => {
    const { data: contacts } = await getAdminClient()
      .from("contacts")
      .select("id")
      .eq("organization_id", orgA.orgId)
      .eq("last_name", "Bot");
    const contactId = contacts![0].id;

    const response = await notesRoute.POST(
      botRequest(`/api/v1/contacts/${contactId}/notes`, {
        method: "POST",
        rawKey: keyA.rawKey,
        body: JSON.stringify({ content: "Compte-rendu d'appel" }),
      }),
      routeParams(contactId),
    );
    expect(response.status).toBe(201);
    const { data: note } = await response.json();
    expect(note.author_id).toBe(keyA.robotUserId);
  });

  it("401 des que la cle est revoquee (via le vrai chemin authenticateBotRequest)", async () => {
    const keyHash = createHash("sha256").update(keyA.rawKey).digest("hex");
    await getAdminClient()
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("key_hash", keyHash);

    const response = await contactsRoute.GET(
      botRequest("/api/v1/contacts?email=x@y.z", { rawKey: keyA.rawKey }),
    );
    expect(response.status).toBe(401);

    await getAdminClient().from("api_keys").update({ revoked_at: null }).eq("key_hash", keyHash);
  });
});
