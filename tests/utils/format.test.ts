import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils/format";

// --- Tests pour l'utilitaire de formatage monetaire ---

describe("formatCurrency", () => {
  it("formate 10000 centimes en 100,00 EUR", () => {
    // Arrange
    const amount = 10000;

    // Act
    const result = formatCurrency(amount);

    // Assert — le format exact depend de l'environnement (espace insecable possible)
    expect(result).toMatch(/100,00/);
    expect(result).toMatch(/€/);
  });

  it("formate 0 centime en 0,00 EUR", () => {
    // Arrange
    const amount = 0;

    // Act
    const result = formatCurrency(amount);

    // Assert
    expect(result).toMatch(/0,00/);
    expect(result).toMatch(/€/);
  });

  it("retourne un tiret pour null", () => {
    // Act
    const result = formatCurrency(null);

    // Assert
    expect(result).toBe("—");
  });

  it("retourne un tiret pour undefined", () => {
    // Act
    const result = formatCurrency(undefined);

    // Assert
    expect(result).toBe("—");
  });

  it("formate 9999 centimes en 99,99 EUR", () => {
    // Arrange
    const amount = 9999;

    // Act
    const result = formatCurrency(amount);

    // Assert
    expect(result).toMatch(/99,99/);
    expect(result).toMatch(/€/);
  });

  it("formate 1 centime en 0,01 EUR", () => {
    // Arrange
    const amount = 1;

    // Act
    const result = formatCurrency(amount);

    // Assert
    expect(result).toMatch(/0,01/);
    expect(result).toMatch(/€/);
  });
});
