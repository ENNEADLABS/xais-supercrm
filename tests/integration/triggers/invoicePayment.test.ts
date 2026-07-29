import { beforeAll, describe, expect, it } from "vitest";
import { getAdminClient } from "../helpers/clients";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";
import {
  readInvoiceAsAdmin,
  seedCompany,
  seedInvoice,
  seedInvoiceLine,
  seedPayment,
} from "../helpers/seed";

// Teste le VRAI trigger SQL `recalculate_invoice_paid` (statut + paid_amount
// recalculés à chaque paiement), en lieu et place de l'ancienne réplique TS qui
// copiait la logique sans contrepartie en prod (tout se passe en base).
describe("Trigger recalculate_invoice_paid", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let companyId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    companyId = await seedCompany(orgA.orgId);
  });

  // Facture "sent" avec total_ttc = 12000 (1 ligne 100,00 € · 20 %).
  async function createSentInvoice(): Promise<string> {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, { status: "draft" });
    await seedInvoiceLine(invoiceId, { unit_price: 10000, quantity: 1, vat_rate: 2000 });
    const { error } = await getAdminClient()
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId);
    if (error) throw new Error(`passage en sent: ${error.message}`);
    return invoiceId;
  }

  it("paiement complet → paid + paid_amount + paid_at", async () => {
    const invoiceId = await createSentInvoice();
    await seedPayment(orgA.orgId, invoiceId, 12000);

    const invoice = await readInvoiceAsAdmin(invoiceId);
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paid_amount).toBe(12000);
    expect(invoice?.paid_at).not.toBeNull();
  });

  it("paiement partiel → partial", async () => {
    const invoiceId = await createSentInvoice();
    await seedPayment(orgA.orgId, invoiceId, 5000);

    const invoice = await readInvoiceAsAdmin(invoiceId);
    expect(invoice?.status).toBe("partial");
    expect(invoice?.paid_amount).toBe(5000);
  });

  it("surpaiement → paid (paid_amount = somme reçue)", async () => {
    const invoiceId = await createSentInvoice();
    await seedPayment(orgA.orgId, invoiceId, 15000);

    const invoice = await readInvoiceAsAdmin(invoiceId);
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paid_amount).toBe(15000);
  });

  it("paiements cumulés atteignant le total → paid", async () => {
    const invoiceId = await createSentInvoice();
    await seedPayment(orgA.orgId, invoiceId, 5000);
    await seedPayment(orgA.orgId, invoiceId, 7000);

    const invoice = await readInvoiceAsAdmin(invoiceId);
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paid_amount).toBe(12000);
  });

  it("facture draft : paid_amount mis à jour mais statut inchangé", async () => {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, { status: "draft" });
    await seedInvoiceLine(invoiceId, { unit_price: 10000, quantity: 1, vat_rate: 2000 });
    await seedPayment(orgA.orgId, invoiceId, 12000);

    const invoice = await readInvoiceAsAdmin(invoiceId);
    expect(invoice?.status).toBe("draft");
    expect(invoice?.paid_amount).toBe(12000);
  });
});
