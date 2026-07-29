import { describe, expect, it } from "vitest";

import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfQuantity,
  formatPdfVatRate,
} from "@/lib/pdf/formatters";

describe("formatPdfCurrency", () => {
  it("formate 150000 centimes (1500,00 EUR)", () => {
    const result = formatPdfCurrency(150000);
    // Le format exact depend de la locale Node, on verifie les composants
    expect(result).toContain("1");
    expect(result).toContain("500");
    expect(result).toMatch(/€|EUR/);
  });

  it("formate 0 centimes", () => {
    const result = formatPdfCurrency(0);
    expect(result).toContain("0");
  });

  it("formate 1 centime (0,01 EUR)", () => {
    const result = formatPdfCurrency(1);
    expect(result).toMatch(/0[,.]01/);
  });

  it("formate 9999 centimes (99,99 EUR)", () => {
    const result = formatPdfCurrency(9999);
    expect(result).toMatch(/99[,.]99/);
  });

  it("formate un montant negatif (avoir)", () => {
    const result = formatPdfCurrency(-10000);
    expect(result).toContain("-");
  });
});

describe("formatPdfDate", () => {
  it("formate une date ISO avec jour, mois et annee", () => {
    const result = formatPdfDate("2026-03-25T10:00:00Z");
    expect(result).toContain("25");
    expect(result).toContain("03");
    expect(result).toContain("2026");
  });

  it("formate le 1er janvier correctement", () => {
    const result = formatPdfDate("2026-01-01T00:00:00Z");
    expect(result).toContain("01");
    expect(result).toContain("2026");
  });
});

describe("formatPdfCurrency — compatibilite WinAnsi (bug '1/150,00 €')", () => {
  // Helvetica (WinAnsi) n'a pas de glyphe pour l'espace fine insecable U+202F
  // produite par Intl fr-FR : rendue "/" (byte bas 0x2F) dans les PDF prod.
  it("ne contient jamais U+202F ni U+00A0 (glyphes absents de Helvetica)", () => {
    const result = formatPdfCurrency(115000);
    expect(result).not.toMatch(/[\u202F\u00A0]/);
  });

  it("formate 115000 centimes en '1 150,00 €' avec espaces simples U+0020", () => {
    expect(formatPdfCurrency(115000)).toBe("1 150,00 €");
  });

  it("formate 180000 centimes en '1 800,00 €' (cas du rapport prod)", () => {
    expect(formatPdfCurrency(180000)).toBe("1 800,00 €");
  });
});

describe("formatPdfVatRate", () => {
  it("utilise la virgule decimale en francais ('20,00 %', pas '20.00 %')", () => {
    expect(formatPdfVatRate(2000)).toBe("20,00 %");
  });

  it("utilise la virgule pour la quantite decimale francaise aussi", () => {
    expect(formatPdfQuantity(2.5)).toBe("2,50");
  });

  it("formate 2000 basis points en 20.00%", () => {
    const result = formatPdfVatRate(2000);
    expect(result).toMatch(/20[,.]00\s?%/);
  });

  it("formate 550 basis points en 5.50%", () => {
    const result = formatPdfVatRate(550);
    expect(result).toMatch(/5[,.]50\s?%/);
  });

  it("formate 0 basis points en 0.00%", () => {
    const result = formatPdfVatRate(0);
    expect(result).toMatch(/0[,.]00\s?%/);
  });

  it("formate 10000 basis points en 100.00%", () => {
    const result = formatPdfVatRate(10000);
    expect(result).toMatch(/100[,.]00\s?%/);
  });
});

describe("formatPdfQuantity", () => {
  it("formate un entier sans decimales", () => {
    expect(formatPdfQuantity(1)).toBe("1");
  });

  it("formate un decimal avec 2 chiffres", () => {
    expect(formatPdfQuantity(2.5)).toMatch(/2[,.]50/);
  });

  it("formate un petit decimal", () => {
    expect(formatPdfQuantity(0.25)).toMatch(/0[,.]25/);
  });

  it("formate un grand entier sans decimales", () => {
    expect(formatPdfQuantity(100)).toBe("100");
  });
});
