"use server";

import { requireAdmin } from "./helpers";
import * as apiKeyService from "@/lib/services/apiKeyService";
import { createApiKeySchema } from "@/lib/schemas/apiKey";

// --- Cles API (bots externes) ---

export async function fetchApiKeys() {
  const { organizationId } = await requireAdmin();
  return apiKeyService.listApiKeys(organizationId);
}

export async function generateApiKeyAction(input: { label: string }) {
  const { organizationId, userId } = await requireAdmin();
  const parsed = createApiKeySchema.parse(input);
  return apiKeyService.generateApiKey(organizationId, parsed.label, userId);
}

export async function revokeApiKeyAction(apiKeyId: string) {
  const { organizationId } = await requireAdmin();
  return apiKeyService.revokeApiKey(organizationId, apiKeyId);
}
