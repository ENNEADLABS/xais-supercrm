// Utilitaires CSV : parser, serializer, download
// Supporte les delimiteurs ; (Excel FR) et , (standard) avec detection auto

/** Definition d'une colonne exportable */
export interface CsvColumn {
  key: string;
  label: string;
}

/** Supprime le BOM UTF-8 si present */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Detecte le delimiteur (`;` ou `,`) en analysant la premiere ligne */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

/** Echappe une valeur CSV (guillemets, retours a la ligne, delimiteur) */
export function escapeCsvValue(value: unknown, delimiter: string): string {
  const str = value == null ? "" : String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Parse une ligne CSV en respectant les guillemets */
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Guillemet echappe
          current += '"';
          i += 2;
        } else {
          // Fin de zone entre guillemets
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/** Parse une string CSV en tableau de lignes */
export function parseCsv(raw: string): {
  headers: string[];
  rows: string[][];
  delimiter: string;
} {
  const cleaned = stripBom(raw);
  // Normalise les retours a la ligne
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: ";" };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseLine(line, delimiter));

  return { headers, rows, delimiter };
}

/** Serialise un tableau d'objets en string CSV avec BOM UTF-8 */
export function serializeCsv(
  rows: Record<string, unknown>[],
  columns: CsvColumn[],
  delimiter = ";",
): string {
  const BOM = "\uFEFF";
  const header = columns.map((c) => escapeCsvValue(c.label, delimiter)).join(delimiter);
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key], delimiter)).join(delimiter),
  );
  return BOM + [header, ...dataLines].join("\n");
}

/** Telecharge une string CSV comme fichier */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
