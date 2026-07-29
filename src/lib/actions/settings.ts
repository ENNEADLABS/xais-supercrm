"use server";

import { getAuthContext, getAuthContextWithRole, requireAdmin } from "./helpers";
import * as organizationService from "@/lib/services/organizationService";
import * as memberService from "@/lib/services/memberService";
import * as tenantConfigService from "@/lib/services/tenantConfigService";
import {
  updateOrganizationSchema,
  commercialConfigSchema,
  companyInfoSchema,
  pipelineConfigSchema,
} from "@/lib/schemas/settings";
import type { CompanyInfoInput } from "@/lib/schemas/settings";
import type { MemberRole } from "@/types/database";

// --- Organisation ---

export async function fetchOrganization() {
  const { organizationId } = await requireAdmin();
  return organizationService.getOrganization(organizationId);
}

export async function updateOrganizationAction(input: { name: string }) {
  const { organizationId } = await requireAdmin();
  const parsed = updateOrganizationSchema.parse(input);
  return organizationService.updateOrganization(organizationId, parsed);
}

// --- Role courant (pour gater l'UI par role ; la vraie garde reste serveur) ---

export async function fetchCurrentRole(): Promise<string> {
  const { role } = await getAuthContextWithRole();
  return role;
}

// --- Membres ---

export async function fetchMembers() {
  const { organizationId } = await requireAdmin();
  return memberService.getMembers(organizationId);
}

export async function addMemberAction(userId: string, role: MemberRole) {
  const { organizationId } = await requireAdmin();
  return memberService.addMember(organizationId, userId, role);
}

export async function updateMemberRoleAction(memberId: string, role: MemberRole) {
  const { organizationId } = await requireAdmin();
  return memberService.updateMemberRole(organizationId, memberId, role);
}

export async function removeMemberAction(memberId: string) {
  const { organizationId, userId } = await requireAdmin();
  return memberService.removeMember(organizationId, memberId, userId);
}

// --- Configuration commerciale ---

export async function updateCommercialConfigAction(input: {
  quote_prefix: string;
  invoice_prefix: string;
  default_vat_rate: number;
  payment_terms_days: number;
  currency: "EUR" | "USD" | "GBP" | "CHF";
}) {
  const { organizationId } = await requireAdmin();
  const parsed = commercialConfigSchema.parse(input);
  return tenantConfigService.updateCommercialConfig(organizationId, parsed);
}

// --- Informations societe ---

export async function updateCompanyInfoAction(input: CompanyInfoInput) {
  const { organizationId } = await requireAdmin();
  const parsed = companyInfoSchema.parse(input);
  return tenantConfigService.updateTenantConfig(organizationId, { company_info: parsed });
}

// --- Configuration du pipeline ---

export async function updatePipelineConfigAction(
  stages: { id: string; label: string; color: string; order: number }[],
  probabilityMap: Record<string, number>,
) {
  const { organizationId } = await requireAdmin();
  const parsed = pipelineConfigSchema.parse({
    pipeline_stages: stages,
    probability_map: probabilityMap,
  });
  return tenantConfigService.updatePipelineConfig(
    organizationId,
    parsed.pipeline_stages,
    parsed.probability_map,
  );
}

// --- Onboarding ---

export async function markOnboardingCompleteAction() {
  const { organizationId } = await getAuthContext();
  return tenantConfigService.markOnboardingComplete(organizationId);
}
