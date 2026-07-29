"use server";

import { getAuthContext } from "./helpers";
import * as csvService from "@/lib/services/csvService";
import type { CsvEntityType } from "@/types/csv";

// --- Export CSV : recupere les donnees brutes cote serveur ---

export async function fetchExportData(entityType: CsvEntityType) {
  const { organizationId } = await getAuthContext();
  return csvService.getExportData(organizationId, entityType);
}
