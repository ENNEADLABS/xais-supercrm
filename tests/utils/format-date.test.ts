import { describe, it, expect, vi, afterEach } from "vitest";

import { formatRelativeDate } from "@/components/crm/utils/format-date";

/** Cree une date ISO decalee de `ms` millisecondes dans le passe */
function dateAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

// Constantes de temps en millisecondes
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

describe("formatRelativeDate", () => {
  // Verifie le format pour les dates de moins d'une minute
  it("returns 'à l'instant' for dates < 1 minute ago", () => {
    const result = formatRelativeDate(dateAgo(30 * SECOND));
    expect(result).toBe("à l'instant");
  });

  // Verifie le format pour les dates de moins d'une heure
  it("returns 'il y a X min' for dates < 1 hour ago", () => {
    const result = formatRelativeDate(dateAgo(5 * MINUTE));
    expect(result).toBe("il y a 5 min");
  });

  // Verifie le format pour les dates de moins d'un jour
  it("returns 'il y a X h' for dates < 1 day ago", () => {
    const result = formatRelativeDate(dateAgo(3 * HOUR));
    expect(result).toBe("il y a 3 h");
  });

  // Verifie le format pour les dates de moins d'un mois
  it("returns 'il y a X j' for dates < 1 month ago", () => {
    const result = formatRelativeDate(dateAgo(7 * DAY));
    expect(result).toBe("il y a 7 j");
  });

  // Verifie le format pour les dates de moins d'un an
  it("returns 'il y a X mois' for dates < 1 year ago", () => {
    const result = formatRelativeDate(dateAgo(3 * MONTH));
    expect(result).toBe("il y a 3 mois");
  });

  // Verifie le format pour les dates d'un an ou plus (singulier)
  it("returns 'il y a 1 an' for dates >= 1 year ago (singular)", () => {
    const result = formatRelativeDate(dateAgo(1 * YEAR));
    expect(result).toBe("il y a 1 an");
  });

  // Verifie le format pour les dates de plusieurs annees (pluriel)
  it("returns 'il y a X ans' for dates >= 2 years ago (plural)", () => {
    const result = formatRelativeDate(dateAgo(3 * YEAR));
    expect(result).toBe("il y a 3 ans");
  });

  // Verifie que les chaines ISO sont bien gerees
  it("handles ISO date strings", () => {
    const isoDate = dateAgo(10 * MINUTE);
    const result = formatRelativeDate(isoDate);
    expect(result).toBe("il y a 10 min");
  });

  // Verifie le cas des dates dans le futur
  it("returns 'à l'instant' for future dates", () => {
    const futureDate = new Date(Date.now() + 10 * MINUTE).toISOString();
    const result = formatRelativeDate(futureDate);
    expect(result).toBe("à l'instant");
  });
});
