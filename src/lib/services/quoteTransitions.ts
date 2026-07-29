import type { QuoteStatus } from "@/lib/schemas/quote";

// Machine à états des devis : transitions autorisées via `transitionQuote`.
// Source de vérité unique, importée par le service ET par les tests.
//
// NB : la conversion devis→facture passe par le RPC `convert_quote_to_invoice`
// qui force `status = 'invoiced'` HORS de ce guard. `signed → invoiced` n'est
// donc volontairement pas une transition de cette matrice.
export const ALLOWED_QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["validated", "cancelled"],
  validated: ["sent", "cancelled"],
  sent: ["signed", "refused", "cancelled"],
  signed: ["cancelled"],
  refused: ["cancelled"],
  cancelled: [],
  invoiced: [],
};

export function isQuoteTransitionAllowed(from: QuoteStatus, to: QuoteStatus): boolean {
  return ALLOWED_QUOTE_TRANSITIONS[from]?.includes(to) ?? false;
}
