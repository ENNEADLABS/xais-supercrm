import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/utils/csv";
import { validateImportRows } from "@/lib/schemas/csv-import";
import { importBatch } from "@/lib/services/csvService";
import type { CsvEntityType, CsvColumnMapping } from "@/types/csv";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const VALID_ENTITY_TYPES = ["contact", "company", "deal"] as const;

/**
 * POST /api/import — Import CSV (contacts, societes ou deals)
 * Body: multipart/form-data { file, entityType, mapping }
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Non authentifié" } },
      { status: 401 },
    );
  }

  // 2. Organisation
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1);
  if (!member || member.length === 0) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Aucune organisation" } },
      { status: 403 },
    );
  }
  if (member[0].role === "viewer") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Accès en lecture seule" } },
      { status: 403 },
    );
  }
  const organizationId = member[0].organization_id;

  // 3. Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "FormData invalide" } },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const entityTypeRaw = formData.get("entityType");
  const mappingRaw = formData.get("mapping");

  // 4. Validation des parametres
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Fichier manquant" } },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Fichier trop volumineux (max 5 Mo)" } },
      { status: 413 },
    );
  }

  if (
    !entityTypeRaw ||
    typeof entityTypeRaw !== "string" ||
    !VALID_ENTITY_TYPES.includes(entityTypeRaw as CsvEntityType)
  ) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Type d'entité invalide" } },
      { status: 400 },
    );
  }
  const entityType = entityTypeRaw as CsvEntityType;

  let mapping: CsvColumnMapping[];
  try {
    mapping = JSON.parse(typeof mappingRaw === "string" ? mappingRaw : "");
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Mapping invalide" } },
      { status: 400 },
    );
  }

  // 5. Parse CSV
  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  if (headers.length === 0 || rows.length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "CSV vide ou mal formé" } },
      { status: 400 },
    );
  }

  if (rows.length > 10_000) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Maximum 10 000 lignes par import" } },
      { status: 413 },
    );
  }

  // 6. Validation
  const validations = validateImportRows(entityType, rows, headers, mapping);

  // 7. Pour les deals : resoudre company_name → company_id
  if (entityType === "deal") {
    // Charger toutes les societes de l'org pour le matching par nom
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .eq("organization_id", organizationId);

    const companyMap = new Map((companies ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    for (const v of validations) {
      if (!v.valid || !v.data) continue;
      const companyName = v.data.company_name as string | undefined;
      if (!companyName) {
        v.valid = false;
        v.errors.push("company_name: Société requise");
        continue;
      }
      const companyId = companyMap.get(companyName.toLowerCase());
      if (!companyId) {
        v.valid = false;
        v.errors.push(`company_name: Société "${companyName}" introuvable`);
        continue;
      }
      // Remplacer company_name par company_id
      v.data.company_id = companyId;
      delete v.data.company_name;
    }
  }

  // 8. Insertion
  const report = await importBatch(organizationId, entityType, validations);

  return NextResponse.json(report);
}
