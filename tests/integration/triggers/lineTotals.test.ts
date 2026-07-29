import { beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type TestContext } from "../helpers/factories";
import { readInvoiceLineAsAdmin, seedCompany, seedInvoice, seedInvoiceLine } from "../helpers/seed";

// Teste le VRAI trigger SQL `calculate_invoice_line_totals` (logique de calcul
// des totaux de ligne), en lieu et place de l'ancienne réplique TS qui copiait
// la formule sans qu'aucun code de prod ne l'utilise (les totaux sont calculés
// en base). Montants en centimes, taux en basis points (2000 = 20 %).
describe("Trigger calculate_invoice_line_totals", () => {
  let ctx: TestContext;
  let invoiceId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    const tenant = await ctx.createTenant();
    const companyId = await seedCompany(tenant.orgId);
    invoiceId = await seedInvoice(tenant.orgId, companyId, { status: "draft" });
  });

  async function lineFor(overrides: {
    unit_price: number;
    quantity?: number;
    discount_percent?: number;
    vat_rate?: number;
  }) {
    const id = await seedInvoiceLine(invoiceId, overrides);
    const line = await readInvoiceLineAsAdmin(id);
    if (!line) throw new Error("ligne introuvable");
    return line;
  }

  it("sans remise ni quantité multiple (100,00 € · 20 %)", async () => {
    const line = await lineFor({ unit_price: 10000, quantity: 1, vat_rate: 2000 });
    expect(line.line_total_ht).toBe(10000);
    expect(line.line_total_tax).toBe(2000);
    expect(line.line_total_ttc).toBe(12000);
  });

  it("multiplie par la quantité (50,00 € × 3)", async () => {
    const line = await lineFor({ unit_price: 5000, quantity: 3, vat_rate: 2000 });
    expect(line.line_total_ht).toBe(15000);
    expect(line.line_total_tax).toBe(3000);
    expect(line.line_total_ttc).toBe(18000);
  });

  it("applique la remise (10 %)", async () => {
    const line = await lineFor({
      unit_price: 10000,
      quantity: 1,
      discount_percent: 1000,
      vat_rate: 2000,
    });
    expect(line.line_total_ht).toBe(9000);
    expect(line.line_total_tax).toBe(1800);
    expect(line.line_total_ttc).toBe(10800);
  });

  it("gère une quantité décimale (2,5)", async () => {
    const line = await lineFor({ unit_price: 10000, quantity: 2.5, vat_rate: 2000 });
    expect(line.line_total_ht).toBe(25000);
    expect(line.line_total_tax).toBe(5000);
    expect(line.line_total_ttc).toBe(30000);
  });

  it("TVA à 0 %", async () => {
    const line = await lineFor({ unit_price: 10000, quantity: 1, vat_rate: 0 });
    expect(line.line_total_ht).toBe(10000);
    expect(line.line_total_tax).toBe(0);
    expect(line.line_total_ttc).toBe(10000);
  });

  it("arrondit la TVA au centime (3,33 € · 20 % → 0,67 €)", async () => {
    // 333 * 2000 / 10000 = 66,6 → round → 67, grâce au cast ::numeric du trigger
    // (division entière auparavant : tronquait à 66).
    const line = await lineFor({ unit_price: 333, quantity: 1, vat_rate: 2000 });
    expect(line.line_total_ht).toBe(333);
    expect(line.line_total_tax).toBe(67);
    expect(line.line_total_ttc).toBe(400);
  });
});
