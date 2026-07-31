import type { SupabaseClient } from "@supabase/supabase-js";

export type SoftDeletableTable =
  "contacts" | "companies" | "deals" | "products" | "quotes" | "invoices" | "notes";

/** Libelles affichables par type d'entite — safe a importer cote client */
export const SOFT_DELETABLE_LABELS: Record<SoftDeletableTable, string> = {
  contacts: "Contact",
  companies: "Société",
  deals: "Opportunité",
  products: "Produit",
  quotes: "Devis",
  invoices: "Facture",
  notes: "Note",
};

/** Soft-delete un enregistrement : met a jour deleted_at + updated_at */
export async function softDeleteRecord(
  supabase: SupabaseClient,
  table: SoftDeletableTable,
  orgId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .eq("id", id);
  if (error) throw error;
}
