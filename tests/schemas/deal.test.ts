import { describe, it, expect } from "vitest";
import {
  createDealSchema,
  updateDealSchema,
  moveDealSchema,
  closeDealSchema,
  dealSearchSchema,
} from "@/lib/schemas/deal";

// --- Tests pour les schemas de validation des deals ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createDealSchema", () => {
  it("accepte un deal minimal (name + company_id uniquement)", () => {
    // Arrange
    const input = { name: "Deal Acme", company_id: VALID_UUID };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Deal Acme");
      expect(result.data.company_id).toBe(VALID_UUID);
      expect(result.data.stage).toBe("new");
    }
  });

  it("accepte un deal avec tous les champs remplis", () => {
    // Arrange
    const input = {
      name: "Deal complet",
      company_id: VALID_UUID,
      stage: "qualifying",
      amount: 50000,
      probability: 75,
      expected_close_date: "2026-06-30",
      assigned_to: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(50000);
      expect(result.data.probability).toBe(75);
      expect(result.data.stage).toBe("qualifying");
      expect(result.data.expected_close_date).toBe("2026-06-30");
      expect(result.data.assigned_to).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "", company_id: VALID_UUID };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un company_id manquant", () => {
    // Arrange
    const input = { name: "Deal sans societe" };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un company_id qui n'est pas un UUID", () => {
    // Arrange
    const input = { name: "Deal", company_id: "pas-un-uuid" };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un montant decimal (doit etre entier, en centimes)", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID, amount: 99.99 };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une probabilite > 100", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID, probability: 101 };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une probabilite < 0", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID, probability: -1 };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte une probabilite a exactement 0", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID, probability: 0 };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.probability).toBe(0);
    }
  });

  it("accepte une probabilite a exactement 100", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID, probability: 100 };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.probability).toBe(100);
    }
  });

  it("applique le stage 'new' par defaut", () => {
    // Arrange
    const input = { name: "Deal", company_id: VALID_UUID };

    // Act
    const result = createDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe("new");
    }
  });

  it("accepte un montant null ou undefined", () => {
    // Arrange
    const inputNull = { name: "Deal", company_id: VALID_UUID, amount: null };
    const inputUndefined = { name: "Deal", company_id: VALID_UUID };

    // Act
    const resultNull = createDealSchema.safeParse(inputNull);
    const resultUndefined = createDealSchema.safeParse(inputUndefined);

    // Assert
    expect(resultNull.success).toBe(true);
    expect(resultUndefined.success).toBe(true);
  });
});

describe("updateDealSchema", () => {
  it("accepte une mise a jour partielle (nom uniquement)", () => {
    // Arrange
    const input = { name: "Nouveau nom" };

    // Act
    const result = updateDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Nouveau nom");
      expect(result.data.company_id).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("moveDealSchema", () => {
  it("accepte un stage + position valides", () => {
    // Arrange
    const input = { stage: "qualifying", position: 2 };

    // Act
    const result = moveDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe("qualifying");
      expect(result.data.position).toBe(2);
    }
  });

  it("rejette un stage manquant", () => {
    // Arrange
    const input = { position: 0 };

    // Act
    const result = moveDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une position manquante", () => {
    // Arrange
    const input = { stage: "qualifying" };

    // Act
    const result = moveDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une position negative", () => {
    // Arrange
    const input = { stage: "qualifying", position: -1 };

    // Act
    const result = moveDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("closeDealSchema", () => {
  it("accepte deal_status 'won' sans lost_reason", () => {
    // Arrange
    const input = { deal_status: "won" as const };

    // Act
    const result = closeDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("accepte deal_status 'lost' avec lost_reason", () => {
    // Arrange
    const input = { deal_status: "lost" as const, lost_reason: "Budget insuffisant" };

    // Act
    const result = closeDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejette deal_status 'lost' sans lost_reason (refine)", () => {
    // Arrange
    const input = { deal_status: "lost" as const };

    // Act
    const result = closeDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      const lostReasonError = result.error.issues.find((i) => i.path.includes("lost_reason"));
      expect(lostReasonError).toBeDefined();
    }
  });

  it("rejette un deal_status hors enum", () => {
    // Arrange
    const input = { deal_status: "cancelled" };

    // Act
    const result = closeDealSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("dealSearchSchema", () => {
  it("applique les valeurs par defaut sur un objet vide", () => {
    // Arrange
    const input = {};

    // Act
    const result = dealSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
    }
  });

  it("accepte tous les filtres remplis", () => {
    // Arrange
    const input = {
      query: "acme",
      stage: "proposal",
      deal_status: "open" as const,
      company_id: VALID_UUID,
      assigned_to: VALID_UUID,
      page: 2,
      per_page: 50,
    };

    // Act
    const result = dealSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("acme");
      expect(result.data.stage).toBe("proposal");
      expect(result.data.deal_status).toBe("open");
      expect(result.data.page).toBe(2);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("coerce une page string en number", () => {
    // Arrange
    const input = { page: "3" };

    // Act
    const result = dealSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejette per_page > 100", () => {
    // Arrange
    const input = { per_page: 101 };

    // Act
    const result = dealSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});
