"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchExportData } from "@/lib/actions/csv";
import { serializeCsv, downloadCsv } from "@/lib/utils/csv";
import { getFieldDefs } from "@/lib/schemas/csv-import";
import type { CsvEntityType } from "@/types/csv";

const ENTITY_LABELS: Record<CsvEntityType, string> = {
  contact: "contacts",
  company: "societes",
  deal: "deals",
};

interface ExportCsvButtonProps {
  entityType: CsvEntityType;
}

export function ExportCsvButton({ entityType }: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const data = await fetchExportData(entityType);
      if (data.length === 0) {
        toast.info("Aucune donnée à exporter");
        return;
      }
      const columns = getFieldDefs(entityType).map((f) => ({ key: f.key, label: f.label }));
      const csv = serializeCsv(data, columns);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `${ENTITY_LABELS[entityType]}-${date}.csv`);
      toast.success(`${data.length} ${ENTITY_LABELS[entityType]} exporté(e)s`);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="mr-1.5 size-4" />
      {loading ? "Export..." : "Exporter"}
    </Button>
  );
}
