import { describe, it, expect } from "vitest";
import {
  updateOrganizationSchema,
  commercialConfigSchema,
  companyInfoSchema,
  pipelineStageSchema,
  pipelineConfigSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/schemas/settings";

// --- Tests pour les schemas de validation des parametres ---

describe("updateOrganizationSchema", () => {
  it("accepte un nom valide", () => {
    // Arrange
    const input = { name: "Mon entreprise" };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mon entreprise");
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "" };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un nom trop court (1 caractere)", () => {
    // Arrange
    const input = { name: "A" };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un nom trop long (> 100 caracteres)", () => {
    // Arrange
    const input = { name: "A".repeat(101) };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un nom de 2 caracteres (limite basse)", () => {
    // Arrange
    const input = { name: "AB" };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("accepte un nom de 100 caracteres (limite haute)", () => {
    // Arrange
    const input = { name: "A".repeat(100) };

    // Act
    const result = updateOrganizationSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("commercialConfigSchema", () => {
  // Fixture valide reutilisable
  const validConfig = {
    quote_prefix: "DEV",
    invoice_prefix: "FAC",
    default_vat_rate: 2000,
    payment_terms_days: 30,
    currency: "EUR" as const,
  };

  it("accepte une configuration valide complete", () => {
    // Act
    const result = commercialConfigSchema.safeParse(validConfig);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quote_prefix).toBe("DEV");
      expect(result.data.default_vat_rate).toBe(2000);
      expect(result.data.currency).toBe("EUR");
    }
  });

  it("rejette un prefixe en minuscules", () => {
    // Arrange
    const input = { ...validConfig, quote_prefix: "dev" };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un prefixe contenant des chiffres", () => {
    // Arrange
    const input = { ...validConfig, invoice_prefix: "FA1" };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un prefixe trop court (1 lettre)", () => {
    // Arrange
    const input = { ...validConfig, quote_prefix: "D" };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un prefixe trop long (6 lettres)", () => {
    // Arrange
    const input = { ...validConfig, quote_prefix: "DEVISS" };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un taux TVA negatif", () => {
    // Arrange
    const input = { ...validConfig, default_vat_rate: -1 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un taux TVA superieur a 10000", () => {
    // Arrange
    const input = { ...validConfig, default_vat_rate: 10001 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un taux TVA a 0 (exonere)", () => {
    // Arrange
    const input = { ...validConfig, default_vat_rate: 0 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("accepte un taux TVA a 10000 (100%)", () => {
    // Arrange
    const input = { ...validConfig, default_vat_rate: 10000 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejette un delai de paiement superieur a 365 jours", () => {
    // Arrange
    const input = { ...validConfig, payment_terms_days: 366 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un delai de paiement negatif", () => {
    // Arrange
    const input = { ...validConfig, payment_terms_days: -1 };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une devise non supportee", () => {
    // Arrange
    const input = { ...validConfig, currency: "JPY" };

    // Act
    const result = commercialConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte chaque devise supportee (USD, GBP, CHF)", () => {
    // Arrange & Act & Assert
    for (const currency of ["USD", "GBP", "CHF"] as const) {
      const result = commercialConfigSchema.safeParse({
        ...validConfig,
        currency,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("companyInfoSchema — vat_exempt_293b (spec 025)", () => {
  const VALID_COMPANY_INFO = {
    legal_name: "XAIS SASU",
    address: "1 rue de la Paix",
    city: "Paris",
    postal_code: "75002",
    country: "France",
    phone: "",
    email: "",
    siret: "",
    vat_number: "",
    capital: "",
    rcs: "",
    ape_code: "",
  };

  it("accepte l'absence du champ (compat configs existantes, false implicite)", () => {
    // Act
    const result = companyInfoSchema.safeParse(VALID_COMPANY_INFO);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_exempt_293b).toBeUndefined();
    }
  });

  it("accepte vat_exempt_293b a true (franchise en base de TVA)", () => {
    // Act
    const result = companyInfoSchema.safeParse({ ...VALID_COMPANY_INFO, vat_exempt_293b: true });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_exempt_293b).toBe(true);
    }
  });
});

describe("pipelineStageSchema", () => {
  it("accepte un stage valide", () => {
    // Arrange
    const input = { id: "new", label: "Nouveau", color: "#6B7280", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("new");
      expect(result.data.label).toBe("Nouveau");
      expect(result.data.color).toBe("#6B7280");
      expect(result.data.order).toBe(0);
    }
  });

  it("rejette un id vide", () => {
    // Arrange
    const input = { id: "", label: "Nouveau", color: "#6B7280", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un label vide", () => {
    // Arrange
    const input = { id: "new", label: "", color: "#6B7280", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une couleur sans #", () => {
    // Arrange
    const input = { id: "new", label: "Nouveau", color: "6B7280", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une couleur trop courte", () => {
    // Arrange
    const input = { id: "new", label: "Nouveau", color: "#6B7", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une couleur avec caracteres invalides", () => {
    // Arrange
    const input = { id: "new", label: "Nouveau", color: "#ZZZZZZ", order: 0 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un ordre negatif", () => {
    // Arrange
    const input = { id: "new", label: "Nouveau", color: "#6B7280", order: -1 };

    // Act
    const result = pipelineStageSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("pipelineConfigSchema", () => {
  // Fixture reutilisable pour les stages
  const makeStage = (id: string, label: string, order: number) => ({
    id,
    label,
    color: "#6B7280",
    order,
  });

  it("accepte une config avec 3 stages et probability_map correspondant", () => {
    // Arrange
    const input = {
      pipeline_stages: [
        makeStage("new", "Nouveau", 0),
        makeStage("qualifying", "Qualification", 1),
        makeStage("won", "Gagne", 2),
      ],
      probability_map: { new: 10, qualifying: 30, won: 100 },
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipeline_stages).toHaveLength(3);
      expect(result.data.probability_map.won).toBe(100);
    }
  });

  it("rejette un pipeline avec un seul stage (min 2)", () => {
    // Arrange
    const input = {
      pipeline_stages: [makeStage("new", "Nouveau", 0)],
      probability_map: { new: 10 },
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un pipeline avec exactement 2 stages (limite basse)", () => {
    // Arrange
    const input = {
      pipeline_stages: [makeStage("new", "Nouveau", 0), makeStage("won", "Gagne", 1)],
      probability_map: { new: 10, won: 100 },
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejette un pipeline sans stages (tableau vide)", () => {
    // Arrange
    const input = {
      pipeline_stages: [],
      probability_map: {},
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une probabilite negative dans la map", () => {
    // Arrange
    const input = {
      pipeline_stages: [makeStage("new", "Nouveau", 0), makeStage("won", "Gagne", 1)],
      probability_map: { new: -5, won: 100 },
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une probabilite superieure a 100 dans la map", () => {
    // Arrange
    const input = {
      pipeline_stages: [makeStage("new", "Nouveau", 0), makeStage("won", "Gagne", 1)],
      probability_map: { new: 10, won: 101 },
    };

    // Act
    const result = pipelineConfigSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  it("accepte un email valide avec un role admin", () => {
    // Arrange
    const input = { email: "user@example.com", role: "admin" as const };

    // Act
    const result = inviteMemberSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.role).toBe("admin");
    }
  });

  it("accepte chaque role valide (member, viewer)", () => {
    // Arrange & Act & Assert
    for (const role of ["member", "viewer"] as const) {
      const result = inviteMemberSchema.safeParse({
        email: "test@example.com",
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejette un email invalide", () => {
    // Arrange
    const input = { email: "not-an-email", role: "admin" };

    // Act
    const result = inviteMemberSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un email vide", () => {
    // Arrange
    const input = { email: "", role: "admin" };

    // Act
    const result = inviteMemberSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un role non supporte", () => {
    // Arrange
    const input = { email: "user@example.com", role: "superadmin" };

    // Act
    const result = inviteMemberSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  it("accepte un UUID valide avec un role", () => {
    // Arrange
    const input = {
      memberId: "550e8400-e29b-41d4-a716-446655440000",
      role: "member" as const,
    };

    // Act
    const result = updateMemberRoleSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memberId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.data.role).toBe("member");
    }
  });

  it("rejette un memberId non-UUID", () => {
    // Arrange
    const input = { memberId: "not-a-uuid", role: "admin" };

    // Act
    const result = updateMemberRoleSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un memberId vide", () => {
    // Arrange
    const input = { memberId: "", role: "admin" };

    // Act
    const result = updateMemberRoleSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un role non supporte", () => {
    // Arrange
    const input = {
      memberId: "550e8400-e29b-41d4-a716-446655440000",
      role: "owner",
    };

    // Act
    const result = updateMemberRoleSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});
