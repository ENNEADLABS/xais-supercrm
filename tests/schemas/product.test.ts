import { describe, it, expect } from "vitest";
import { createProductSchema, updateProductSchema } from "@/lib/schemas/product";

// --- Tests pour les schemas de validation des produits ---

describe("createProductSchema", () => {
  it("accepte un produit minimal (name + unit_price)", () => {
    // Arrange
    const input = { name: "Consulting", unit_price: 50000 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Consulting");
      expect(result.data.unit_price).toBe(50000);
    }
  });

  it("accepte un produit avec tous les champs remplis", () => {
    // Arrange
    const input = {
      name: "Formation React",
      description: "Formation avancee React 3 jours",
      reference: "FORM-REACT-01",
      unit_price: 150000,
      unit: "jour",
      vat_rate: 2000,
    };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Formation React");
      expect(result.data.description).toBe("Formation avancee React 3 jours");
      expect(result.data.reference).toBe("FORM-REACT-01");
      expect(result.data.unit).toBe("jour");
      expect(result.data.vat_rate).toBe(2000);
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "", unit_price: 10000 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un unit_price negatif", () => {
    // Arrange
    const input = { name: "Produit", unit_price: -1 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un vat_rate > 10000", () => {
    // Arrange
    const input = { name: "Produit", unit_price: 10000, vat_rate: 10001 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("applique unit a 'unite' par defaut", () => {
    // Arrange
    const input = { name: "Produit", unit_price: 10000 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("unite");
    }
  });

  it("applique vat_rate a 2000 par defaut", () => {
    // Arrange
    const input = { name: "Produit", unit_price: 10000 };

    // Act
    const result = createProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_rate).toBe(2000);
    }
  });
});

describe("updateProductSchema", () => {
  it("accepte une mise a jour partielle (nom uniquement)", () => {
    // Arrange
    const input = { name: "Nouveau nom" };

    // Act
    const result = updateProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Nouveau nom");
      expect(result.data.unit_price).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("accepte un changement de statut vers archived", () => {
    // Arrange
    const input = { status: "archived" as const };

    // Act
    const result = updateProductSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("archived");
    }
  });
});
