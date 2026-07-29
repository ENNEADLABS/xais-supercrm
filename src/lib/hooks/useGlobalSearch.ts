import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SearchResults, SearchResult } from "@/types/search";
import { escapeLike } from "@/lib/utils/format";

// Seuil minimum de caracteres pour lancer la recherche
const MIN_QUERY_LENGTH = 2;

// Recherche globale multi-entites
async function globalSearch(query: string): Promise<SearchResults> {
  const supabase = createClient();
  const pattern = `%${escapeLike(query)}%`;

  // Lancer toutes les recherches en parallele
  const [contacts, companies, deals, quotes, invoices, products] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("companies")
      .select("id, name, city")
      .or(`name.ilike.${pattern},city.ilike.${pattern}`)
      .limit(5),
    supabase.from("deals").select("id, name, deal_status").ilike("name", pattern).limit(5),
    supabase
      .from("quotes")
      .select("id, reference, subject")
      .or(`reference.ilike.${pattern},subject.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("invoices")
      .select("id, reference, subject")
      .or(`reference.ilike.${pattern},subject.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("products")
      .select("id, name, reference")
      .or(`name.ilike.${pattern},reference.ilike.${pattern}`)
      .limit(5),
  ]);

  // Transformer les resultats en format uniforme
  const mapContacts: SearchResult[] = (contacts.data ?? []).map((c) => ({
    id: c.id,
    type: "contact" as const,
    title: `${c.first_name} ${c.last_name}`,
    subtitle: c.email ?? "",
    url: `/contacts/${c.id}`,
  }));

  const mapCompanies: SearchResult[] = (companies.data ?? []).map((c) => ({
    id: c.id,
    type: "company" as const,
    title: c.name,
    subtitle: c.city ?? "",
    url: `/companies/${c.id}`,
  }));

  const mapDeals: SearchResult[] = (deals.data ?? []).map((d) => ({
    id: d.id,
    type: "deal" as const,
    title: d.name,
    subtitle: d.deal_status ?? "",
    url: `/deals/${d.id}`,
  }));

  const mapQuotes: SearchResult[] = (quotes.data ?? []).map((q) => ({
    id: q.id,
    type: "quote" as const,
    title: q.reference ?? q.subject ?? "",
    subtitle: q.subject ?? "",
    url: `/quotes/${q.id}`,
  }));

  const mapInvoices: SearchResult[] = (invoices.data ?? []).map((i) => ({
    id: i.id,
    type: "invoice" as const,
    title: i.reference ?? i.subject ?? "",
    subtitle: i.subject ?? "",
    url: `/invoices/${i.id}`,
  }));

  const mapProducts: SearchResult[] = (products.data ?? []).map((p) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.reference ?? "",
    url: `/products/${p.id}`,
  }));

  return {
    contacts: mapContacts,
    companies: mapCompanies,
    deals: mapDeals,
    quotes: mapQuotes,
    invoices: mapInvoices,
    products: mapProducts,
    total:
      mapContacts.length +
      mapCompanies.length +
      mapDeals.length +
      mapQuotes.length +
      mapInvoices.length +
      mapProducts.length,
  };
}

export function useGlobalSearch(query: string) {
  return useQuery<SearchResults>({
    queryKey: ["global-search", query],
    queryFn: () => globalSearch(query),
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
