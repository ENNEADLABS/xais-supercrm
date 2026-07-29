// Service de generation de PDF pour devis et factures

import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfDocument } from "@/lib/pdf/PdfDocument";
import type { PdfDocumentData } from "@/lib/pdf/types";
import type { Database, TenantConfig } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getQuote } from "./quoteService";
import { getInvoice } from "./invoiceService";
import { getTenantConfig } from "./tenantConfigService";

// --- Helpers internes ---
// `client` optionnel de bout en bout : par defaut la session cookie courante,
// sinon un client injecte (ex. le client robot, cf. src/lib/utils/apiAuth.ts).

/** Recupere le nom de l'organisation */
async function fetchOrgName(orgId: string, client?: SupabaseClient<Database>): Promise<string> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data, error } = await supabase.from("organizations").select("name").eq("id", orgId);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Organisation introuvable");
  return data[0].name;
}

/** Construit les infos organisation pour le PDF */
function buildOrgInfo(orgName: string, config: TenantConfig): PdfDocumentData["organization"] {
  return {
    name: orgName,
    ...(config.company_info ?? {}),
  };
}

/** Construit la config PDF depuis la config tenant */
function buildPdfConfig(config: TenantConfig): PdfDocumentData["config"] {
  return {
    currency: config.currency,
    locale: config.locale,
    paymentTermsDays: config.payment_terms_days,
  };
}

// --- Generation PDF devis ---

export async function generateQuotePdf(
  orgId: string,
  quoteId: string,
  client?: SupabaseClient<Database>,
): Promise<Buffer> {
  // 1. Recuperer le devis avec ses relations
  const quote = await getQuote(orgId, quoteId, client);
  if (!quote) throw new Error("Devis introuvable");

  // 2. Recuperer la config tenant et le nom de l'organisation
  const [config, orgName] = await Promise.all([
    getTenantConfig(orgId, client),
    fetchOrgName(orgId, client),
  ]);

  // 3. Construire les donnees du document
  // Les relations sont chargees par getQuote via select("*, companies(...), contacts(...)")
  const company = (quote as unknown as Record<string, unknown>).companies as {
    name: string;
  } | null;
  const contact = (quote as unknown as Record<string, unknown>).contacts as {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;

  const data: PdfDocumentData = {
    type: "quote",
    reference: quote.reference,
    subject: quote.subject,
    notes: quote.notes,
    issuedAt: quote.issued_at,
    sentAt: quote.sent_at,
    signedAt: quote.signed_at,
    dueDate: null,
    validityDays: quote.validity_days,
    totalHt: quote.total_ht,
    totalTax: quote.total_tax,
    totalTtc: quote.total_ttc,
    paidAmount: null,
    isDraft: quote.status === "draft",
    isCreditNote: false,
    organization: buildOrgInfo(orgName, config),
    company: company ? { name: company.name } : null,
    contact: contact
      ? { firstName: contact.first_name, lastName: contact.last_name, email: contact.email }
      : null,
    lines: (quote.lines ?? []).map((l) => ({
      position: l.position,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit ?? "",
      unitPrice: l.unit_price,
      vatRate: l.vat_rate,
      discountPercent: l.discount_percent,
      lineTotalHt: l.line_total_ht,
      lineTotalTtc: l.line_total_ttc,
    })),
    config: buildPdfConfig(config),
  };

  // 4. Render le PDF en buffer
  const buffer = await renderToBuffer(<PdfDocument data={data} />);
  return Buffer.from(buffer);
}

// --- Generation PDF facture ---

export async function generateInvoicePdf(orgId: string, invoiceId: string): Promise<Buffer> {
  // 1. Recuperer la facture avec ses relations
  const invoice = await getInvoice(orgId, invoiceId);
  if (!invoice) throw new Error("Facture introuvable");

  // 2. Recuperer la config tenant et le nom de l'organisation
  const [config, orgName] = await Promise.all([getTenantConfig(orgId), fetchOrgName(orgId)]);

  // 3. Construire les donnees du document
  // Les relations sont chargees par getInvoice via select("*, companies(...), contacts(...)")
  const company = (invoice as unknown as Record<string, unknown>).companies as {
    name: string;
  } | null;
  const contact = (invoice as unknown as Record<string, unknown>).contacts as {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;

  const data: PdfDocumentData = {
    type: "invoice",
    reference: invoice.reference,
    subject: invoice.subject,
    notes: invoice.notes,
    issuedAt: invoice.issued_at,
    sentAt: invoice.sent_at,
    signedAt: null,
    dueDate: invoice.due_date,
    validityDays: null,
    totalHt: invoice.total_ht,
    totalTax: invoice.total_tax,
    totalTtc: invoice.total_ttc,
    paidAmount: invoice.paid_amount,
    isDraft: invoice.status === "draft",
    isCreditNote: invoice.is_credit_note,
    organization: buildOrgInfo(orgName, config),
    company: company ? { name: company.name } : null,
    contact: contact
      ? { firstName: contact.first_name, lastName: contact.last_name, email: contact.email }
      : null,
    lines: (invoice.lines ?? []).map((l) => ({
      position: l.position,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit ?? "",
      unitPrice: l.unit_price,
      vatRate: l.vat_rate,
      discountPercent: l.discount_percent,
      lineTotalHt: l.line_total_ht,
      lineTotalTtc: l.line_total_ttc,
    })),
    config: buildPdfConfig(config),
  };

  // 4. Render le PDF en buffer
  const buffer = await renderToBuffer(<PdfDocument data={data} />);
  return Buffer.from(buffer);
}
