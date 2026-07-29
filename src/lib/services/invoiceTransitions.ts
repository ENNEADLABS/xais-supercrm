import type { InvoiceStatus } from "@/lib/schemas/invoice";

// Machine à états des factures : transitions autorisées via `transitionInvoice`.
// Source de vérité unique, importée par le service ET par les tests.
//
// NB : `sent → paid/partial/overdue` est aussi déclenché automatiquement par le
// trigger SQL `recalculate_invoice_paid` lors d'un paiement ; la matrice couvre
// le guard applicatif.
export const ALLOWED_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["validated", "cancelled"],
  validated: ["sent", "cancelled"],
  sent: ["paid", "partial", "overdue", "cancelled"],
  partial: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "partial", "cancelled"],
  paid: [],
  cancelled: [],
};

export function isInvoiceTransitionAllowed(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return ALLOWED_INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}
