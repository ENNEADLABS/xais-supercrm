import { z } from "zod";

// --- Schemas de validation pour les societes ---

const entityStatusEnum = z.enum(["active", "archived"]);

// Validation formats PME FR
const sirenSchema = z
  .string()
  .regex(/^\d{9}$/, "Le SIREN doit contenir exactement 9 chiffres")
  .nullish();

const siretSchema = z
  .string()
  .regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres")
  .nullish();

const vatNumberSchema = z
  .string()
  .regex(/^FR\d{11}$/, "Format TVA : FR + 11 chiffres")
  .nullish();

const nafCodeSchema = z
  .string()
  .regex(/^\d{4}[A-Z]$/, "Format NAF : 4 chiffres + 1 lettre (ex: 6201Z)")
  .nullish();

// Schema de base sans refinement (pour .partial())
const companyBaseSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  domain: z.string().max(253).nullish(),
  industry: z.string().max(100).nullish(),
  size: z.string().max(50).nullish(),
  address: z.string().max(300).nullish(),
  city: z.string().max(100).nullish(),
  postal_code: z.string().max(20).nullish(),
  country: z.string().max(100).nullish(),
  phone: z.string().max(50).nullish(),
  website: z.string().url("URL invalide").nullish(),
  // Champs PME FR
  siren: sirenSchema,
  siret: siretSchema,
  vat_number: vatNumberSchema,
  legal_form: z.string().max(50).nullish(),
  capital: z.number().int().min(0).nullish(),
  naf_code: nafCodeSchema,
  status: entityStatusEnum.default("active"),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

// Validation coherence croisee SIREN/SIRET/TVA
function validateFrCoherence(
  data: { siren?: string | null; siret?: string | null; vat_number?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.siren && data.siret && data.siret.slice(0, 9) !== data.siren) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Les 9 premiers chiffres du SIRET doivent correspondre au SIREN",
      path: ["siret"],
    });
  }
  if (data.siren && data.vat_number && data.vat_number.slice(-9) !== data.siren) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Les 9 derniers chiffres du numero TVA doivent correspondre au SIREN",
      path: ["vat_number"],
    });
  }
}

export const createCompanySchema = companyBaseSchema.superRefine(validateFrCoherence);

export const updateCompanySchema = companyBaseSchema.partial().superRefine(validateFrCoherence);

export const companySearchSchema = z.object({
  query: z.string().default(""),
  status: entityStatusEnum.optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Types derives ---

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanySearchInput = z.infer<typeof companySearchSchema>;
