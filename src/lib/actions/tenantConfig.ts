"use server";

import { getAuthContext, requireAdmin } from "./helpers";
import * as tenantConfigService from "@/lib/services/tenantConfigService";
import type { TenantConfig } from "@/types/database";

// --- Configuration du tenant ---

export async function fetchTenantConfig() {
  const { organizationId } = await getAuthContext();
  return tenantConfigService.getTenantConfig(organizationId);
}

// --- Stages du pipeline ---

export async function fetchPipelineStages() {
  const { organizationId } = await getAuthContext();
  return tenantConfigService.getPipelineStages(organizationId);
}

// --- Mise a jour de la config tenant (admin uniquement) ---

export async function updateTenantConfigAction(partialConfig: Partial<TenantConfig>) {
  const { organizationId } = await requireAdmin();
  return tenantConfigService.updateTenantConfig(organizationId, partialConfig);
}
