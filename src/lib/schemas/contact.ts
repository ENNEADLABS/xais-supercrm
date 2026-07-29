import { z } from "zod";

// --- Schemas de validation pour les contacts ---

const entityStatusEnum = z.enum(["active", "archived"]);

export const createContactSchema = z.object({
  first_name: z.string().min(1, "Le prenom est requis").max(100),
  last_name: z.string().min(1, "Le nom est requis").max(100),
  email: z.string().email("Email invalide").nullish(),
  phone: z.string().max(50).nullish(),
  job_title: z.string().max(150).nullish(),
  status: entityStatusEnum.default("active"),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

// `.partial()` ne retire pas le `.default("active")` de `status` : un update
// sans `status` dans le payload le remettrait quand meme a "active" (Zod
// applique les defaults meme sur un champ absent). On l'ecrase explicitement
// en optional() pur pour que "pas envoye" veuille bien dire "ne pas toucher".
export const updateContactSchema = createContactSchema.partial().extend({
  status: entityStatusEnum.optional(),
});

export const contactSearchSchema = z.object({
  query: z.string().default(""),
  status: entityStatusEnum.optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Schemas de detection/fusion de doublons ---

export const duplicateCheckSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  exclude_id: z.string().uuid().optional(),
});

export const mergeContactsSchema = z
  .object({
    winner_id: z.string().uuid(),
    loser_id: z.string().uuid(),
    field_overrides: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.winner_id !== data.loser_id, {
    message: "Les deux contacts doivent être différents",
    path: ["loser_id"],
  });

// --- Schemas de canaux de communication (emails / téléphones supplémentaires) ---

export const contactChannelSchema = z
  .object({
    type: z.enum(["email", "phone"]),
    value: z.string().min(1, "La valeur est requise").max(200),
    label: z.enum(["work", "personal", "mobile", "other"]).nullish(),
  })
  .refine((data) => data.type !== "email" || z.string().email().safeParse(data.value).success, {
    message: "Email invalide",
    path: ["value"],
  });

// --- Types derives ---

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactSearchInput = z.infer<typeof contactSearchSchema>;
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
export type MergeContactsInput = z.infer<typeof mergeContactsSchema>;
export type ContactChannelInput = z.infer<typeof contactChannelSchema>;
