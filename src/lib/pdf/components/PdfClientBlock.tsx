// Bloc client : societe destinataire + contact — ou contact seul (spec 025)

import { View, Text } from "@react-pdf/renderer";
import type { PdfDocumentData } from "../types";
import { styles } from "../styles";

export function PdfClientBlock({ data }: { data: PdfDocumentData }) {
  const { company, contact } = data;

  return (
    <View style={styles.clientBlock}>
      <Text style={styles.clientLabel}>Destinataire</Text>
      {company ? (
        <>
          <Text style={styles.clientName}>{company.name}</Text>
          {company.address && <Text style={styles.clientDetail}>{company.address}</Text>}
          {(company.postalCode || company.city) && (
            <Text style={styles.clientDetail}>
              {[company.postalCode, company.city].filter(Boolean).join(" ")}
            </Text>
          )}
          {company.country && <Text style={styles.clientDetail}>{company.country}</Text>}
          {contact && (
            <Text style={styles.clientDetail}>
              {contact.firstName} {contact.lastName}
              {contact.email ? ` — ${contact.email}` : ""}
            </Text>
          )}
        </>
      ) : contact ? (
        // Devis/facture sans societe : le contact est le destinataire
        <>
          <Text style={styles.clientName}>
            {contact.firstName} {contact.lastName}
          </Text>
          {contact.email && <Text style={styles.clientDetail}>{contact.email}</Text>}
        </>
      ) : (
        // Etat impossible en pratique (CHECK chk_quote_recipient) — filet visuel
        <Text style={styles.clientName}>—</Text>
      )}
    </View>
  );
}
