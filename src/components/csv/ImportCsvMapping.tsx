"use client";

import type { CsvEntityType } from "@/types/csv";
import type { CsvFieldDef } from "@/types/csv";
import { getFieldDefs } from "@/lib/schemas/csv-import";

interface MappingEntry {
  csvHeader: string;
  dbField: string | null;
}

interface ImportCsvMappingProps {
  entityType: CsvEntityType;
  mappings: MappingEntry[];
  onMappingsChange: (mappings: MappingEntry[]) => void;
}

export function ImportCsvMapping({
  entityType,
  mappings,
  onMappingsChange,
}: ImportCsvMappingProps) {
  const fields = getFieldDefs(entityType);
  const requiredFields = fields.filter((f) => f.required);
  const mappedDbFields = mappings.map((m) => m.dbField).filter(Boolean);

  // Champs requis non encore mappes
  const missingRequired = requiredFields.filter((f) => !mappedDbFields.includes(f.key));

  function handleChange(index: number, dbField: string | null) {
    const updated = mappings.map((m, i) => (i === index ? { ...m, dbField } : m));
    onMappingsChange(updated);
  }

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Champs requis non mappés :{" "}
          <strong>{missingRequired.map((f) => f.label).join(", ")}</strong>
        </div>
      )}

      <div className="space-y-2">
        {mappings.map((m, i) => (
          <div key={m.csvHeader} className="flex items-center gap-3">
            <span className="w-1/3 truncate text-sm font-medium text-gray-700">{m.csvHeader}</span>
            <span className="text-gray-400">→</span>
            <select
              value={m.dbField ?? "__ignore__"}
              onChange={(e) =>
                handleChange(i, e.target.value === "__ignore__" ? null : e.target.value)
              }
              className="w-1/2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="__ignore__">— Ignorer —</option>
              {fields.map((f) => (
                <FieldOption
                  key={f.key}
                  field={f}
                  disabled={mappedDbFields.includes(f.key) && m.dbField !== f.key}
                />
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldOption({ field, disabled }: { field: CsvFieldDef; disabled: boolean }) {
  return (
    <option value={field.key} disabled={disabled}>
      {field.label}
      {field.required ? " *" : ""}
    </option>
  );
}
