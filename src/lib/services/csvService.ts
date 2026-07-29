import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CsvEntityType, CsvRowValidation, CsvImportReport } from "@/types/csv";
import { getFieldDefs } from "@/lib/schemas/csv-import";
import type { CsvColumn } from "@/lib/utils/csv";

const EXPORT_LIMIT = 10_000;
const BATCH_SIZE = 100;

// --- Export ---

/** Colonnes d'export par entite */
export function getExportColumns(entityType: CsvEntityType): CsvColumn[] {
  return getFieldDefs(entityType).map((f) => ({ key: f.key, label: f.label }));
}

/** Recupere toutes les donnees pour export (max 10 000 lignes) */
export async function getExportData(
  organizationId: string,
  entityType: CsvEntityType,
): Promise<Record<string, unknown>[]> {
  const supabase = await createServerSupabaseClient();

  // Deals : joindre le nom de la societe
  if (entityType === "deal") {
    const { data, error } = await supabase
      .from("deals")
      .select("*, companies(name)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .is("deleted_at", null)
      .limit(EXPORT_LIMIT);

    if (error) throw error;

    // Aplatir companies.name → company_name
    return (data ?? []).map((d) => {
      const { companies, ...rest } = d as Record<string, unknown> & {
        companies: { name: string } | null;
      };
      return { ...rest, company_name: companies?.name ?? "" };
    });
  }

  const table = entityType === "contact" ? "contacts" : "companies";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .is("deleted_at", null)
    .limit(EXPORT_LIMIT);

  if (error) throw error;
  return (data as Record<string, unknown>[]) ?? [];
}

// --- Import : insertion batch (server-only) ---

/** Insere les lignes valides en batch */
export async function importBatch(
  organizationId: string,
  entityType: CsvEntityType,
  validRows: CsvRowValidation[],
): Promise<CsvImportReport> {
  const start = Date.now();
  const supabase = await createServerSupabaseClient();
  const table =
    entityType === "contact" ? "contacts" : entityType === "company" ? "companies" : "deals";

  let importedCount = 0;
  const errors: Array<{ row: number; errors: string[] }> = [];

  // Preparer les donnees avec organization_id
  const rowsToInsert = validRows
    .filter((r) => r.valid && r.data)
    .map((r) => ({
      ...r.data,
      organization_id: organizationId,
    }));

  // Insertion par batch
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table).insert(batch as any);

    if (error) {
      // En cas d'erreur sur le batch, marquer toutes les lignes
      const batchStart = i;
      for (let j = 0; j < batch.length; j++) {
        const originalRow = validRows.filter((r) => r.valid)[batchStart + j];
        if (originalRow) {
          errors.push({ row: originalRow.row, errors: [error.message] });
        }
      }
    } else {
      importedCount += batch.length;
    }
  }

  // Erreurs de validation (deja filtrees)
  const validationErrors = validRows
    .filter((r) => !r.valid)
    .map((r) => ({ row: r.row, errors: r.errors }));

  return {
    entityType,
    totalRows: validRows.length,
    importedCount,
    errorCount: validationErrors.length + errors.length,
    skippedCount: 0,
    errors: [...validationErrors, ...errors].sort((a, b) => a.row - b.row),
    duration: Date.now() - start,
  };
}
