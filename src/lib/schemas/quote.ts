import { z } from "zod";

// --- Schemas de validation pour les devis ---

export const quoteStatusValues = [
  "draft",
  "validated",
  "sent",
  "signed",
  "refused",
  "cancelled",
  "invoiced",
] as const;

export type QuoteStatus = (typeof quoteStatusValues)[number];

// company_id nullish depuis la spec 025 (devis pour un contact sans societe) ;
// le refine miroir de chk_quote_recipient garantit au moins un destinataire.
// Le formulaire UI garde son propre schema (societe requise), inchange.
const createQuoteFields = z.object({
  subject: z.string().min(1, "Le sujet est requis").max(500),
  company_id: z.string().uuid("ID societe invalide").nullish(),
  contact_id: z.string().uuid("ID contact invalide").nullish(),
  deal_id: z.string().uuid("ID deal invalide").nullish(),
  notes: z.string().nullish(),
  validity_days: z.number().int().min(1).max(365).default(30),
});

export const createQuoteSchema = createQuoteFields.refine(
  (data) => data.company_id != null || data.contact_id != null,
  { message: "Un destinataire est requis (societe ou contact)", path: ["company_id"] },
);

export const updateQuoteSchema = createQuoteFields.partial();

export const quoteSearchSchema = z.object({
  query: z.string().default(""),
  status: z.enum(quoteStatusValues).optional(),
  company_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Schemas pour les lignes de devis ---

export const createQuoteLineSchema = z.object({
  quote_id: z.string().uuid("ID devis invalide"),
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

export const updateQuoteLineSchema = createQuoteLineSchema.omit({ quote_id: true }).partial();

// --- Schemas de l'API bot pour les devis ---
// .strict() : une cle inconnue (ex. total_ht pre-calcule) => 400 explicite,
// jamais un strip silencieux — le CRM n'accepte que les composants de ligne.
// Divergence volontaire avec createQuoteLineSchema : vat_rate REQUIS (le
// defaut 2000 de l'UI appliquerait 20 % silencieusement a un client en
// franchise de TVA qui omet le champ — contraire a "aucune regle de prix").

export const botQuoteLineSchema = z
  .object({
    description: z.string().min(1, "La description est requise").max(1000),
    quantity: z
      .number()
      .positive("La quantite doit etre positive")
      .multipleOf(0.01, "Maximum 2 decimales"),
    unit: z.string().min(1).max(50).default("unite"),
    unit_price: z.number().int("Le prix doit etre en centimes").min(0),
    vat_rate: z
      .number()
      .int("Le taux de TVA doit etre en basis points")
      .min(0)
      .max(10000, "Le taux de TVA ne peut pas depasser 100%"),
    discount_percent: z
      .number()
      .int()
      .min(0)
      .max(10000, "La remise ne peut pas depasser 100%")
      .default(0),
  })
  .strict();

export const botCreateQuoteSchema = z
  .object({
    subject: z.string().min(1, "Le sujet est requis").max(500),
    lines: z
      .array(botQuoteLineSchema)
      .min(1, "Le devis doit contenir au moins une ligne")
      .max(100, "Maximum 100 lignes"),
    validity_days: z.number().int().min(1).max(365).default(30),
    notes: z.string().max(10000).nullish(),
    company_id: z.string().uuid("ID societe invalide").nullish(),
  })
  .strict();

export const botQuoteTransitionSchema = z
  .object({
    status: z.enum(["validated", "sent", "signed", "refused", "cancelled"]),
    refused_reason: z.string().min(1).max(1000).nullish(),
  })
  .strict()
  .refine((data) => data.refused_reason == null || data.status === "refused", {
    message: "refused_reason n'est accepte qu'avec status=refused",
    path: ["refused_reason"],
  });

// --- Types derives ---

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteSearchInput = z.infer<typeof quoteSearchSchema>;
export type CreateQuoteLineInput = z.infer<typeof createQuoteLineSchema>;
export type UpdateQuoteLineInput = z.infer<typeof updateQuoteLineSchema>;
export type BotQuoteLineInput = z.infer<typeof botQuoteLineSchema>;
export type BotCreateQuoteInput = z.infer<typeof botCreateQuoteSchema>;
export type BotQuoteTransitionInput = z.infer<typeof botQuoteTransitionSchema>;
