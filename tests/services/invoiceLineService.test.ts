import { describe, expect, it } from "vitest";
import { buildInvoiceLineFromProduct } from "@/lib/services/invoiceLineService";

describe("invoiceLineService.buildInvoiceLineFromProduct", () => {
  it("reprend les donnees commerciales du produit catalogue", () => {
    const line = buildInvoiceLineFromProduct(
      "11111111-1111-4111-8111-111111111111",
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Accompagnement CRM",
        unit: "jour",
        unit_price: 125_000,
        vat_rate: 2_000,
      },
      3,
      4,
    );

    expect(line).toEqual({
      invoice_id: "11111111-1111-4111-8111-111111111111",
      product_id: "22222222-2222-4222-8222-222222222222",
      description: "Accompagnement CRM",
      quantity: 3,
      unit: "jour",
      unit_price: 125_000,
      discount_percent: 0,
      vat_rate: 2_000,
      position: 4,
    });
  });

  it("utilise une unite par defaut quand le produit n'en fournit pas", () => {
    const line = buildInvoiceLineFromProduct(
      "11111111-1111-4111-8111-111111111111",
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Audit",
        unit: null,
        unit_price: 50_000,
        vat_rate: 2_000,
      },
      1,
      0,
    );

    expect(line.unit).toBe("unite");
  });
});
