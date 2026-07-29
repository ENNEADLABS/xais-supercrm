// Tableau des lignes du document (devis ou facture)

import { View, Text } from "@react-pdf/renderer";
import type { PdfLineData, PdfDocumentData } from "../types";
import { formatPdfCurrency, formatPdfQuantity, formatPdfVatRate } from "../formatters";
import { styles } from "../styles";

function HeaderRow() {
  return (
    <View style={styles.tableHeader}>
      <Text style={styles.colPosition}>#</Text>
      <Text style={styles.colDescription}>Description</Text>
      <Text style={styles.colQuantity}>Qté</Text>
      <Text style={styles.colUnit}>Unité</Text>
      <Text style={styles.colUnitPrice}>PU HT</Text>
      <Text style={styles.colDiscount}>Remise</Text>
      <Text style={styles.colVat}>TVA</Text>
      <Text style={styles.colTotal}>Total HT</Text>
    </View>
  );
}

function LineRow({
  line,
  index,
  config,
}: {
  line: PdfLineData;
  index: number;
  config: PdfDocumentData["config"];
}) {
  const isAlt = index % 2 === 1;

  return (
    <View style={isAlt ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
      <Text style={styles.colPosition}>{line.position}</Text>
      <Text style={styles.colDescription}>{line.description}</Text>
      <Text style={styles.colQuantity}>{formatPdfQuantity(line.quantity, config.locale)}</Text>
      <Text style={styles.colUnit}>{line.unit}</Text>
      <Text style={styles.colUnitPrice}>
        {formatPdfCurrency(line.unitPrice, config.locale, config.currency)}
      </Text>
      <Text style={styles.colDiscount}>
        {line.discountPercent > 0 ? `${line.discountPercent} %` : "—"}
      </Text>
      <Text style={styles.colVat}>{formatPdfVatRate(line.vatRate, config.locale)}</Text>
      <Text style={styles.colTotal}>
        {formatPdfCurrency(line.lineTotalHt, config.locale, config.currency)}
      </Text>
    </View>
  );
}

export function PdfLinesTable({
  lines,
  config,
}: {
  lines: PdfLineData[];
  config: PdfDocumentData["config"];
}) {
  return (
    <View style={styles.table}>
      <HeaderRow />
      {lines.map((line, i) => (
        <LineRow key={line.position} line={line} index={i} config={config} />
      ))}
    </View>
  );
}
