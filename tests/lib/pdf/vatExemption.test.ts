import { describe, expect, it } from "vitest";

import { showVatExemptMention, hideVatLine } from "@/lib/pdf/vatExemption";

// Franchise en base de TVA (art. 293 B) — spec 025 D2 : mention pilotee par
// le flag organisation, ligne TVA masquee seulement si flag ET TVA nulle.

const ORG_EXEMPT = { name: "XAIS", vat_exempt_293b: true };
const ORG_NORMAL = { name: "XAIS" };

describe("showVatExemptMention", () => {
  it("affiche la mention quand le flag organisation est actif", () => {
    expect(showVatExemptMention({ organization: ORG_EXEMPT })).toBe(true);
  });

  it("pas de mention sans flag (configs existantes, undefined = false)", () => {
    expect(showVatExemptMention({ organization: ORG_NORMAL })).toBe(false);
  });

  it("pas de mention si flag explicitement false", () => {
    expect(showVatExemptMention({ organization: { name: "XAIS", vat_exempt_293b: false } })).toBe(
      false,
    );
  });
});

describe("hideVatLine", () => {
  it("masque la ligne TVA si flag actif et TVA nulle", () => {
    expect(hideVatLine({ organization: ORG_EXEMPT, totalTax: 0 })).toBe(true);
  });

  it("garde la ligne TVA si flag actif mais TVA > 0 (incoherence client, pas d'arbitrage)", () => {
    expect(hideVatLine({ organization: ORG_EXEMPT, totalTax: 6600 })).toBe(false);
  });

  it("garde la ligne TVA sans flag, meme a TVA nulle (export, autoliquidation...)", () => {
    expect(hideVatLine({ organization: ORG_NORMAL, totalTax: 0 })).toBe(false);
  });
});
