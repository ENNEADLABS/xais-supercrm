import { z } from "zod";

// --- Schemas de validation pour les factures ---

export const invoiceStatusValues = [
  "draft",
  "validated",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof invoiceStatusValues)[number];

export const createInvoiceSchema = z.object({
  subject: z.string().min(1, "Le sujet est requis").max(500),
  company_id: z.string().uuid("ID societe invalide"),
  contact_id: z.string().uuid("ID contact invalide").nullish(),
  deal_id: z.string().uuid("ID deal invalide").nullish(),
  notes: z.string().nullish(),
  due_date: z.string().date("Date d'echeance invalide").nullish(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const invoiceSearchSchema = z.object({
  query: z.string().default(""),
  status: z.enum(invoiceStatusValues).optional(),
  company_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  is_credit_note: z.boolean().optional(),
  overdue: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Schemas pour les lignes de facture ---

export const createInvoiceLineSchema = z.object({
  invoice_id: z.string().uuid("ID facture invalide"),
  product_id: z.string().uuid("ID produit invalide").nullish(),
  description: z.string().min(1, "La description est requise"),
  quantity: z
    .number()
    .positive("La quantite doit etre positive")
    .multipleOf(0.01, "Maximum 2 decimales"),
  unit: z.string().default("unite"),
  unit_price: z.number().int("Le prix doit etre en centimes").min(0),
  discount_percent: z
    .number()
    .int()
    .min(0)
    .max(10000, "La remise ne peut pas depasser 100%")
    .default(0),
  vat_rate: z.number().int().min(0).max(10000).default(2000),
  position: z.number().int().min(0),
});

export const updateInvoiceLineSchema = createInvoiceLineSchema.omit({ invoice_id: true }).partial();

// --- Types derives ---

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceSearchInput = z.infer<typeof invoiceSearchSchema>;
export type CreateInvoiceLineInput = z.infer<typeof createInvoiceLineSchema>;
export type UpdateInvoiceLineInput = z.infer<typeof updateInvoiceLineSchema>;
