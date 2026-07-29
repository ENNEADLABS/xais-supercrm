/**
 * Formate un montant en centimes vers un affichage EUR.
 * Retourne "—" si le montant est null ou undefined.
 */
export function formatCurrency(amountInCents: number | null | undefined): string {
  if (amountInCents == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountInCents / 100);
}

/**
 * Echappe les caracteres speciaux LIKE/ILIKE de PostgreSQL.
 * Utiliser avant d'interpoler une valeur utilisateur dans un pattern ILIKE.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
