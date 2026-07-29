import { describe, it, expect } from "vitest";
import {
  ALLOWED_INVOICE_TRANSITIONS,
  isInvoiceTransitionAllowed,
} from "@/lib/services/invoiceTransitions";
import type { InvoiceStatus } from "@/lib/schemas/invoice";

// Teste la VRAIE machine à états importée du service (plus de réplique locale).
const ALL_STATUSES = Object.keys(ALLOWED_INVOICE_TRANSITIONS) as InvoiceStatus[];

describe("isInvoiceTransitionAllowed", () => {
  describe("transitions valides", () => {
    const validTransitions: [InvoiceStatus, InvoiceStatus][] = [
      ["draft", "validated"],
      ["draft", "cancelled"],
      ["validated", "sent"],
      ["validated", "cancelled"],
      ["sent", "paid"],
      ["sent", "partial"],
      ["sent", "overdue"],
      ["sent", "cancelled"],
      ["partial", "paid"],
      ["partial", "overdue"],
      ["partial", "cancelled"],
      ["overdue", "paid"],
      ["overdue", "partial"],
      ["overdue", "cancelled"],
    ];

    it.each(validTransitions)("autorise %s -> %s", (from, to) => {
      expect(isInvoiceTransitionAllowed(from, to)).toBe(true);
    });
  });

  describe("transitions invalides", () => {
    const invalidTransitions: [InvoiceStatus, InvoiceStatus][] = [
      // Sauts interdits depuis draft
      ["draft", "sent"],
      ["draft", "paid"],
      ["draft", "partial"],
      ["draft", "overdue"],
      // Sauts/retours interdits depuis validated
      ["validated", "paid"],
      ["validated", "draft"],
      // Retours interdits
      ["sent", "draft"],
      ["sent", "validated"],
      ["partial", "draft"],
      ["partial", "validated"],
      ["overdue", "draft"],
      ["overdue", "validated"],
    ];

    it.each(invalidTransitions)("interdit %s -> %s", (from, to) => {
      expect(isInvoiceTransitionAllowed(from, to)).toBe(false);
    });
  });

  describe("états terminaux", () => {
    it.each(["paid", "cancelled"] as InvoiceStatus[])(
      "%s n'a aucune transition possible",
      (from) => {
        const possible = ALL_STATUSES.filter((to) => isInvoiceTransitionAllowed(from, to));
        expect(possible).toHaveLength(0);
      },
    );
  });
});
