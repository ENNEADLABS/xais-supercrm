import { describe, it, expect } from "vitest";
import {
  createQuoteSchema,
  updateQuoteSchema,
  quoteSearchSchema,
  createQuoteLineSchema,
  updateQuoteLineSchema,
  botQuoteLineSchema,
  botCreateQuoteSchema,
  botQuoteTransitionSchema,
} from "@/lib/schemas/quote";

// --- Tests pour les schemas de validation des devis ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("createQuoteSchema", () => {
  it("accepte un devis minimal (subject + company_id)", () => {
    // Arrange
    const input = { subject: "Devis Acme", company_id: VALID_UUID };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Devis Acme");
      expect(result.data.company_id).toBe(VALID_UUID);
    }
  });

  it("accepte un devis avec tous les champs remplis", () => {
    // Arrange
    const input = {
      subject: "Devis complet",
      company_id: VALID_UUID,
      contact_id: VALID_UUID_2,
      deal_id: VALID_UUID_2,
      notes: "Notes du devis",
      validity_days: 60,
    };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Devis complet");
      expect(result.data.contact_id).toBe(VALID_UUID_2);
      expect(result.data.deal_id).toBe(VALID_UUID_2);
      expect(result.data.notes).toBe("Notes du devis");
      expect(result.data.validity_days).toBe(60);
    }
  });

  it("rejette un sujet vide", () => {
    // Arrange
    const input = { subject: "", company_id: VALID_UUID };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un devis sans aucun destinataire (ni societe ni contact)", () => {
    // Arrange
    const input = { subject: "Devis sans destinataire" };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un devis avec contact seul (sans societe — spec 025)", () => {
    // Arrange
    const input = { subject: "Devis particulier", contact_id: VALID_UUID_2 };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company_id).toBeUndefined();
      expect(result.data.contact_id).toBe(VALID_UUID_2);
    }
  });

  it("applique validity_days a 30 par defaut", () => {
    // Arrange
    const input = { subject: "Devis", company_id: VALID_UUID };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validity_days).toBe(30);
    }
  });

  it("rejette validity_days > 365", () => {
    // Arrange
    const input = { subject: "Devis", company_id: VALID_UUID, validity_days: 366 };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette validity_days < 1", () => {
    // Arrange
    const input = { subject: "Devis", company_id: VALID_UUID, validity_days: 0 };

    // Act
    const result = createQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("updateQuoteSchema", () => {
  it("accepte une mise a jour partielle (sujet uniquement)", () => {
    // Arrange
    const input = { subject: "Nouveau sujet" };

    // Act
    const result = updateQuoteSchema.safeParse(input);

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
    const result = updateQuoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("quoteSearchSchema", () => {
  it("applique les valeurs par defaut sur un objet vide", () => {
    // Arrange
    const input = {};

    // Act
    const result = quoteSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
    }
  });

  it("accepte tous les filtres avec des valeurs de statut valides", () => {
    // Arrange
    const input = {
      query: "acme",
      status: "sent" as const,
      company_id: VALID_UUID,
      deal_id: VALID_UUID_2,
      page: 3,
      per_page: 50,
    };

    // Act
    const result = quoteSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("acme");
      expect(result.data.status).toBe("sent");
      expect(result.data.company_id).toBe(VALID_UUID);
      expect(result.data.deal_id).toBe(VALID_UUID_2);
      expect(result.data.page).toBe(3);
      expect(result.data.per_page).toBe(50);
    }
  });
});

describe("createQuoteLineSchema", () => {
  it("accepte une ligne minimale (quote_id, description, unit_price, quantity, position)", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation conseil",
      unit_price: 10000,
      quantity: 1,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quote_id).toBe(VALID_UUID);
      expect(result.data.description).toBe("Prestation conseil");
      expect(result.data.unit_price).toBe(10000);
    }
  });

  it("accepte une ligne avec tous les champs y compris quantites decimales", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
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
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1.5);
      expect(result.data.unit).toBe("jour");
      expect(result.data.discount_percent).toBe(500);
    }
  });

  it("accepte une quantite avec 2 decimales (0.25)", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Quart heure",
      quantity: 0.25,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(0.25);
    }
  });

  it("rejette une description manquante", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un unit_price manquant", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un unit_price negatif", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: -100,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une quantite negative", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: -1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un discount_percent > 10000", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      discount_percent: 10001,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un vat_rate > 10000", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      vat_rate: 10001,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("applique vat_rate a 2000 par defaut", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_rate).toBe(2000);
    }
  });

  it("applique discount_percent a 0 par defaut", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount_percent).toBe(0);
    }
  });

  it("applique unit a 'unite' par defaut", () => {
    // Arrange
    const input = {
      quote_id: VALID_UUID,
      description: "Prestation",
      quantity: 1,
      unit_price: 10000,
      position: 0,
    };

    // Act
    const result = createQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("unite");
    }
  });
});

