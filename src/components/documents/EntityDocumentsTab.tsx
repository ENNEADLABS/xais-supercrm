"use client";

import { DocumentList } from "@/components/crm/DocumentList";
import type { EntityType } from "@/types/database";

interface EntityDocumentsTabProps {
  entityType: EntityType;
  entityId: string;
}

/**
 * Onglet documents pour les pages de detail d'entite.
 */
export function EntityDocumentsTab({ entityType, entityId }: EntityDocumentsTabProps) {
  return <DocumentList entityType={entityType} entityId={entityId} />;
}
