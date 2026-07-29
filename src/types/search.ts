// Types pour la recherche globale

export interface SearchResult {
  id: string;
  type: "contact" | "company" | "deal" | "quote" | "invoice" | "product";
  title: string;
  subtitle: string;
  url: string;
}

export interface SearchResults {
  contacts: SearchResult[];
  companies: SearchResult[];
  deals: SearchResult[];
  quotes: SearchResult[];
  invoices: SearchResult[];
  products: SearchResult[];
  total: number;
}
