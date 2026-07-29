import { useQuery } from "@tanstack/react-query";
import { fetchActivities } from "@/lib/actions/activity";
import type { EntityType } from "@/types/database";

// --- Liste des activites d'une entite ---

export function useActivities(entityType: EntityType, entityId: string, limit?: number) {
  return useQuery({
    queryKey: ["activities", entityType, entityId],
    queryFn: () => fetchActivities(entityType, entityId, limit),
    enabled: !!entityId,
  });
}
