import { z } from "zod";

// --- Schemas de validation pour les notes (lien polymorphe) ---

const entityTypeEnum = z.enum([
  "contact",
  "company",
  "deal",
  "quote",
  "invoice",
  "product",
  "task",
  "email",
  "content_idea",
  "content_piece",
  "deliverable",
  "content_template",
]);

export const createNoteSchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z.string().uuid("ID entite invalide"),
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(10000, "Le contenu ne peut pas depasser 10 000 caracteres"),
});

export const updateNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(10000, "Le contenu ne peut pas depasser 10 000 caracteres"),
});

// --- Types derives ---

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
