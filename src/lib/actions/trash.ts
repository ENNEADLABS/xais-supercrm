"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./helpers";
import * as trashService from "@/lib/services/trashService";
import type { SoftDeletableTable } from "@/lib/supabase/softDelete";

export async function fetchTrashedItems(entityType?: SoftDeletableTable) {
  const { organizationId } = await requireAdmin();
  return trashService.getTrashedItems(organizationId, entityType);
}

export async function restoreItemAction(entityType: SoftDeletableTable, id: string) {
  const { organizationId } = await requireAdmin();
  await trashService.restoreItem(organizationId, entityType, id);
  revalidatePath("/settings");
  revalidatePath(`/${entityType}`);
}

export async function permanentDeleteAction(entityType: SoftDeletableTable, id: string) {
  const { organizationId } = await requireAdmin();
  await trashService.permanentDeleteItem(organizationId, entityType, id);
  revalidatePath("/settings");
}
