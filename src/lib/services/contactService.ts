import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Contact, Database, Json } from "@/types/database";
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactSearchInput,
} from "@/lib/schemas/contact";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// --- Liste paginee avec recherche et filtres ---
// `client` optionnel : par defaut la session cookie de l'utilisateur courant.
// Permet de reutiliser ces fonctions avec une autre session RLS-scopee (ex.
// le client robot d'un bot externe, cf. src/lib/utils/apiAuth.ts).

export async function getContacts(
  organizationId: string,
  params?: ContactSearchInput,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  // Recherche texte libre
  if (params?.query) {
    const q = params.query;
    query = query.or(
      `first_name.ilike.%${escapeLike(q)}%,last_name.ilike.%${escapeLike(q)}%,email.ilike.%${escapeLike(q)}%`,
    );
  }

  // Filtre par statut
  if (params?.status) {
    query = query.eq("status", params.status);
  }

  // Filtre par tags : recuperer les contact_ids depuis contact_tags puis filtrer
  if (params?.tag_ids && params.tag_ids.length > 0) {
    const { data: tagMatches } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .in("tag_id", params.tag_ids);

    const contactIds = [...new Set((tagMatches ?? []).map((t) => t.contact_id as string))];
    if (contactIds.length === 0) return { data: [], count: 0 };
    query = query.in("id", contactIds);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Contact[]) ?? [], count: count ?? 0 };
}

// --- Recherche exacte par email ou telephone (ex. lookup avant creation par un bot externe) ---
// Semantique OR : union des matches email/telephone (deduplication de bot —
// un AND raterait un contact connu par un seul des deux identifiants).
// Email compare en insensible a la casse (ilike sans wildcard = egalite),
// sinon "John@example.com" ne matche pas "john@example.com" et le bot cree un doublon.

export async function findContactsByEmailOrPhone(
  organizationId: string,
  filters: { email?: string; phone?: string },
  client?: SupabaseClient<Database>,
): Promise<Contact[]> {
  if (!filters.email && !filters.phone) return [];

  const supabase = client ?? (await createServerSupabaseClient());

  const baseQuery = () =>
    supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

  // Deux requetes filtrees separement (pas de .or() PostgREST : la valeur y
  // serait interpolee dans la grammaire de filtre, injectable via `,()`).
  const results: Contact[] = [];
  if (filters.email) {
    const { data, error } = await baseQuery().ilike("email", escapeLike(filters.email));
    if (error) throw error;
    results.push(...((data as Contact[]) ?? []));
  }
  if (filters.phone) {
    const { data, error } = await baseQuery().eq("phone", filters.phone);
    if (error) throw error;
    results.push(...((data as Contact[]) ?? []));
  }

  // Deduplique l'union (un contact peut matcher les deux filtres)
  return [...new Map(results.map((c) => [c.id, c])).values()];
}

// --- Existence d'un contact (check leger avant rattachement, ex. note bot) ---

export async function contactExists(
  organizationId: string,
  contactId: string,
  client?: SupabaseClient<Database>,
): Promise<boolean> {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .is("deleted_at", null);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// --- Detail d'un contact avec societes et tags ---

export async function getContact(organizationId: string, contactId: string) {
  const supabase = await createServerSupabaseClient();

  // Recuperer le contact
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!contacts || contacts.length === 0) return null;

  const contact = contacts[0];

  // Societes liees
  const { data: contactCompanies } = await supabase
    .from("contact_companies")
    .select("*, companies(*)")
    .eq("contact_id", contactId);

  const activeContactCompanies = (contactCompanies ?? []).filter(
    (cc) => !(cc.companies as Record<string, unknown> | null)?.deleted_at,
  );

  // Tags lies
  const { data: contactTags } = await supabase
    .from("contact_tags")
    .select("*, tags(*)")
    .eq("contact_id", contactId);

  return {
    ...contact,
    companies: activeContactCompanies,
    tags: contactTags ?? [],
  };
}

// --- Creation ---

export async function createContact(
  organizationId: string,
  input: CreateContactInput,
  client?: SupabaseClient<Database>,
  actorId?: string,
) {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      ...input,
      custom_fields: input.custom_fields as Json,
      organization_id: organizationId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Contact creation failed");

  const contact = data[0];

  // Log d'activite (actorId : attribution des ecritures bot, cf. spec 024)
  await activityService.log(
    organizationId,
    {
      entityType: "contact",
      entityId: contact.id,
      action: "created",
      actorId,
    },
    supabase,
  );

  return contact;
}

// --- Mise a jour ---

export async function updateContact(
  organizationId: string,
  contactId: string,
  input: UpdateContactInput,
  client?: SupabaseClient<Database>,
  actorId?: string,
) {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("contacts")
    .update({ ...input, custom_fields: input.custom_fields as Json })
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Contact not found");

  await activityService.log(
    organizationId,
    {
      entityType: "contact",
      entityId: contactId,
      action: "updated",
      actorId,
      metadata: { fields: Object.keys(input) },
    },
    supabase,
  );

  return data[0];
}

// --- Archivage ---

export async function archiveContact(organizationId: string, contactId: string) {
  return updateContact(organizationId, contactId, { status: "archived" });
}

// --- Fusion de deux contacts ---

export async function mergeContacts(
  organizationId: string,
  winnerId: string,
  loserId: string,
  fieldOverrides?: Record<string, unknown>,
) {
  const supabase = await createServerSupabaseClient();

  // Appel de la fonction SQL transactionnelle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- merge_contacts pas encore dans les types generes
  const { error } = await (supabase.rpc as any)("merge_contacts", {
    p_org_id: organizationId,
    p_winner_id: winnerId,
    p_loser_id: loserId,
    p_field_overrides: fieldOverrides ?? {},
  });

  if (error) throw error;

  // Retourner le contact fusionne
  const merged = await getContact(organizationId, winnerId);
  if (!merged) throw new Error("Merged contact not found");
  return merged;
}
