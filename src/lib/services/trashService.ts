import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SoftDeletableTable } from "@/lib/supabase/softDelete";
import { SOFT_DELETABLE_LABELS } from "@/lib/supabase/softDelete";

export interface TrashedItem {
  id: string;
  entityType: SoftDeletableTable;
  /** Libelle affiche dans la liste */
  label: string;
  deletedAt: string;
}

// --- Lecture ---

export async function getTrashedItems(
  organizationId: string,
  entityType?: SoftDeletableTable,
): Promise<TrashedItem[]> {
  const supabase = await createServerSupabaseClient();
  const types: SoftDeletableTable[] = entityType
    ? [entityType]
    : ["contacts", "companies", "deals", "products", "quotes", "invoices", "notes"];

  const results = await Promise.all(
    types.map((type) => fetchTrashedByType(supabase, organizationId, type)),
  );

  // Fusion et tri par date de suppression desc
  return results
    .flat()
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

async function fetchTrashedByType(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  entityType: SoftDeletableTable,
): Promise<TrashedItem[]> {
  const base = supabase
    .from(entityType)
    .select(getLabelColumns(entityType))
    .eq("organization_id", organizationId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(100);

  const { data, error } = await base;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase retourne un type generique non typable ici
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    entityType,
    label: buildLabel(entityType, row),
    deletedAt: row.deleted_at as string,
  }));
}

function getLabelColumns(entityType: SoftDeletableTable): string {
  switch (entityType) {
    case "contacts":
      return "id, first_name, last_name, deleted_at";
    case "companies":
    case "deals":
    case "products":
      return "id, name, deleted_at";
    case "quotes":
    case "invoices":
      return "id, subject, deleted_at";
    case "notes":
      return "id, content, deleted_at";
  }
}

function buildLabel(entityType: SoftDeletableTable, row: Record<string, unknown>): string {
  switch (entityType) {
    case "contacts":
      return [row.first_name, row.last_name].filter(Boolean).join(" ") || "Contact sans nom";
    case "companies":
    case "deals":
    case "products":
      return (row.name as string | null) || `${SOFT_DELETABLE_LABELS[entityType]} sans nom`;
    case "quotes":
    case "invoices":
      return (row.subject as string | null) || `${SOFT_DELETABLE_LABELS[entityType]} sans sujet`;
    case "notes": {
      const content = (row.content as string | null) ?? "";
      return content.length > 60 ? content.slice(0, 60) + "…" : content || "Note vide";
    }
  }
}

// --- Restauration ---

export async function restoreItem(
  organizationId: string,
  entityType: SoftDeletableTable,
  id: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restore_soft_deleted pas dans les types generes
  const { error } = await (supabase.rpc as any)("restore_soft_deleted", {
    p_table: entityType,
    p_id: id,
    p_org_id: organizationId,
  });
  if (error) throw error;
}

// --- Suppression definitive ---

export async function permanentDeleteItem(
  organizationId: string,
  entityType: SoftDeletableTable,
  id: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(entityType)
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) throw error;
}
