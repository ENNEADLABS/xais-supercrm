import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, escapeLike } from "@/lib/utils/format";

// --- Types pour la recherche globale ---

export interface SearchResult {
  id: string;
  type: string;
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

// --- Resultats vides ---

function emptyResults(): SearchResults {
  return {
    contacts: [],
    companies: [],
    deals: [],
    quotes: [],
    invoices: [],
    products: [],
    total: 0,
  };
}

// --- Recherche globale multi-entite ---

export async function search(organizationId: string, query: string): Promise<SearchResults> {
  // Minimum 2 caracteres pour lancer la recherche
  if (query.length < 2) return emptyResults();

  const supabase = await createServerSupabaseClient();
  const q = `%${escapeLike(query)}%`;

  // Requetes paralleles sur toutes les entites
  const [contacts, companies, deals, quotes, invoices, products] = await Promise.all([
    // Contacts : recherche prenom, nom, email
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, job_title")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
      .is("deleted_at", null)
      .limit(5),

    // Societes : recherche nom, domaine
    supabase
      .from("companies")
      .select("id, name, domain, city")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(`name.ilike.${q},domain.ilike.${q}`)
      .is("deleted_at", null)
      .limit(5),

    // Opportunites : recherche nom
    supabase
      .from("deals")
      .select("id, name, amount, stage")
      .eq("organization_id", organizationId)
      .eq("deal_status", "open")
      .ilike("name", q)
      .is("deleted_at", null)
      .limit(5),

    // Devis : recherche reference, objet
    supabase
      .from("quotes")
      .select("id, reference, subject, total_ttc, status")
      .eq("organization_id", organizationId)
      .or(`reference.ilike.${q},subject.ilike.${q}`)
      .is("deleted_at", null)
      .limit(5),

    // Factures : recherche reference, objet
    supabase
      .from("invoices")
      .select("id, reference, subject, total_ttc, status")
      .eq("organization_id", organizationId)
      .or(`reference.ilike.${q},subject.ilike.${q}`)
      .is("deleted_at", null)
      .limit(5),

    // Produits : recherche nom, reference
    supabase
      .from("products")
      .select("id, name, reference, unit_price")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(`name.ilike.${q},reference.ilike.${q}`)
      .is("deleted_at", null)
      .limit(5),
  ]);

  // Transformation en format unifie SearchResult
  const contactResults: SearchResult[] = (contacts.data ?? []).map((c) => ({
    id: c.id,
    type: "contact",
    title: `${c.first_name} ${c.last_name}`,
    subtitle: c.email || c.job_title || "",
    url: `/contacts/${c.id}`,
  }));

  const companyResults: SearchResult[] = (companies.data ?? []).map((c) => ({
    id: c.id,
    type: "company",
    title: c.name,
    subtitle: [c.domain, c.city].filter(Boolean).join(" · "),
    url: `/companies/${c.id}`,
  }));

  const dealResults: SearchResult[] = (deals.data ?? []).map((d) => ({
    id: d.id,
    type: "deal",
    title: d.name,
    subtitle: [d.stage, d.amount != null ? formatCurrency(d.amount) : null]
      .filter(Boolean)
      .join(" · "),
    url: `/deals/${d.id}`,
  }));

  const quoteResults: SearchResult[] = (quotes.data ?? []).map((q) => ({
    id: q.id,
    type: "quote",
    title: q.reference || q.subject,
    subtitle: [q.status, formatCurrency(q.total_ttc)].filter(Boolean).join(" · "),
    url: `/quotes/${q.id}`,
  }));

  const invoiceResults: SearchResult[] = (invoices.data ?? []).map((i) => ({
    id: i.id,
    type: "invoice",
    title: i.reference || i.subject,
    subtitle: [i.status, formatCurrency(i.total_ttc)].filter(Boolean).join(" · "),
    url: `/invoices/${i.id}`,
  }));

  const productResults: SearchResult[] = (products.data ?? []).map((p) => ({
    id: p.id,
    type: "product",
    title: p.name,
    subtitle: [p.reference, formatCurrency(p.unit_price)].filter(Boolean).join(" · "),
    url: `/products/${p.id}`,
  }));

  return {
    contacts: contactResults,
    companies: companyResults,
    deals: dealResults,
    quotes: quoteResults,
    invoices: invoiceResults,
    products: productResults,
    total:
      contactResults.length +
      companyResults.length +
      dealResults.length +
      quoteResults.length +
      invoiceResults.length +
      productResults.length,
  };
}
