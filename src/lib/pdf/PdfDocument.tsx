// Composant principal assemblant toutes les sections du document PDF

import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { PdfDocumentData } from "./types";
import { styles } from "./styles";
import { PdfHeader } from "./components/PdfHeader";
import { PdfClientBlock } from "./components/PdfClientBlock";
import { PdfLinesTable } from "./components/PdfLinesTable";
import { PdfTotalsBlock } from "./components/PdfTotalsBlock";
import { PdfFooter } from "./components/PdfFooter";

/** Filigrane "BROUILLON" en diagonale pour les documents non valides */
function WatermarkView() {
  return (
    <View style={styles.watermark} fixed>
      <Text>BROUILLON</Text>
    </View>
  );
}

/** Ligne d'objet entre le bloc client et le tableau */
function SubjectLine({ subject }: { subject: string }) {
  return (
    <View>
      <Text style={styles.subject}>Objet : {subject}</Text>
    </View>
  );
}

export interface PdfDocumentProps {
  data: PdfDocumentData;
}

export function PdfDocument({ data }: PdfDocumentProps) {
  return (
    <Document
      title={`${data.type === "quote" ? "Devis" : "Facture"} ${data.reference ?? ""}`}
      author={data.organization.name}
    >
      <Page size="A4" style={styles.page}>
        {data.isDraft && <WatermarkView />}
        <PdfHeader data={data} />
        <PdfClientBlock data={data} />
        <SubjectLine subject={data.subject} />
        <PdfLinesTable lines={data.lines} config={data.config} />
        <PdfTotalsBlock data={data} />
        <PdfFooter data={data} />
      </Page>
    </Document>
  );
}
