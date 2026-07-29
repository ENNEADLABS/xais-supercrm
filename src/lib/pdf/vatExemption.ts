// Franchise en base de TVA (art. 293 B du CGI) — spec 025 D2.
// Logique extraite des composants PDF pour etre testable unitairement.

import type { PdfDocumentData } from "./types";

export const VAT_EXEMPT_293B_MENTION = "TVA non applicable, art. 293 B du CGI";

/** Mention obligatoire des que le flag organisation est actif : la franchise
 * est un statut fiscal de l'emetteur, pas une propriete du document. */
export function showVatExemptMention(data: Pick<PdfDocumentData, "organization">): boolean {
  return data.organization.vat_exempt_293b === true;
}

/** Ligne TVA masquee seulement si le flag est actif ET la TVA est nulle.
 * Si le client API a envoye un vat_rate > 0 malgre le flag, la TVA reste
 * affichee : le CRM n'arbitre pas l'incoherence (aucune regle de prix). */
export function hideVatLine(data: Pick<PdfDocumentData, "organization" | "totalTax">): boolean {
  return data.organization.vat_exempt_293b === true && data.totalTax === 0;
}
