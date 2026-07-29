import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { seedCompany, seedInvoice, seedInvoiceLine } from "../helpers/seed";

// `invoice_lines` n'a pas de colonne organization_id : sa RLS cascade via le
// parent (`invoice_id in (select id from invoices where organization_id = ...)`).
// On vérifie que l'isolation et la matrice de rôles tiennent à travers le parent.
describe("RLS invoice_lines — isolation en cascade via la facture parente", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let orgB: Tenant;
  let viewer: TestUser;
  let member: TestUser;
  let invoiceAId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    orgB = await ctx.createTenant();
    viewer = await ctx.addMember(orgA.orgId, "viewer");
    member = await ctx.addMember(orgA.orgId, "member");
    const companyAId = await seedCompany(orgA.orgId);
    invoiceAId = await seedInvoice(orgA.orgId, companyAId, { status: "draft" });
    await seedInvoiceLine(invoiceAId);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("une autre org ne voit pas les lignes via la facture d'autrui", async () => {
    const clientB = await ctx.authClientFor(orgB.owner);

    const { data } = await clientB.from("invoice_lines").select("id").eq("invoice_id", invoiceAId);

    expect(data).toEqual([]);
  });

  it("un viewer ne peut pas ajouter de ligne", async () => {
    const client = await ctx.authClientFor(viewer);

    const { error } = await client
      .from("invoice_lines")
      .insert({ invoice_id: invoiceAId, description: "Ligne viewer", unit_price: 5000 });

    expect(error).not.toBeNull();
  });

  it("un member peut ajouter une ligne à une facture de son org", async () => {
    const client = await ctx.authClientFor(member);

    const { data, error } = await client
      .from("invoice_lines")
      .insert({ invoice_id: invoiceAId, description: "Ligne member", unit_price: 5000 })
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un member ne peut pas ajouter de ligne à la facture d'une autre org", async () => {
    const clientB = await ctx.authClientFor(orgB.owner);

    const { error } = await clientB
      .from("invoice_lines")
      .insert({ invoice_id: invoiceAId, description: "Intrusion", unit_price: 5000 });

    expect(error).not.toBeNull();
  });
});
