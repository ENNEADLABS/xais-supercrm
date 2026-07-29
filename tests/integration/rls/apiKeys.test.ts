import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";
import { getAdminClient, createAnonClient } from "../helpers/clients";
import { seedApiKey, createRobotClient, type SeededApiKey } from "../helpers/botApi";

// RLS api_keys (spec 024) : une cle d'une organisation ne doit jamais pouvoir
// lire/ecrire un contact d'une autre organisation, meme avec un id devine —
// c'est le test qui compte le plus vu que toute la securite du bot repose sur
// la RLS + la resolution correcte de l'organisation depuis la cle (pas de
// bypass service-role sur ce chemin, cf. specs/done/024-bot-api-contacts-notes.md).
//
// Le compte robot + la ligne api_keys sont seedes directement via le client
// admin (comme seedTemplate dans contentTemplates.test.ts) plutot que via
// apiKeyService.generateApiKey, qui depend de createServerSupabaseClient()
// (cookies Next, indisponible hors requete HTTP).

describe("RLS api_keys / robot bot", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let keyA: SeededApiKey;
  let contactAId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    keyA = await seedApiKey(orgA.orgId);

    const { data, error } = await getAdminClient()
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Org A", last_name: "Contact" })
      .select("id");
    if (error || !data?.length) throw new Error(`seed contact orgA: ${error?.message}`);
    contactAId = data[0].id;
  });

  afterAll(async () => {
    await getAdminClient().auth.admin.deleteUser(keyA.robotUserId);
    await ctx.cleanup();
  });

  it("le robot de l'org A voit son propre contact", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const { data, error } = await client.from("contacts").select("id").eq("id", contactAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("le robot de l'org A ne voit RIEN pour un contact de l'org B (id devine)", async () => {
    const { data: contactB, error: seedErr } = await getAdminClient()
      .from("contacts")
      .insert({ organization_id: orgB.orgId, first_name: "Org B", last_name: "Contact" })
      .select("id");
    if (seedErr || !contactB?.length) throw new Error(`seed contact orgB: ${seedErr?.message}`);

    const client = createRobotClient(keyA.robotUserId);
    const { data, error } = await client.from("contacts").select("id").eq("id", contactB[0].id);
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filtre silencieusement, pas d'erreur explicite
  });

  it("le robot de l'org A ne peut pas creer de contact dans l'org B", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const { error } = await client
      .from("contacts")
      .insert({ organization_id: orgB.orgId, first_name: "Intrus", last_name: "X" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // row-level security policy violation
  });

  it("resolve_api_key fonctionne via le client ANON (le vrai chemin bot, GRANT EXECUTE TO anon)", async () => {
    // Le code applicatif appelle cette fonction avec la cle anon, AVANT toute
    // session : c'est le grant a anon (pilier de l'architecture) qui est teste
    // ici, pas seulement la logique SQL.
    const keyHash = createHash("sha256").update(keyA.rawKey).digest("hex");
    const { data, error } = await createAnonClient().rpc("resolve_api_key", {
      p_key_hash: keyHash,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].robot_user_id).toBe(keyA.robotUserId);
  });

  it("touch_api_key_usage avance last_used_at via le client ANON", async () => {
    const keyHash = createHash("sha256").update(keyA.rawKey).digest("hex");
    const { error } = await createAnonClient().rpc("touch_api_key_usage", {
      p_key_hash: keyHash,
    });
    expect(error).toBeNull();

    const { data } = await getAdminClient()
      .from("api_keys")
      .select("last_used_at")
      .eq("key_hash", keyHash);
    expect(data![0].last_used_at).not.toBeNull();
  });

  it("anon n'a AUCUN acces direct a la table api_keys (moindre privilege)", async () => {
    // Post-hardening : le chemin bot passe exclusivement par les fonctions
    // SECURITY DEFINER ; un SELECT direct doit echouer au niveau des GRANTs
    // (42501), pas seulement etre filtre par la RLS.
    const { error } = await createAnonClient().from("api_keys").select("key_hash");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // permission denied
  });

  it("resolveApiKey (fonction SECURITY DEFINER) refuse une cle revoquee", async () => {
    // Note : le JWT robot etant auto-suffisant (signe independamment de la
    // ligne api_keys), la revocation est appliquee par authenticateBotRequest
    // via resolveApiKey (renvoie null si revoked_at est renseigne) — pas par
    // une policy RLS sur contacts. Ce test verifie ce mecanisme directement.
    const keyHash = createHash("sha256").update(keyA.rawKey).digest("hex");
    await getAdminClient()
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("key_hash", keyHash);

    const { data, error } = await createAnonClient().rpc("resolve_api_key", {
      p_key_hash: keyHash,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // la fonction filtre revoked_at IS NULL

    // Restaure pour ne pas affecter d'autres tests eventuels dans ce fichier.
    await getAdminClient().from("api_keys").update({ revoked_at: null }).eq("key_hash", keyHash);
  });
});
