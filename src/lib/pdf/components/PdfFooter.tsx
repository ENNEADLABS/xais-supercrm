// Pied de page : notes, mentions legales, informations societe

import { View, Text } from "@react-pdf/renderer";
import type { PdfDocumentData } from "../types";
import { formatPdfDate, formatPdfCurrency } from "../formatters";
import { showVatExemptMention, VAT_EXEMPT_293B_MENTION } from "../vatExemption";
import { styles } from "../styles";

/** Mentions legales obligatoires selon le type de document */
function LegalMentions({ data }: { data: PdfDocumentData }) {
  const { config, organization: org } = data;

  return (
    <View>
      {/* Validite (devis) ou echeance (facture) */}
      {data.type === "quote" && data.validityDays && (
        // Une seule expression : react-pdf avale l'espace de tete d'un segment
        // texte qui suit une expression JSX ("30jours" au lieu de "30 jours")
        <Text style={styles.footerLegal}>
          {`Devis valable ${data.validityDays} jours à compter de la date d'émission.`}
        </Text>
      )}
      {data.type === "invoice" && data.dueDate && (
        <Text style={styles.footerLegal}>
          Échéance : {formatPdfDate(data.dueDate, config.locale)}
        </Text>
      )}

      {/* Franchise en base de TVA — mention obligatoire (art. 293 B du CGI) */}
      {showVatExemptMention(data) && (
        <Text style={styles.footerLegal}>{VAT_EXEMPT_293B_MENTION}.</Text>
      )}

      {/* Penalites de retard — obligatoire sur factures FR */}
      <Text style={styles.footerLegal}>
        Pénalités de retard : 3 fois le taux d&apos;intérêt légal.
      </Text>
      <Text style={styles.footerLegal}>
        Indemnité forfaitaire de recouvrement :{" "}
        {formatPdfCurrency(4000, config.locale, config.currency)}.
      </Text>

      {/* Informations societe */}
      {org.siret && <Text style={styles.footerLegal}>SIRET : {org.siret}</Text>}
      {org.vat_number && (
        <Text style={styles.footerLegal}>TVA intracommunautaire : {org.vat_number}</Text>
      )}
      {org.rcs && <Text style={styles.footerLegal}>RCS : {org.rcs}</Text>}
      {org.capital && <Text style={styles.footerLegal}>Capital : {org.capital}</Text>}
      {org.ape_code && <Text style={styles.footerLegal}>Code APE : {org.ape_code}</Text>}
    </View>
  );
}

export function PdfFooter({ data }: { data: PdfDocumentData }) {
  return (
    <View style={styles.footer}>
      {/* Notes libres */}
      {data.notes && <Text style={styles.footerNotes}>{data.notes}</Text>}

      <LegalMentions data={data} />
    </View>
  );
}
