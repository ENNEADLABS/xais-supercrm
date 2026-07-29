import { z } from "zod";

// --- Schemas de validation pour les paiements ---

export const paymentMethodValues = [
  "virement",
  "cheque",
  "carte",
  "prelevement",
  "especes",
  "autre",
] as const;

export type PaymentMethod = (typeof paymentMethodValues)[number];

export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid("ID facture invalide"),
  amount: z.number().int().min(1, "Le montant doit etre positif"),
  payment_date: z.string().date("Date de paiement invalide"),
  payment_method: z.enum(paymentMethodValues).default("virement"),
  reference: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const updatePaymentSchema = createPaymentSchema.omit({ invoice_id: true }).partial();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
