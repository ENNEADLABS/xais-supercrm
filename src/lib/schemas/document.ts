import { z } from "zod";

// --- Schemas de validation pour les documents ---

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

// Schema pour l'upload d'un document
export const uploadDocumentSchema = z
  .object({
    entity_type: entityTypeEnum.optional(),
    entity_id: z.string().uuid("ID entite invalide").optional(),
    name: z
      .string()
      .min(1, "Le nom est requis")
      .max(255, "Le nom ne peut pas depasser 255 caracteres"),
  })
  .refine(
    (data) => {
      // Les deux champs doivent etre presents ou absents ensemble
      const hasType = data.entity_type !== undefined;
      const hasId = data.entity_id !== undefined;
      return hasType === hasId;
    },
    {
      message: "entity_type et entity_id doivent etre fournis ensemble ou absents ensemble",
      path: ["entity_type"],
    },
  );

// Schema pour renommer un document
export const renameDocumentSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(255, "Le nom ne peut pas depasser 255 caracteres"),
});

// Contraintes fichier
export const FILE_CONSTRAINTS = {
  maxSize: 10 * 1024 * 1024, // 10 Mo
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
} as const;

// --- Types derives ---

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type RenameDocumentInput = z.infer<typeof renameDocumentSchema>;
