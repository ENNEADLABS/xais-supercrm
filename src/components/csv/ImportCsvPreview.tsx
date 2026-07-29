"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import type { CsvRowValidation } from "@/types/csv";

interface ImportCsvPreviewProps {
  validations: CsvRowValidation[];
}

export function ImportCsvPreview({ validations }: ImportCsvPreviewProps) {
  const validCount = validations.filter((v) => v.valid).length;
  const errorCount = validations.filter((v) => !v.valid).length;
  // Afficher les 10 premieres lignes
  const preview = validations.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="size-4" />
          {validCount} valide{validCount > 1 ? "s" : ""}
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="size-4" />
            {errorCount} erreur{errorCount > 1 ? "s" : ""}
          </span>
        )}
        <span className="text-gray-500">sur {validations.length} lignes</span>
      </div>

      <div className="max-h-64 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Ligne</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Statut</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.map((v) => (
              <tr key={v.row} className={v.valid ? "" : "bg-red-50"}>
                <td className="px-3 py-2 text-gray-600">{v.row}</td>
                <td className="px-3 py-2">
                  {v.valid ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-red-500" />
                  )}
                </td>
                <td className="px-3 py-2">
                  {v.valid ? (
                    <span className="text-gray-500">
                      {Object.values(v.data ?? {})
                        .filter(Boolean)
                        .slice(0, 3)
                        .join(" — ")}
                    </span>
                  ) : (
                    <span className="text-red-600">{v.errors.join(", ")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validations.length > 10 && (
        <p className="text-xs text-gray-500">
          Aperçu des 10 premières lignes sur {validations.length}
        </p>
      )}
    </div>
  );
}
