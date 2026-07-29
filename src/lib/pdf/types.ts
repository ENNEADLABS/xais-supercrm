// Types pour la generation de documents PDF (devis et factures)

// Re-export depuis database.ts pour eviter la duplication
export type { CompanyInfo } from "@/types/database";
import type { CompanyInfo } from "@/types/database";

export interface PdfLineData {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discountPercent: number;
  lineTotalHt: number;
  lineTotalTtc: number;
}

export interface PdfDocumentData {
  type: "quote" | "invoice";
  reference: string | null;
  subject: string;
  notes: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  signedAt: string | null;
  dueDate: string | null;
  validityDays: number | null;
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  paidAmount: number | null;
  isDraft: boolean;
  isCreditNote: boolean;
  organization: { name: string } & CompanyInfo;
  // null : devis/facture sans societe (destinataire = contact seul, spec 025)
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  contact: { firstName: string; lastName: string; email?: string | null } | null;
  lines: PdfLineData[];
  config: { currency: string; locale: string; paymentTermsDays: number };
}
