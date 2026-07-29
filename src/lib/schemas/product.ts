import { z } from "zod";

// --- Schemas de validation pour les produits ---

export const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().nullish(),
  reference: z.string().max(50).nullish(),
  unit_price: z
    .number()
    .int("Le prix doit etre en centimes")
    .min(0, "Le prix ne peut pas etre negatif"),
  unit: z.string().default("unite"),
  vat_rate: z
    .number()
    .int()
    .min(0, "Le taux de TVA ne peut pas etre negatif")
    .max(10000, "Le taux de TVA ne peut pas depasser 100%")
    .default(2000),
});

export const updateProductSchema = createProductSchema
  .extend({
    status: z.enum(["active", "archived"]).optional(),
  })
  .partial();

export const productSearchSchema = z.object({
  query: z.string().default(""),
  status: z.enum(["active", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Types derives ---

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
