import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database";
import { getAdminClient } from "./clients";

// Seeding via service_role (bypass RLS) pour préparer l'état des tests RLS.
// Chaque fonction retourne l'id créé. Le timestamp passé pour `deleted_at`
// simule un enregistrement en corbeille (soft-delete).

type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];
type InvoiceLineInsert = Database["public"]["Tables"]["invoice_lines"]["Insert"];
type ConnectedAccountInsert = Database["public"]["Tables"]["connected_accounts"]["Insert"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

const SOFT_DELETED_AT = "2026-01-01T00:00:00.000Z";

export { SOFT_DELETED_AT };

export async function seedContact(
  orgId: string,
  overrides: Partial<ContactInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("contacts")
    .insert({
      organization_id: orgId,
      first_name: "Seed",
      last_name: "Contact",
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedContact: ${error?.message}`);
  return data[0].id;
}

export async function seedCompany(
  orgId: string,
  overrides: Partial<CompanyInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("companies")
    .insert({ organization_id: orgId, name: "Seed Company", ...overrides })
    .select("id");
  if (error || !data?.length) throw new Error(`seedCompany: ${error?.message}`);
  return data[0].id;
}

export async function seedInvoice(
  orgId: string,
  companyId: string,
  overrides: Partial<InvoiceInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("invoices")
    .insert({
      organization_id: orgId,
      company_id: companyId,
      subject: "Seed Invoice",
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedInvoice: ${error?.message}`);
  return data[0].id;
}

export async function seedNote(
  orgId: string,
  authorId: string,
  overrides: Partial<NoteInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("notes")
    .insert({
      organization_id: orgId,
      author_id: authorId,
      entity_type: "contact",
      entity_id: randomUUID(),
      content: "Seed note",
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedNote: ${error?.message}`);
  return data[0].id;
}

export async function seedInvoiceLine(
  invoiceId: string,
  overrides: Partial<InvoiceLineInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("invoice_lines")
    .insert({
      invoice_id: invoiceId,
      description: "Seed line",
      unit_price: 10000,
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedInvoiceLine: ${error?.message}`);
  return data[0].id;
}

export async function seedConnectedAccount(
  orgId: string,
  userId: string,
  overrides: Partial<ConnectedAccountInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("connected_accounts")
    .insert({
      organization_id: orgId,
      user_id: userId,
      provider: "gmail",
      email_address: `seed-${randomUUID()}@test.local`,
      credentials_encrypted: "encrypted",
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedConnectedAccount: ${error?.message}`);
  return data[0].id;
}

export async function seedPayment(
  orgId: string,
  invoiceId: string,
  amount: number,
  overrides: Partial<PaymentInsert> = {},
): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("payments")
    .insert({
      organization_id: orgId,
      invoice_id: invoiceId,
      amount,
      payment_date: "2026-06-13",
      ...overrides,
    })
    .select("id");
  if (error || !data?.length) throw new Error(`seedPayment: ${error?.message}`);
  return data[0].id;
}

// Relecture via service_role (vérité terrain, RLS bypassée). Lecteurs explicites
// par table : un générique sur `.from(table)` dynamique défait l'inférence de
// supabase-js (union incluant SelectQueryError) et impose des casts évasifs.
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type ConnectedAccountRow = Database["public"]["Tables"]["connected_accounts"]["Row"];
type InvoiceLineRow = Database["public"]["Tables"]["invoice_lines"]["Row"];

export async function readContactAsAdmin(id: string): Promise<ContactRow | null> {
  const { data, error } = await getAdminClient().from("contacts").select("*").eq("id", id);
  if (error) throw new Error(`readContactAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

export async function readInvoiceAsAdmin(id: string): Promise<InvoiceRow | null> {
  const { data, error } = await getAdminClient().from("invoices").select("*").eq("id", id);
  if (error) throw new Error(`readInvoiceAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

export async function readNoteAsAdmin(id: string): Promise<NoteRow | null> {
  const { data, error } = await getAdminClient().from("notes").select("*").eq("id", id);
  if (error) throw new Error(`readNoteAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

export async function readInvoiceLineAsAdmin(id: string): Promise<InvoiceLineRow | null> {
  const { data, error } = await getAdminClient().from("invoice_lines").select("*").eq("id", id);
  if (error) throw new Error(`readInvoiceLineAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}

export async function readConnectedAccountAsAdmin(id: string): Promise<ConnectedAccountRow | null> {
  const { data, error } = await getAdminClient()
    .from("connected_accounts")
    .select("*")
    .eq("id", id);
  if (error) throw new Error(`readConnectedAccountAsAdmin: ${error.message}`);
  return data?.length ? data[0] : null;
}
