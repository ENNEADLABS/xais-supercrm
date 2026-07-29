// Styles partages pour les documents PDF react-pdf

import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  companyBlock: {
    maxWidth: 220,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 1,
  },
  docInfoBlock: {
    textAlign: "right",
    maxWidth: 200,
  },
  docType: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  docDetail: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 2,
  },
  clientBlock: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  clientLabel: {
    fontSize: 8,
    color: "#888888",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  clientName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 1,
  },
  subject: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  // --- Tableau des lignes ---
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    padding: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    padding: 6,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  // Colonnes du tableau
  colPosition: { width: "5%" },
  colDescription: { width: "30%" },
  colQuantity: { width: "8%", textAlign: "right" },
  colUnit: { width: "8%", textAlign: "center" },
  colUnitPrice: { width: "15%", textAlign: "right" },
  colDiscount: { width: "9%", textAlign: "right" },
  colVat: { width: "10%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  // --- Totaux ---
  totalsBlock: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
    width: 220,
  },
  totalsLabel: {
    fontSize: 9,
    width: 120,
    textAlign: "right",
    paddingRight: 8,
  },
  totalsValue: {
    fontSize: 9,
    width: 100,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  totalsTtcRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingTop: 4,
    marginTop: 2,
  },
  totalsTtcLabel: {
    fontSize: 11,
    width: 120,
    textAlign: "right",
    paddingRight: 8,
    fontFamily: "Helvetica-Bold",
  },
  totalsTtcValue: {
    fontSize: 11,
    width: 100,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  // --- Pied de page ---
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
  },
  footerNotes: {
    fontSize: 9,
    marginBottom: 8,
    color: "#333333",
  },
  footerLegal: {
    fontSize: 7,
    color: "#888888",
    marginBottom: 2,
  },
  // --- Filigrane brouillon ---
  watermark: {
    position: "absolute",
    top: 300,
    left: 80,
    fontSize: 60,
    color: "#e5e7eb",
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-45deg)",
    opacity: 0.5,
  },
});
