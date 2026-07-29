// En-tete du document PDF : infos emetteur a gauche, type/reference a droite

import { View, Text } from "@react-pdf/renderer";
import type { PdfDocumentData } from "../types";
import { formatPdfDate } from "../formatters";
import { styles } from "../styles";

const DOC_LABELS = { quote: "Devis", invoice: "Facture" } as const;

export function PdfHeader({ data }: { data: PdfDocumentData }) {
  const org = data.organization;
  const label = data.isCreditNote ? "Avoir" : DOC_LABELS[data.type];

  return (
    <View style={styles.header}>
      {/* Bloc emetteur */}
      <View style={styles.companyBlock}>
        <Text style={styles.companyName}>{org.legal_name ?? org.name}</Text>
        {org.address && <Text style={styles.companyDetail}>{org.address}</Text>}
        {(org.postal_code || org.city) && (
          <Text style={styles.companyDetail}>
            {[org.postal_code, org.city].filter(Boolean).join(" ")}
          </Text>
        )}
        {org.phone && <Text style={styles.companyDetail}>{org.phone}</Text>}
        {org.email && <Text style={styles.companyDetail}>{org.email}</Text>}
        {org.siret && <Text style={styles.companyDetail}>SIRET : {org.siret}</Text>}
        {org.vat_number && <Text style={styles.companyDetail}>TVA : {org.vat_number}</Text>}
      </View>

      {/* Bloc type de document + reference + dates */}
      <View style={styles.docInfoBlock}>
        <Text style={styles.docType}>{label}</Text>
        {data.reference && <Text style={styles.docDetail}>N° {data.reference}</Text>}
        {data.issuedAt && (
          <Text style={styles.docDetail}>
            Date : {formatPdfDate(data.issuedAt, data.config.locale)}
          </Text>
        )}
        {data.sentAt && (
          <Text style={styles.docDetail}>
            Envoyé le : {formatPdfDate(data.sentAt, data.config.locale)}
          </Text>
        )}
        {data.signedAt && (
          <Text style={styles.docDetail}>
            Signé le : {formatPdfDate(data.signedAt, data.config.locale)}
          </Text>
        )}
      </View>
    </View>
  );
}
