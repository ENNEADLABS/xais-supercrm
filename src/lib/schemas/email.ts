import { z } from "zod";

// --- Schemas de validation pour les emails ---

const emailProviderEnum = z.enum(["gmail", "microsoft", "imap_smtp"]);
const emailAccountStatusEnum = z.enum(["connected", "disconnected", "error"]);
const emailFolderEnum = z.enum(["inbox", "sent", "archive", "trash", "drafts"]);
const emailDirectionEnum = z.enum(["inbound", "outbound"]);

// --- Connexion d'un compte email ---

export const connectAccountSchema = z.object({
  provider: emailProviderEnum,
  email_address: z.string().email("Adresse email invalide"),
  display_name: z.string().max(200).nullish(),
  credentials: z.record(z.string(), z.unknown()),
});

// --- Mise a jour du statut d'un compte ---

export const updateAccountStatusSchema = z.object({
  status: emailAccountStatusEnum,
  sync_error: z.string().max(500).nullish(),
});

// --- Recherche / filtres sur les emails ---

export const emailSearchSchema = z.object({
  query: z.string().default(""),
  folder: emailFolderEnum.optional(),
  direction: emailDirectionEnum.optional(),
  is_read: z.boolean().optional(),
  contact_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Marquer comme lu/non lu ---

export const markEmailReadSchema = z.object({
  email_ids: z.array(z.string().uuid()).min(1, "Au moins un email requis"),
  is_read: z.boolean(),
});

// --- Deplacer vers un dossier ---

export const moveEmailSchema = z.object({
  email_ids: z.array(z.string().uuid()).min(1, "Au moins un email requis"),
  folder: emailFolderEnum,
});

// --- Composer un email ---

export const composeEmailSchema = z.object({
  account_id: z.string().uuid("Compte invalide"),
  to: z.array(z.string().email("Adresse email invalide")).min(1, "Au moins un destinataire requis"),
  cc: z.array(z.string().email("Adresse CC invalide")).optional(),
  bcc: z.array(z.string().email("Adresse BCC invalide")).optional(),
  subject: z.string().min(1, "Sujet requis").max(500),
  body_text: z.string().min(1, "Corps du message requis"),
  body_html: z.string().optional(),
});

// --- Repondre a un email ---

export const replyEmailSchema = z.object({
  email_id: z.string().uuid("Email invalide"),
  body_text: z.string().min(1, "Corps de la reponse requis"),
  body_html: z.string().optional(),
  reply_all: z.boolean().default(false),
});

// --- Types derives ---

export type ConnectAccountInput = z.infer<typeof connectAccountSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type EmailSearchInput = z.infer<typeof emailSearchSchema>;
export type MarkEmailReadInput = z.infer<typeof markEmailReadSchema>;
export type MoveEmailInput = z.infer<typeof moveEmailSchema>;
export type ComposeEmailInput = z.infer<typeof composeEmailSchema>;
export type ReplyEmailInput = z.infer<typeof replyEmailSchema>;
