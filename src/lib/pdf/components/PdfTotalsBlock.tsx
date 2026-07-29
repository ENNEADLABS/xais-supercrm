// Bloc des totaux : HT, TVA, TTC, montant paye / reste a payer

import { View, Text } from "@react-pdf/renderer";
import type { PdfDocumentData } from "../types";
import { formatPdfCurrency } from "../formatters";
import { hideVatLine } from "../vatExemption";
import { styles } from "../styles";

export function PdfTotalsBlock({ data }: { data: PdfDocumentData }) {
  const { config } = data;
  const fmt = (cents: number) => formatPdfCurrency(cents, config.locale, config.currency);

  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Total HT</Text>
        <Text style={styles.totalsValue}>{fmt(data.totalHt)}</Text>
      </View>
      {!hideVatLine(data) && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>TVA</Text>
          <Text style={styles.totalsValue}>{fmt(data.totalTax)}</Text>
        </View>
      )}
      <View style={styles.totalsTtcRow}>
        <Text style={styles.totalsTtcLabel}>Total TTC</Text>
        <Text style={styles.totalsTtcValue}>{fmt(data.totalTtc)}</Text>
      </View>

      {/* Montant paye et reste a payer (factures uniquement) */}
      {data.type === "invoice" && data.paidAmount !== null && data.paidAmount > 0 && (
        <>
          <View style={[styles.totalsRow, { marginTop: 8 }]}>
            <Text style={styles.totalsLabel}>Déjà payé</Text>
            <Text style={styles.totalsValue}>{fmt(data.paidAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Reste à payer</Text>
            <Text style={styles.totalsValue}>{fmt(data.totalTtc - data.paidAmount)}</Text>
          </View>
        </>
      )}
    </View>
  );
}
