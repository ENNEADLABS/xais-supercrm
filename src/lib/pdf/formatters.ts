// Fonctions de formatage pour les documents PDF

// Les PDF utilisent Helvetica (police standard, encodage WinAnsi) : l'espace
// fine insecable U+202F produite par Intl fr-FR comme separateur de milliers
// n'y a pas de glyphe — rendue via son byte bas (0x2F), elle s'affichait "/"
// ("1/150,00 €") en Helvetica, ou disparaissait en Helvetica-Bold. Tout
// espace Unicode est donc normalise vers l'espace simple U+0020, seul glyphe
// d'espacement garanti par WinAnsi.
function toWinAnsiSpaces(formatted: string): string {
  return formatted.replace(/[\u202F\u00A0]/g, " ");
}

/** Formate un montant en centimes vers une devise lisible */
export function formatPdfCurrency(cents: number, locale = "fr-FR", currency = "EUR"): string {
  return toWinAnsiSpaces(
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100),
  );
}

/** Formate une date ISO en date locale */
export function formatPdfDate(isoDate: string, locale = "fr-FR"): string {
  return new Date(isoDate).toLocaleDateString(locale);
}

/** Formate un taux de TVA en basis points vers pourcentage (separateur decimal
 * de la locale du document — "20,00 %" en francais, pas "20.00 %") */
export function formatPdfVatRate(basisPoints: number, locale = "fr-FR"): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / 100);
  return `${toWinAnsiSpaces(formatted)} %`;
}

/** Formate une quantite (entier sans decimales, sinon 2 decimales,
 * separateur de la locale du document) */
export function formatPdfQuantity(qty: number, locale = "fr-FR"): string {
  const digits = qty % 1 === 0 ? 0 : 2;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(qty);
  return toWinAnsiSpaces(formatted);
}
