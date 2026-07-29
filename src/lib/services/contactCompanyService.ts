import { createServerSupabaseClient } from "@/lib/supabase/server";

// Gestion de la table de jointure contact_companies (relation N:M).

export async function linkContactToCompany(
  organizationId: string,
  contactId: string,
  companyId: string,
  role?: string,
) {
  const supabase = await createServerSupabaseClient();

  // Verifier que le contact et la societe appartiennent a l'org
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .is("deleted_at", null);

  if (!contacts || contacts.length === 0) throw new Error("Contact not found");

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .is("deleted_at", null);

  if (!companies || companies.length === 0) throw new Error("Company not found");

  const { error } = await supabase.from("contact_companies").insert({
    contact_id: contactId,
    company_id: companyId,
    role: role ?? null,
  });

  if (error) throw error;
}

export async function unlinkContactFromCompany(
  organizationId: string,
  contactId: string,
  companyId: string,
) {
  const supabase = await createServerSupabaseClient();

  // Verifier que le contact appartient a l'org (defense in depth)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .is("deleted_at", null);

  if (!contacts || contacts.length === 0) throw new Error("Contact not found");

  const { error } = await supabase
    .from("contact_companies")
    .delete()
    .eq("contact_id", contactId)
    .eq("company_id", companyId);

  if (error) throw error;
}
