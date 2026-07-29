"use server";

import { getAuthContext } from "./helpers";
import * as searchService from "@/lib/services/searchService";
import type { SearchResults } from "@/lib/services/searchService";

// --- Recherche globale (server action) ---

export async function globalSearch(query: string): Promise<SearchResults> {
  const { organizationId } = await getAuthContext();
  return searchService.search(organizationId, query);
}
