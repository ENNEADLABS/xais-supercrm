"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImportCsvUpload } from "./ImportCsvUpload";
import { ImportCsvMapping } from "./ImportCsvMapping";
import { ImportCsvPreview } from "./ImportCsvPreview";
import { ImportCsvResult } from "./ImportCsvResult";
import { parseCsv } from "@/lib/utils/csv";
import { autoMapColumns, validateImportRows } from "@/lib/schemas/csv-import";
import type {
  CsvEntityType,
  CsvColumnMapping,
  CsvRowValidation,
  CsvImportReport,
} from "@/types/csv";

type Step = "upload" | "mapping" | "preview" | "result";

const ENTITY_LABELS: Record<CsvEntityType, string> = {
  contact: "contacts",
  company: "sociétés",
  deal: "deals",
};

const QUERY_KEYS: Record<CsvEntityType, string> = {
  contact: "contacts",
  company: "companies",
  deal: "deals",
};

interface ImportCsvDialogProps {
  entityType: CsvEntityType;
}

export function ImportCsvDialog({ entityType }: ImportCsvDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");

  // Donnees partagees entre les etapes
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Array<{ csvHeader: string; dbField: string | null }>>(
    [],
  );
  const [validations, setValidations] = useState<CsvRowValidation[]>([]);
  const [report, setReport] = useState<CsvImportReport | null>(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setValidations([]);
    setReport(null);
    setImporting(false);
  }

  // Etape 1 : fichier selectionne
  const handleFileSelected = useCallback(
    (_file: File, content: string) => {
      const parsed = parseCsv(content);
      if (parsed.headers.length === 0) {
        toast.error("Fichier CSV vide ou mal formé");
        return;
      }
      setFile(_file);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      // Auto-mapping
      const autoMapped = autoMapColumns(parsed.headers, entityType);
      setMappings(autoMapped);
      setStep("mapping");
    },
    [entityType],
  );

  // Etape 2 → 3 : validation
  function handleValidate() {
    const activeMappings: CsvColumnMapping[] = mappings
      .filter((m) => m.dbField !== null)
      .map((m) => ({ csvHeader: m.csvHeader, dbField: m.dbField as string }));

    if (activeMappings.length === 0) {
      toast.error("Aucune colonne mappée");
      return;
    }

    const results = validateImportRows(entityType, rows, headers, activeMappings);
    setValidations(results);
    setStep("preview");
  }

  // Etape 3 → 4 : import
  async function handleImport() {
    const validCount = validations.filter((v) => v.valid).length;
    if (validCount === 0) {
      toast.error("Aucune ligne valide à importer");
      return;
    }

    setImporting(true);
    try {
      const activeMappings: CsvColumnMapping[] = mappings
        .filter((m) => m.dbField !== null)
        .map((m) => ({ csvHeader: m.csvHeader, dbField: m.dbField as string }));

      const formData = new FormData();
      formData.append("file", file!);
      formData.append("entityType", entityType);
      formData.append("mapping", JSON.stringify(activeMappings));

      const res = await fetch("/api/import", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message ?? "Erreur lors de l'import");
        return;
      }

      const importReport = (await res.json()) as CsvImportReport;
      setReport(importReport);
      setStep("result");

      // Invalidation du cache
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS[entityType]] });

      if (importReport.importedCount > 0) {
        toast.success(`${importReport.importedCount} ${ENTITY_LABELS[entityType]} importé(e)s`);
      }
    } catch {
      toast.error("Erreur réseau lors de l'import");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset apres la fermeture de l'animation
    setTimeout(reset, 200);
  }

  const validCount = validations.filter((v) => v.valid).length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Upload className="mr-1.5 size-4" />
        Importer
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des {ENTITY_LABELS[entityType]}</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Sélectionnez un fichier CSV à importer."}
            {step === "mapping" && "Vérifiez le mapping des colonnes."}
            {step === "preview" && "Vérifiez les données avant l'import."}
            {step === "result" && "Résultat de l'import."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-50">
          {step === "upload" && <ImportCsvUpload onFileSelected={handleFileSelected} />}
          {step === "mapping" && (
            <ImportCsvMapping
              entityType={entityType}
              mappings={mappings}
              onMappingsChange={setMappings}
            />
          )}
          {step === "preview" && <ImportCsvPreview validations={validations} />}
          {step === "result" && report && <ImportCsvResult report={report} />}
        </div>

        <DialogFooter>
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Retour
              </Button>
              <Button onClick={handleValidate}>Valider le mapping</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Retour
              </Button>
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing
                  ? "Import en cours..."
                  : `Importer ${validCount} ligne${validCount > 1 ? "s" : ""}`}
              </Button>
            </>
          )}
          {step === "result" && <Button onClick={handleClose}>Fermer</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
