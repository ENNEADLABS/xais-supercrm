import { z } from "zod";

// --- Schema: mise a jour de l'organisation ---

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100, "Maximum 100 caractères"),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// --- Schema: stage du pipeline ---

export const pipelineStageSchema = z.object({
  id: z.string().min(1, "ID requis"),
  label: z.string().min(1, "Label requis"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hex invalide (#RRGGBB)"),
  order: z.number().int().min(0, "Ordre >= 0"),
});

export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;

// --- Schema: configuration commerciale ---

export const commercialConfigSchema = z.object({
  quote_prefix: z.string().regex(/^[A-Z]{2,5}$/, "2 à 5 lettres majuscules"),
  invoice_prefix: z.string().regex(/^[A-Z]{2,5}$/, "2 à 5 lettres majuscules"),
  default_vat_rate: z.number().int().min(0).max(10000, "Taux TVA max 100%"),
  payment_terms_days: z.number().int().min(0).max(365, "Délai max 365 jours"),
  currency: z.enum(["EUR", "USD", "GBP", "CHF"]),
});

export type CommercialConfigInput = z.infer<typeof commercialConfigSchema>;

// --- Schema: configuration du pipeline ---

export const pipelineConfigSchema = z.object({
  pipeline_stages: z.array(pipelineStageSchema).min(2, "Minimum 2 stages"),
  probability_map: z.record(z.string(), z.number().int().min(0).max(100)),
});

export type PipelineConfigInput = z.infer<typeof pipelineConfigSchema>;

// --- Schema: informations societe (pour les PDF) ---

export const companyInfoSchema = z.object({
  legal_name: z.string().max(200, "Maximum 200 caractères"),
  address: z.string().max(300, "Maximum 300 caractères"),
  city: z.string().max(100, "Maximum 100 caractères"),
  postal_code: z.string().max(20, "Maximum 20 caractères"),
  country: z.string().max(100, "Maximum 100 caractères"),
  phone: z.string().max(30, "Maximum 30 caractères"),
  email: z.union([z.string().email("Email invalide"), z.literal("")]),
  siret: z.string().max(30, "Maximum 30 caractères"),
  vat_number: z.string().max(30, "Maximum 30 caractères"),
  capital: z.string().max(50, "Maximum 50 caractères"),
  rcs: z.string().max(50, "Maximum 50 caractères"),
  ape_code: z.string().max(10, "Maximum 10 caractères"),
  // Franchise en base de TVA (art. 293 B du CGI) : statut fiscal de
  // l'emetteur, rendu sur les PDF (mention legale + ligne TVA masquee).
  // optional (pas default) : compat configs existantes sans le champ, et
  // types input/output identiques pour zodResolver (les forms fournissent
  // false en defaultValues) — undefined est traite comme false au rendu.
  vat_exempt_293b: z.boolean().optional(),
});

export type CompanyInfoInput = z.infer<typeof companyInfoSchema>;

// --- Schema: invitation de membre ---

export const inviteMemberSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "member", "viewer"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

// --- Schema: modification du role d'un membre ---

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid("ID membre invalide"),
  role: z.enum(["admin", "member", "viewer"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
