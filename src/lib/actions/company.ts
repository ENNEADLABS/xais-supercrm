"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as companyService from "@/lib/services/companyService";
import {
  createCompanySchema,
  updateCompanySchema,
  type CreateCompanyInput,
  type UpdateCompanyInput,
  type CompanySearchInput,
} from "@/lib/schemas/company";

// --- Lecture liste paginee ---

export async function fetchCompanies(params?: CompanySearchInput) {
  const { organizationId } = await getAuthContext();
  return companyService.getCompanies(organizationId, params);
}

// --- Lecture detail ---

export async function fetchCompany(companyId: string) {
  const { organizationId } = await getAuthContext();
  return companyService.getCompany(organizationId, companyId);
}

// --- Creation ---

export async function createCompanyAction(input: CreateCompanyInput) {
  const { organizationId } = await requireMember();
  const validated = createCompanySchema.parse(input);
  const company = await companyService.createCompany(organizationId, validated);
  revalidatePath("/companies");
  return company;
}

// --- Mise a jour ---

export async function updateCompanyAction(companyId: string, input: UpdateCompanyInput) {
  const { organizationId } = await requireMember();
  const validated = updateCompanySchema.parse(input);
  const company = await companyService.updateCompany(organizationId, companyId, validated);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return company;
}

// --- Archivage ---

export async function archiveCompanyAction(companyId: string) {
  const { organizationId } = await requireMember();
  const company = await companyService.archiveCompany(organizationId, companyId);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return company;
}
