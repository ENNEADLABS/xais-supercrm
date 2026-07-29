/**
 * Types de base de donnees — point d'entree stable (`@/types/database`).
 *
 * - `database.generated.ts` est REGENERE par `pnpm db:types` (supabase gen types) :
 *   ne jamais l'editer a la main, il est ecrase a chaque regeneration.
 * - CE fichier est maintenu a la main : il re-exporte le genere puis ajoute les
 *   alias/raccourcis de domaine. La regeneration ne le touche plus (fini le
 *   footgun ou `db:types` ecrasait ce bloc — cf. ADR-0009).
 */
import type { Database } from "./database.generated";

export * from "./database.generated";

// --- Enums ---
export type EntityType = Database["public"]["Enums"]["entity_type"];
export type EmailParticipantRole = Database["public"]["Enums"]["email_participant_role"];
export type DealStatus = Database["public"]["Enums"]["deal_status"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type MemberRole = Database["public"]["Enums"]["member_role"];
export type EntityStatus = Database["public"]["Enums"]["entity_status"];
export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type ContentFormat = Database["public"]["Enums"]["content_format"];
export type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];
export type AssetRole = Database["public"]["Enums"]["asset_role"];
export type PublicationChannel = Database["public"]["Enums"]["publication_channel"];

// --- Tables (Row types) ---
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type ContactCompany = Database["public"]["Tables"]["contact_companies"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type DealContact = Database["public"]["Tables"]["deal_contacts"]["Row"];
export type DealTag = Database["public"]["Tables"]["deal_tags"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Quote = Database["public"]["Tables"]["quotes"]["Row"];
export type QuoteLine = Database["public"]["Tables"]["quote_lines"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type ConnectedAccount = Database["public"]["Tables"]["connected_accounts"]["Row"];
export type EmailChannel = Database["public"]["Tables"]["email_channels"]["Row"];
export type Email = Database["public"]["Tables"]["emails"]["Row"];
export type EmailParticipant = Database["public"]["Tables"]["email_participants"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
export type ContentIdea = Database["public"]["Tables"]["content_ideas"]["Row"];
export type ContentPiece = Database["public"]["Tables"]["content_pieces"]["Row"];
export type ContentScript = Database["public"]["Tables"]["content_scripts"]["Row"];
export type Deliverable = Database["public"]["Tables"]["deliverables"]["Row"];
export type ContentAsset = Database["public"]["Tables"]["content_assets"]["Row"];
export type ContentChecklistItem = Database["public"]["Tables"]["content_checklist_items"]["Row"];
export type ContentTemplate = Database["public"]["Tables"]["content_templates"]["Row"];

// --- Interfaces custom (non generees) ---

export interface EmailWithParticipants extends Email {
  participants: EmailParticipant[];
}

// Piece enrichie pour le kanban : avancement checklist agrege (cf. spec 021, T7).
export interface BoardPiece extends ContentPiece {
  checklist_total: number;
  checklist_done: number;
}

export interface EmailCounts {
  inbox: number;
  unread: number;
  sent: number;
  archive: number;
  trash: number;
}

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  order: number;
}

export interface CompanyInfo {
  legal_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
  vat_number?: string;
  logo_url?: string;
  capital?: string;
  rcs?: string;
  ape_code?: string;
  /** Franchise en base de TVA (art. 293 B du CGI) — mention legale sur les PDF */
  vat_exempt_293b?: boolean;
}

export interface TenantConfig {
  currency: string;
  locale: string;
  quote_prefix: string;
  invoice_prefix: string;
  pipeline_stages: PipelineStage[];
  probability_map: Record<string, number>;
  default_vat_rate: number; // basis points (2000 = 20%)
  payment_terms_days: number;
  company_info?: CompanyInfo;
  onboarding_completed?: boolean;
}
