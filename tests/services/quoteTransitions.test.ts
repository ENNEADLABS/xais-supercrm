import { describe, it, expect } from "vitest";
import {
  ALLOWED_QUOTE_TRANSITIONS,
  isQuoteTransitionAllowed,
} from "@/lib/services/quoteTransitions";
import type { QuoteStatus } from "@/lib/schemas/quote";

// Teste la VRAIE machine à états importée du service (plus de réplique locale).
const ALL_STATUSES = Object.keys(ALLOWED_QUOTE_TRANSITIONS) as QuoteStatus[];

describe("isQuoteTransitionAllowed", () => {
  describe("transitions valides", () => {
    const validTransitions: [QuoteStatus, QuoteStatus][] = [
      ["draft", "validated"],
      ["draft", "cancelled"],
      ["validated", "sent"],
      ["validated", "cancelled"],
      ["sent", "signed"],
      ["sent", "refused"],
      ["sent", "cancelled"],
      ["signed", "cancelled"],
      ["refused", "cancelled"],
    ];

    it.each(validTransitions)("autorise %s -> %s", (from, to) => {
      expect(isQuoteTransitionAllowed(from, to)).toBe(true);
    });
  });

  describe("transitions invalides", () => {
    const invalidTransitions: [QuoteStatus, QuoteStatus][] = [
      // Sauts interdits
      ["draft", "sent"],
      ["draft", "signed"],
      ["validated", "signed"],
      // Retours interdits — aucun flux "reopen" implémenté
      ["validated", "draft"],
      ["sent", "draft"],
      ["signed", "draft"],
      ["cancelled", "draft"],
      ["refused", "signed"],
      // signed -> invoiced ne passe PAS par le guard : c'est le RPC
      // convert_quote_to_invoice qui force le statut (hors state-machine).
      ["signed", "invoiced"],
      // cancelled est terminal
      ["cancelled", "validated"],
      ["cancelled", "sent"],
      ["cancelled", "signed"],
    ];

    it.each(invalidTransitions)("interdit %s -> %s", (from, to) => {
      expect(isQuoteTransitionAllowed(from, to)).toBe(false);
    });
  });

  describe("états terminaux", () => {
    it.each(["invoiced", "cancelled"] as QuoteStatus[])(
      "%s n'a aucune transition possible",
      (from) => {
        const possible = ALL_STATUSES.filter((to) => isQuoteTransitionAllowed(from, to));
        expect(possible).toHaveLength(0);
      },
    );
  });
});
