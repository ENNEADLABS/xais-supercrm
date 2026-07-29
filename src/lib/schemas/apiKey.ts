import { z } from "zod";

export const createApiKeySchema = z.object({
  label: z.string().min(1, "Le libellé est requis").max(100),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
