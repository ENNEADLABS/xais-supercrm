import { describe, it, expect } from "vitest";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceSearchSchema,
  createInvoiceLineSchema,
  updateInvoiceLineSchema,
} from "@/lib/schemas/invoice";
import { createPaymentSchema } from "@/lib/schemas/payment";

// --- Tests pour les schemas de validation des factures ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("createInvoiceSchema", () => {
  it("accepte une facture minimale (subject + company_id)", () => {
    // Arrange
    const input = { subject: "Facture Acme", company_id: VALID_UUID };

    // Act
    const result = createInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Facture Acme");
      expect(result.data.company_id).toBe(VALID_UUID);
    }
  });

  it("accepte une facture avec tous les champs remplis", () => {
    // Arrange
    const input = {
      subject: "Facture complete",
      company_id: VALID_UUID,
      contact_id: VALID_UUID_2,
      deal_id: VALID_UUID_2,
      notes: "Notes de la facture",
      due_date: "2026-04-30",
    };

    // Act
    const result = createInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Facture complete");
      expect(result.data.contact_id).toBe(VALID_UUID_2);
      expect(result.data.deal_id).toBe(VALID_UUID_2);
      expect(result.data.notes).toBe("Notes de la facture");
      expect(result.data.due_date).toBe("2026-04-30");
    }
  });

  it("rejette un sujet vide", () => {
    // Arrange
    const input = { subject: "", company_id: VALID_UUID };

    // Act
    const result = createInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un company_id manquant", () => {
    // Arrange
    const input = { subject: "Facture sans societe" };

    // Act
    const result = createInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("updateInvoiceSchema", () => {
  it("accepte une mise a jour partielle (sujet uniquement)", () => {
    // Arrange
    const input = { subject: "Nouveau sujet" };

    // Act
    const result = updateInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Nouveau sujet");
      expect(result.data.company_id).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateInvoiceSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("invoiceSearchSchema", () => {
  it("applique les valeurs par defaut sur un objet vide", () => {
    // Arrange
    const input = {};

    // Act
    const result = invoiceSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
    }
  });

  it("accepte le filtre is_credit_note", () => {
    // Arrange
    const input = { is_credit_note: true };

    // Act
    const result = invoiceSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_credit_note).toBe(true);
    }
  });

  it("accepte le filtre overdue", () => {
    // Arrange
    const input = { overdue: true };

    // Act
    const result = invoiceSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overdue).toBe(true);
    }
  });
});

describe("createInvoiceLineSchema", () => {
  it("accepte une ligne minimale (invoice_id, description, unit_price, quantity, position)", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      description: "Prestation conseil",
      unit_price: 10000,
      quantity: 1,
      position: 0,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoice_id).toBe(VALID_UUID);
      expect(result.data.description).toBe("Prestation conseil");
      expect(result.data.unit_price).toBe(10000);
    }
  });

  it("accepte une ligne avec tous les champs", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      product_id: VALID_UUID_2,
      description: "Prestation demi-journee",
      quantity: 1.5,
      unit: "jour",
      unit_price: 50000,
      discount_percent: 500,
      vat_rate: 2000,
      position: 1,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1.5);
      expect(result.data.unit).toBe("jour");
      expect(result.data.discount_percent).toBe(500);
    }
  });

  it("rejette une description manquante", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un unit_price negatif", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: -100,
      position: 0,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un vat_rate > 10000", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      vat_rate: 10001,
      position: 0,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("applique vat_rate a 2000 par defaut", () => {
    // Arrange
    const input = {
      invoice_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_rate).toBe(2000);
    }
  });
});

describe("updateInvoiceLineSchema", () => {
  it("accepte une mise a jour partielle (description uniquement)", () => {
    // Arrange
    const input = { description: "Nouvelle description" };

    // Act
    const result = updateInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Nouvelle description");
      expect(result.data.unit_price).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateInvoiceLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("createPaymentSchema", () => {
  const VALID_PAYMENT = {
    invoice_id: VALID_UUID,
    amount: 5000,
    payment_date: "2026-03-25",
    payment_method: "virement" as const,
  };

  it("accepte un paiement valide", () => {
    const result = createPaymentSchema.safeParse(VALID_PAYMENT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(5000);
      expect(result.data.payment_method).toBe("virement");
    }
  });

  it("rejette un montant a zero", () => {
    const result = createPaymentSchema.safeParse({ ...VALID_PAYMENT, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejette un montant negatif", () => {
    const result = createPaymentSchema.safeParse({ ...VALID_PAYMENT, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejette une methode invalide", () => {
    const result = createPaymentSchema.safeParse({ ...VALID_PAYMENT, payment_method: "bitcoin" });
    expect(result.success).toBe(false);
  });

  it("accepte un paiement avec reference et notes", () => {
    const result = createPaymentSchema.safeParse({
      ...VALID_PAYMENT,
      reference: "VIR-2026-0042",
      notes: "Acompte initial",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference).toBe("VIR-2026-0042");
      expect(result.data.notes).toBe("Acompte initial");
    }
  });

  it("rejette une date invalide", () => {
    const result = createPaymentSchema.safeParse({
      ...VALID_PAYMENT,
      payment_date: "pas-une-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un invoice_id invalide", () => {
    const result = createPaymentSchema.safeParse({ ...VALID_PAYMENT, invoice_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
