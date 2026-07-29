import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Company, Json } from "@/types/database";
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanySearchInput,
} from "@/lib/schemas/company";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// --- Liste paginee avec recherche et filtres ---

export async function getCompanies(organizationId: string, params?: CompanySearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  // Recherche texte libre
  if (params?.query) {
    const q = params.query;
    query = query.or(`name.ilike.%${escapeLike(q)}%,domain.ilike.%${escapeLike(q)}%`);
  }

  // Filtre par statut
  if (params?.status) {
    query = query.eq("status", params.status);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Company[]) ?? [], count: count ?? 0 };
}

// --- Detail d'une societe avec contacts et tags ---

export async function getCompany(organizationId: string, companyId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!companies || companies.length === 0) return null;

  const company = companies[0];

  // Contacts lies
  const { data: contactCompanies } = await supabase
    .from("contact_companies")
    .select("*, contacts(*)")
    .eq("company_id", companyId);

  const activeContactCompanies = (contactCompanies ?? []).filter(
    (cc) => !(cc.contacts as Record<string, unknown> | null)?.deleted_at,
  );

  // Tags lies
  const { data: companyTags } = await supabase
    .from("company_tags")
    .select("*, tags(*)")
    .eq("company_id", companyId);

  return {
    ...company,
    contacts: activeContactCompanies,
    tags: companyTags ?? [],
  };
}

// --- Creation ---

export async function createCompany(organizationId: string, input: CreateCompanyInput) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("companies")
    .insert({
      ...input,
      custom_fields: input.custom_fields as Json,
      organization_id: organizationId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Company creation failed");

  const company = data[0];

  await activityService.log(organizationId, {
    entityType: "company",
    entityId: company.id,
    action: "created",
  });

  return company;
}

// --- Mise a jour ---

export async function updateCompany(
  organizationId: string,
  companyId: string,
  input: UpdateCompanyInput,
) {
  const supabase = await createServerSupabaseClient();

  // Validation coherence croisee SIREN/SIRET/TVA sur mise a jour partielle
  if (input.siren !== undefined || input.siret !== undefined || input.vat_number !== undefined) {
    const { data: existing } = await supabase
      .from("companies")
      .select("siren, siret, vat_number")
      .eq("organization_id", organizationId)
      .eq("id", companyId)
      .is("deleted_at", null);

    if (existing && existing.length > 0) {
      const merged = {
        siren: input.siren !== undefined ? (input.siren ?? null) : existing[0].siren,
        siret: input.siret !== undefined ? (input.siret ?? null) : existing[0].siret,
        vat_number:
          input.vat_number !== undefined ? (input.vat_number ?? null) : existing[0].vat_number,
      };
      if (merged.siren && merged.siret && merged.siret.slice(0, 9) !== merged.siren) {
        throw new Error("Les 9 premiers chiffres du SIRET doivent correspondre au SIREN");
      }
      if (merged.siren && merged.vat_number && merged.vat_number.slice(-9) !== merged.siren) {
        throw new Error("Les 9 derniers chiffres du numero TVA doivent correspondre au SIREN");
      }
    }
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ ...input, custom_fields: input.custom_fields as Json })
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Company not found");

  await activityService.log(organizationId, {
    entityType: "company",
    entityId: companyId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });

  return data[0];
}

// --- Archivage ---

export async function archiveCompany(organizationId: string, companyId: string) {
  return updateCompany(organizationId, companyId, { status: "archived" });
}
