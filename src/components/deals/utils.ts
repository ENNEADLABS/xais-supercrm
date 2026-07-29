/**
 * Formate un montant en centimes vers un affichage EUR.
 */
export function formatCurrency(amountInCents: number): string {
  return (amountInCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}