// --- Schemas API bot (spec 025) ---

const VALID_BOT_LINE = {
  description: "Developpement",
  quantity: 5,
  unit_price: 60000,
  vat_rate: 2000,
};

describe("botQuoteLineSchema", () => {
  it("accepte une ligne minimale et applique les defauts unit/discount", () => {
    // Act
    const result = botQuoteLineSchema.safeParse(VALID_BOT_LINE);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("unite");
      expect(result.data.discount_percent).toBe(0);
    }
  });

  it("rejette un vat_rate manquant (pas de defaut serveur — franchise TVA)", () => {
    // Arrange
    const { vat_rate: _vat_rate, ...input } = VALID_BOT_LINE;

    // Act
    const result = botQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte vat_rate 0 (franchise de TVA)", () => {
    // Act
    const result = botQuoteLineSchema.safeParse({ ...VALID_BOT_LINE, vat_rate: 0 });

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejette un total pre-calcule (cle inconnue, strict)", () => {
    // Act
    const result = botQuoteLineSchema.safeParse({ ...VALID_BOT_LINE, line_total_ht: 999 });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("botCreateQuoteSchema", () => {
  const VALID_BOT_QUOTE = { subject: "Refonte site", lines: [VALID_BOT_LINE] };

  it("accepte un devis minimal et applique validity_days a 30", () => {
    // Act
    const result = botCreateQuoteSchema.safeParse(VALID_BOT_QUOTE);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validity_days).toBe(30);
      expect(result.data.company_id).toBeUndefined();
    }
  });

  it("rejette un devis sans ligne", () => {
    // Act
    const result = botCreateQuoteSchema.safeParse({ ...VALID_BOT_QUOTE, lines: [] });

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette des totaux pre-calcules au niveau devis (strict)", () => {
    // Act
    const result = botCreateQuoteSchema.safeParse({ ...VALID_BOT_QUOTE, total_ttc: 360000 });

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette organization_id dans le body (strict — toujours resolu depuis la cle)", () => {
    // Act
    const result = botCreateQuoteSchema.safeParse({
      ...VALID_BOT_QUOTE,
      organization_id: VALID_UUID,
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un company_id optionnel valide", () => {
    // Act
    const result = botCreateQuoteSchema.safeParse({ ...VALID_BOT_QUOTE, company_id: VALID_UUID });

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("botQuoteTransitionSchema", () => {
  it.each(["validated", "sent", "signed", "cancelled"] as const)(
    "accepte la transition %s sans motif",
    (status) => {
      // Act
      const result = botQuoteTransitionSchema.safeParse({ status });

      // Assert
      expect(result.success).toBe(true);
    },
  );

  it("accepte refused avec un motif", () => {
    // Act
    const result = botQuoteTransitionSchema.safeParse({
      status: "refused",
      refused_reason: "Budget insuffisant",
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejette refused_reason avec un autre statut que refused", () => {
    // Act
    const result = botQuoteTransitionSchema.safeParse({
      status: "sent",
      refused_reason: "Motif hors sujet",
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette invoiced (conversion facture hors API bot)", () => {
    // Act
    const result = botQuoteTransitionSchema.safeParse({ status: "invoiced" });

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette draft (pas une transition cible)", () => {
    // Act
    const result = botQuoteTransitionSchema.safeParse({ status: "draft" });

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("updateQuoteLineSchema", () => {
  it("accepte une mise a jour partielle (description uniquement)", () => {
    // Arrange
    const input = { description: "Nouvelle description" };

    // Act
    const result = updateQuoteLineSchema.safeParse(input);

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
    const result = updateQuoteLineSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});
