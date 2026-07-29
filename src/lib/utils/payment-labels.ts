// Labels des methodes de paiement — source unique

export type PaymentMethod = "virement" | "cheque" | "carte" | "prelevement" | "especes" | "autre";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  virement: "Virement",
  cheque: "Chèque",
  carte: "Carte bancaire",
  prelevement: "Prélèvement",
  especes: "Espèces",
  autre: "Autre",
};

// Version courte pour les badges et listes compactes
export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  virement: "Virement",
  cheque: "Chèque",
  carte: "CB",
  prelevement: "Prélèv.",
  especes: "Espèces",
  autre: "Autre",
};
