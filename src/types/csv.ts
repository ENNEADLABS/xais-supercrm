// Types pour l'import/export CSV

/** Type d'entite importable/exportable */
export type CsvEntityType = "contact" | "company" | "deal";

/** Mapping colonne CSV → champ DB */
export interface CsvColumnMapping {
  csvHeader: string;
  dbField: string;
}

/** Definition d'une colonne avec label FR et flag requis */
export interface CsvFieldDef {
  key: string;
  label: string;
  aliases: string[]; // Noms alternatifs pour auto-mapping (FR, EN, variantes)
  required?: boolean;
}

/** Resultat de validation d'une ligne */
export interface CsvRowValidation {
  row: number; // 1-indexed
  valid: boolean;
  errors: string[];
  data?: Record<string, unknown>;
}

/** Rapport d'import complet */
export interface CsvImportReport {
  entityType: CsvEntityType;
  totalRows: number;
  importedCount: number;
  errorCount: number;
  skippedCount: number;
  errors: Array<{ row: number; errors: string[] }>;
  duration: number; // ms
}
