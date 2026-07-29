"use client";

import { CheckCircle2, XCircle, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { serializeCsv, downloadCsv } from "@/lib/utils/csv";
import type { CsvImportReport } from "@/types/csv";

interface ImportCsvResultProps {
  report: CsvImportReport;
}

export function ImportCsvResult({ report }: ImportCsvResultProps) {
  function handleDownloadErrors() {
    if (report.errors.length === 0) return;
    const rows = report.errors.map((e) => ({
      ligne: e.row,
      erreurs: e.errors.join(" | "),
    }));
    const csv = serializeCsv(rows, [
      { key: "ligne", label: "Ligne" },
      { key: "erreurs", label: "Erreurs" },
    ]);
    downloadCsv(csv, `erreurs-import-${report.entityType}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {report.importedCount > 0 ? (
          <CheckCircle2 className="size-6 text-green-500" />
        ) : (
          <XCircle className="size-6 text-red-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">Import terminé</p>
          <p className="text-sm text-gray-500">en {(report.duration / 1000).toFixed(1)}s</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-2xl font-bold text-green-700">{report.importedCount}</p>
          <p className="text-xs text-green-600">Importé{report.importedCount > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-2xl font-bold text-red-700">{report.errorCount}</p>
          <p className="text-xs text-red-600">Erreur{report.errorCount > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-2xl font-bold text-gray-700">{report.totalRows}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>

      {report.errors.length > 0 && (
        <div className="space-y-2">
          <div className="max-h-40 overflow-auto rounded-md border text-sm">
            {report.errors.slice(0, 20).map((e) => (
              <div key={e.row} className="flex gap-2 border-b px-3 py-1.5 last:border-0">
                <span className="font-mono text-gray-500">L{e.row}</span>
                <span className="text-red-600">{e.errors.join(", ")}</span>
              </div>
            ))}
            {report.errors.length > 20 && (
              <div className="px-3 py-1.5 text-gray-500">
                ... et {report.errors.length - 20} autres erreurs
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
            <Download className="mr-1.5 size-4" />
            Télécharger les erreurs
          </Button>
        </div>
      )}
    </div>
  );
}
