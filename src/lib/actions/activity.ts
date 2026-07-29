"use server";

import { getAuthContext } from "./helpers";
import * as activityService from "@/lib/services/activityService";
import type { EntityType } from "@/types/database";

// --- Liste des activites d'une entite ---

export async function fetchActivities(entityType: EntityType, entityId: string, limit?: number) {
  const { organizationId } = await getAuthContext();
  return activityService.getActivities(organizationId, entityType, entityId, limit);
}
