import { describe, it, expect } from "vitest";
import {
  createCompanySchema,
  updateCompanySchema,
  companySearchSchema,
} from "@/lib/schemas/company";

// --- Tests pour les schemas de validation des societes ---

describe("createCompanySchema", () => {
  it("accepte une societe minimale (nom uniquement)", () => {
    // Arrange
    const input = { name: "Acme Corp" };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Corp");
      expect(result.data.status).toBe("active");
    }
  });

  it("accepte une societe avec tous les champs remplis", () => {
    // Arrange
    const input = {
      name: "TechCorp SAS",
      domain: "techcorp.fr",
      industry: "SaaS",
      size: "50-100",
      address: "12 rue de la Paix",
      city: "Paris",
      postal_code: "75002",
      country: "France",
      phone: "+33 0 00 00 00 00",
      website: "https://techcorp.fr",
      status: "archived" as const,
      custom_fields: { siret: "12345678901234" },
    };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("TechCorp SAS");
      expect(result.data.domain).toBe("techcorp.fr");
      expect(result.data.website).toBe("https://techcorp.fr");
      expect(result.data.status).toBe("archived");
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "" };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette une URL de site web invalide", () => {
    // Arrange
    const input = { name: "Acme", website: "pas-une-url" };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un website null", () => {
    // Arrange
    const input = { name: "Acme", website: null };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBeNull();
    }
  });

  it("applique le statut 'active' par defaut", () => {
    // Arrange
    const input = { name: "Acme" };

    // Act
    const result = createCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });
});

describe("createCompanySchema — champs PME FR", () => {
  it("accepte un SIREN valide (9 chiffres)", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un SIREN trop court", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un SIREN avec des lettres", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "ABCDEFGHI",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un SIRET valide (14 chiffres)", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siret: "12345678901234",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un SIRET trop long", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siret: "1234567890123456",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un SIREN + SIRET coherents", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "123456789",
      siret: "12345678900010",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un SIREN/SIRET incoherents", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "999999999",
      siret: "12345678900010",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un numero TVA valide (FR + 11 chiffres)", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      vat_number: "FR32123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un numero TVA sans prefixe FR", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      vat_number: "DE123456789",
    });
    expect(result.success).toBe(false);
  });

  it("accepte TVA + SIREN coherents", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "123456789",
      vat_number: "FR32123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejette TVA/SIREN incoherents", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      siren: "999999999",
      vat_number: "FR32123456789",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un code NAF valide (4 chiffres + 1 lettre)", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      naf_code: "6201Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un code NAF invalide", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      naf_code: "620Z1",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un capital en centimes", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      capital: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it("rejette un capital negatif", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      capital: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepte tous les champs FR remplis et coherents", () => {
    const result = createCompanySchema.safeParse({
      name: "TechCorp SAS",
      siren: "123456789",
      siret: "12345678900010",
      vat_number: "FR32123456789",
      legal_form: "SAS",
      capital: 5000000,
      naf_code: "6201Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepte tous les champs FR a null", () => {
    const result = createCompanySchema.safeParse({
      name: "Micro-entreprise",
      siren: null,
      siret: null,
      vat_number: null,
      legal_form: null,
      capital: null,
      naf_code: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCompanySchema", () => {
  it("accepte une mise a jour partielle", () => {
    // Arrange
    const input = { name: "Nouveau Nom" };

    // Act
    const result = updateCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Nouveau Nom");
      expect(result.data.domain).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateCompanySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("companySearchSchema", () => {
  it("applique les valeurs par defaut sur un objet vide", () => {
    // Arrange
    const input = {};

    // Act
    const result = companySearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
    }
  });
});
