import { z } from "zod";

// --- Schemas de validation pour les deals ---

export const createDealSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  company_id: z.string().uuid("ID societe invalide"),
  stage: z.string().default("new"),
  amount: z.number().int().min(0).nullish(),
  probability: z.number().int().min(0).max(100).nullish(),
  expected_close_date: z.string().nullish(),
  assigned_to: z.string().uuid().nullish(),
});

export const updateDealSchema = createDealSchema.partial();

export const moveDealSchema = z.object({
  stage: z.string().min(1, "Le stage est requis"),
  position: z.number().int().min(0),
});

export const closeDealSchema = z
  .object({
    deal_status: z.enum(["won", "lost"]),
    lost_reason: z.string().min(1).max(500).nullish(),
  })
  .refine(
    (data) =>
      data.deal_status !== "lost" || (data.lost_reason != null && data.lost_reason.length > 0),
    { message: "Le motif de perte est requis", path: ["lost_reason"] },
  );

export const dealSearchSchema = z.object({
  query: z.string().default(""),
  stage: z.string().optional(),
  deal_status: z.enum(["open", "won", "lost"]).optional(),
  company_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Types derives ---

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;
export type CloseDealInput = z.infer<typeof closeDealSchema>;
export type DealSearchInput = z.infer<typeof dealSearchSchema>;
