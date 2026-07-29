import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";
import { getAdminClient } from "../helpers/clients";
import { seedApiKey, createRobotClient, type SeededApiKey } from "../helpers/botApi";

// RLS / RPC quotes de l'API bot (spec 025). Ce qui compte le plus :
// 1. create_quote_with_lines est SECURITY INVOKER — un p_org_id etranger doit
//    etre bloque par la policy quotes_insert (WITH CHECK), pas par du code.
// 2. Echec en cours de RPC = rollback complet (zero devis orphelin).
// 3. chk_quote_recipient : jamais un devis sans societe NI contact.
// Les routes HTTP (404 cross-org, 409 transitions) sont testees par curl reel
// (cf. Success Criteria de la spec) + tests unit du mapping.

const LINE = { description: "Prestation", quantity: 1, unit_price: 50000, vat_rate: 2000 };

describe("RLS bot API quotes", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let keyA: SeededApiKey;
  let contactAId: string;

  async function callCreateQuote(
    client: ReturnType<typeof createRobotClient>,
    orgId: string,
    overrides: {
      subject?: string;
      lines?: Record<string, unknown>[];
      validate?: boolean;
    } = {},
  ) {
    return client.rpc("create_quote_with_lines", {
      p_org_id: orgId,
      p_user_id: keyA.robotUserId,
      p_contact_id: contactAId,
      p_subject: overrides.subject ?? "Devis test",
      p_validity_days: 30,
      // Json Supabase vs objets TS : meme passage par unknown que la route
      // (structure plate serialisable, validee cote schema en amont)
      p_lines: (overrides.lines ?? [LINE]) as unknown as never,
      p_validate: overrides.validate ?? true,
    });
  }

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    keyA = await seedApiKey(orgA.orgId);

    const { data, error } = await getAdminClient()
      .from("contacts")
      .insert({ organization_id: orgA.orgId, first_name: "Client", last_name: "Particulier" })
      .select("id");
    if (error || !data?.length) throw new Error(`seed contact orgA: ${error?.message}`);
    contactAId = data[0].id;
  });

  afterAll(async () => {
    await getAdminClient().auth.admin.deleteUser(keyA.robotUserId);
    await ctx.cleanup();
  });

  it("le robot cree un devis valide (contact seul, reference generee, totaux derives)", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const { data: quoteId, error } = await callCreateQuote(client, orgA.orgId, {
      subject: "Devis contact seul",
    });
    expect(error).toBeNull();
    expect(quoteId).toBeTruthy();

    const { data: quotes } = await getAdminClient()
      .from("quotes")
      .select("status, reference, company_id, contact_id, total_ht, total_ttc")
      .eq("id", quoteId!);
    expect(quotes).toHaveLength(1);
    expect(quotes![0].status).toBe("validated");
    expect(quotes![0].reference).toMatch(/^[A-Z]{2,5}-\d{4}-\d{4}$/);
    expect(quotes![0].company_id).toBeNull();
    expect(quotes![0].contact_id).toBe(contactAId);
    expect(quotes![0].total_ht).toBe(50000);
    expect(quotes![0].total_ttc).toBe(60000);
  });

  it("le RPC refuse un p_org_id etranger (RLS quotes_insert, pas le code)", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const { error } = await callCreateQuote(client, orgB.orgId, { subject: "Intrusion" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // row-level security policy violation

    const { data } = await getAdminClient()
      .from("quotes")
      .select("id")
      .eq("organization_id", orgB.orgId);
    expect(data).toHaveLength(0);
  });

  it("echec de validation (total HT = 0) = rollback complet, zero devis orphelin", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const { error } = await callCreateQuote(client, orgA.orgId, {
      subject: "Orphelin potentiel",
      lines: [{ ...LINE, unit_price: 0 }],
      validate: true,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("total HT");

    const { data } = await getAdminClient()
      .from("quotes")
      .select("id")
      .eq("organization_id", orgA.orgId)
      .eq("subject", "Orphelin potentiel");
    expect(data).toHaveLength(0);
  });

  it("chk_quote_recipient refuse un devis sans societe NI contact (meme en admin)", async () => {
    const { error } = await getAdminClient().from("quotes").insert({
      organization_id: orgA.orgId,
      subject: "Sans destinataire",
      status: "draft",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514"); // check_violation
  });

  it("le robot de l'org A ne voit pas les devis de l'org B", async () => {
    const { data: companyB, error: companyErr } = await getAdminClient()
      .from("companies")
      .insert({ organization_id: orgB.orgId, name: "Société B" })
      .select("id");
    if (companyErr || !companyB?.length) throw new Error(`seed company B: ${companyErr?.message}`);

    const { data: quoteB, error: seedErr } = await getAdminClient()
      .from("quotes")
      .insert({
        organization_id: orgB.orgId,
        company_id: companyB[0].id,
        subject: "Devis org B",
        status: "draft",
      })
      .select("id");
    if (seedErr || !quoteB?.length) throw new Error(`seed quote orgB: ${seedErr?.message}`);

    const client = createRobotClient(keyA.robotUserId);
    const { data, error } = await client.from("quotes").select("id").eq("id", quoteB[0].id);
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filtre silencieusement
  });

  it("deux creations successives incrementent la sequence de reference", async () => {
    const client = createRobotClient(keyA.robotUserId);
    const first = await callCreateQuote(client, orgA.orgId, { subject: "Seq 1" });
    const second = await callCreateQuote(client, orgA.orgId, { subject: "Seq 2" });
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { data } = await getAdminClient()
      .from("quotes")
      .select("reference")
      .in("id", [first.data!, second.data!])
      .order("reference");
    const numbers = data!.map((q) => Number(String(q.reference).split("-").at(-1)));
    expect(numbers[1]).toBe(numbers[0] + 1);
  });
});
