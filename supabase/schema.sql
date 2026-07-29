


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."asset_role" AS ENUM (
    'thumbnail',
    'raw_video',
    'final_video',
    'short_clip',
    'audio',
    'transcript',
    'script_doc',
    'brand_asset',
    'reference'
);


ALTER TYPE "public"."asset_role" OWNER TO "postgres";


CREATE TYPE "public"."content_format" AS ENUM (
    'youtube_long',
    'youtube_short',
    'skool_post',
    'newsletter',
    'linkedin_post',
    'podcast',
    'course_lesson',
    'blog_article',
    'case_study',
    'other'
);


ALTER TYPE "public"."content_format" OWNER TO "postgres";


CREATE TYPE "public"."content_status" AS ENUM (
    'idea',
    'research',
    'script',
    'recording',
    'editing',
    'review',
    'scheduled',
    'published',
    'archived'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."deal_status" AS ENUM (
    'open',
    'won',
    'lost'
);


ALTER TYPE "public"."deal_status" OWNER TO "postgres";


CREATE TYPE "public"."deliverable_status" AS ENUM (
    'planned',
    'draft',
    'ready',
    'scheduled',
    'published',
    'cancelled'
);


ALTER TYPE "public"."deliverable_status" OWNER TO "postgres";


CREATE TYPE "public"."email_account_status" AS ENUM (
    'connected',
    'disconnected',
    'error'
);


ALTER TYPE "public"."email_account_status" OWNER TO "postgres";


CREATE TYPE "public"."email_direction" AS ENUM (
    'inbound',
    'outbound'
);


ALTER TYPE "public"."email_direction" OWNER TO "postgres";


CREATE TYPE "public"."email_participant_role" AS ENUM (
    'from',
    'to',
    'cc',
    'bcc'
);


ALTER TYPE "public"."email_participant_role" OWNER TO "postgres";


CREATE TYPE "public"."email_provider" AS ENUM (
    'gmail',
    'microsoft',
    'imap_smtp'
);


ALTER TYPE "public"."email_provider" OWNER TO "postgres";


CREATE TYPE "public"."entity_status" AS ENUM (
    'active',
    'archived'
);


ALTER TYPE "public"."entity_status" OWNER TO "postgres";


CREATE TYPE "public"."entity_type" AS ENUM (
    'contact',
    'company',
    'deal',
    'quote',
    'invoice',
    'product',
    'task',
    'email',
    'content_idea',
    'content_piece',
    'deliverable',
    'content_template'
);


ALTER TYPE "public"."entity_type" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'validated',
    'sent',
    'paid',
    'partial',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."member_role" AS ENUM (
    'admin',
    'member',
    'viewer'
);


ALTER TYPE "public"."member_role" OWNER TO "postgres";


CREATE TYPE "public"."publication_channel" AS ENUM (
    'youtube',
    'skool',
    'linkedin',
    'newsletter',
    'instagram',
    'tiktok',
    'x_twitter',
    'podcast',
    'blog',
    'other'
);


ALTER TYPE "public"."publication_channel" OWNER TO "postgres";


CREATE TYPE "public"."quote_status" AS ENUM (
    'draft',
    'validated',
    'sent',
    'signed',
    'refused',
    'cancelled',
    'invoiced'
);


ALTER TYPE "public"."quote_status" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'done',
    'cancelled'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_content_template"("p_template_id" "uuid", "p_title" "text", "p_scheduled_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_user uuid := auth.uid();
  v_org  uuid := get_user_org_id();
  v_template content_templates%rowtype;
  v_piece_id uuid;
  v_piece_date date := p_scheduled_date::date;
begin
  -- 1. Garde-fous d'autorite (jamais de confiance a des parametres clients)
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if get_user_role() not in ('admin', 'member') then
    raise exception 'insufficient role';
  end if;

  -- 2. Le template doit appartenir a l'org de l'appelant (verrou en lecture)
  select * into v_template
  from content_templates
  where id = p_template_id
    and organization_id = v_org
    and deleted_at is null
  for share;

  if not found then
    raise exception 'template not found in organization';
  end if;

  -- 3a. Piece principale (format/cible/priorite herites du template)
  insert into content_pieces (
    organization_id, title, format, target_audience, priority,
    owner_id, scheduled_date
  ) values (
    v_org, p_title, v_template.format, v_template.target_audience,
    v_template.default_priority, v_user, v_piece_date
  )
  returning id into v_piece_id;

  -- 3b. Script pre-rempli depuis le squelette (un script par piece). On n'insere
  --     que si le template porte un squelette : sinon le script reste cree a la
  --     demande (upsert), comme pour une piece sans template.
  if v_template.script_skeleton is not null then
    insert into content_scripts (
      organization_id, content_piece_id,
      hook, intro, structure, key_points, cta, shooting_notes
    ) values (
      v_org, v_piece_id,
      v_template.script_skeleton ->> 'hook',
      v_template.script_skeleton ->> 'intro',
      v_template.script_skeleton ->> 'structure',
      v_template.script_skeleton ->> 'key_points',
      v_template.script_skeleton ->> 'cta',
      v_template.script_skeleton ->> 'shooting_notes'
    );
  end if;

  -- 3c. Checklist (string[] ordonne)
  insert into content_checklist_items (organization_id, content_piece_id, label, position)
  select v_org, v_piece_id, item.value, (item.ord - 1)::int
  from jsonb_array_elements_text(v_template.checklist_items) with ordinality as item(value, ord);

  -- 3d. Livrables a decliner (date = p_scheduled_date + offset_days de chaque spec)
  insert into deliverables (
    organization_id, content_piece_id, title, format, status, channel, scheduled_date, position
  )
  select
    v_org,
    v_piece_id,
    spec.value ->> 'title',
    (spec.value ->> 'format')::content_format,
    coalesce((spec.value ->> 'status')::deliverable_status, 'planned'),
    (spec.value ->> 'channel')::publication_channel,
    case
      when v_piece_date is not null
        then v_piece_date + coalesce((spec.value ->> 'offset_days')::int, 0)
      else null
    end,
    (spec.ord - 1)::int
  from jsonb_array_elements(v_template.deliverable_specs) with ordinality as spec(value, ord);

  return v_piece_id;
end;
$$;


ALTER FUNCTION "public"."apply_content_template"("p_template_id" "uuid", "p_title" "text", "p_scheduled_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_invoice_line_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Cast en bigint pour eviter l'overflow sur les gros montants
  new.line_total_ht := round(new.unit_price::bigint * new.quantity * (10000 - new.discount_percent) / 10000)::integer;
  -- ::numeric (pas ::bigint) : sinon la division entière tronque AVANT round()
  -- (ex. 333 * 2000 / 10000 = 66 au lieu de 66,6 -> 67). Arrondi TVA au centime.
  new.line_total_tax := round(new.line_total_ht::numeric * new.vat_rate / 10000)::integer;
  new.line_total_ttc := new.line_total_ht + new.line_total_tax;
  return new;
end;
$$;


ALTER FUNCTION "public"."calculate_invoice_line_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_quote_line_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Cast en bigint pour eviter l'overflow sur les gros montants
  new.line_total_ht := round(new.unit_price::bigint * new.quantity * (10000 - new.discount_percent) / 10000)::integer;
  -- ::numeric (pas ::bigint) : sinon la division entière tronque AVANT round()
  -- (ex. 333 * 2000 / 10000 = 66 au lieu de 66,6 -> 67). Arrondi TVA au centime.
  new.line_total_tax := round(new.line_total_ht::numeric * new.vat_rate / 10000)::integer;
  new.line_total_ttc := new.line_total_ht + new.line_total_tax;
  return new;
end;
$$;


ALTER FUNCTION "public"."calculate_quote_line_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_invoice_with_credit_note"("p_org_id" "uuid", "p_invoice_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_invoice record;
  v_credit_note_id uuid;
begin
  -- Verrouiller la facture
  select * into v_invoice
  from invoices
  where id = p_invoice_id
    and organization_id = p_org_id
  for update;

  if not found then
    raise exception 'Facture introuvable';
  end if;

  if v_invoice.status = 'paid' then
    raise exception 'Annulation impossible : la facture est payee';
  end if;

  if v_invoice.status = 'cancelled' then
    raise exception 'La facture est deja annulee';
  end if;

  -- Creer la facture d'avoir
  insert into invoices (
    organization_id, company_id, contact_id, deal_id,
    subject, status, is_credit_note, credit_note_for, created_by
  ) values (
    p_org_id, v_invoice.company_id, v_invoice.contact_id, v_invoice.deal_id,
    'Avoir - ' || v_invoice.subject, 'draft', true, p_invoice_id, v_invoice.created_by
  )
  returning id into v_credit_note_id;

  -- Copier les lignes avec montants negatifs
  insert into invoice_lines (
    invoice_id, product_id, description, quantity,
    unit, unit_price, vat_rate, discount_percent, position
  )
  select
    v_credit_note_id, product_id, description, quantity,
    unit, -abs(unit_price), vat_rate, discount_percent, position
  from invoice_lines
  where invoice_id = p_invoice_id
  order by position;

  -- Passer la facture originale en cancelled
  update invoices
  set status = 'cancelled'
  where id = p_invoice_id
    and organization_id = p_org_id;

  return v_credit_note_id;
end;
$$;


ALTER FUNCTION "public"."cancel_invoice_with_credit_note"("p_org_id" "uuid", "p_invoice_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_quote_to_invoice"("p_org_id" "uuid", "p_user_id" "uuid", "p_quote_id" "uuid", "p_due_date" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_quote record;
  v_invoice_id uuid;
  v_line record;
begin
  -- Verrouiller le devis pour eviter les conversions concurrentes
  select * into v_quote
  from quotes
  where id = p_quote_id
    and organization_id = p_org_id
  for update;

  if not found then
    raise exception 'Devis introuvable';
  end if;

  if v_quote.status != 'signed' then
    raise exception 'Seul un devis signe peut etre converti en facture (statut actuel: %)', v_quote.status;
  end if;

  -- Creer la facture brouillon
  insert into invoices (
    organization_id, company_id, contact_id, deal_id,
    subject, source_quote_id, due_date, status, created_by
  ) values (
    p_org_id, v_quote.company_id, v_quote.contact_id, v_quote.deal_id,
    v_quote.subject, p_quote_id, p_due_date, 'draft', p_user_id
  )
  returning id into v_invoice_id;

  -- Copier les lignes du devis vers la facture
  insert into invoice_lines (
    invoice_id, product_id, description, quantity,
    unit, unit_price, vat_rate, discount_percent, position
  )
  select
    v_invoice_id, product_id, description, quantity,
    unit, unit_price, vat_rate, discount_percent, position
  from quote_lines
  where quote_id = p_quote_id
  order by position;

  -- Passer le devis en statut invoiced
  update quotes
  set status = 'invoiced'
  where id = p_quote_id
    and organization_id = p_org_id;

  return v_invoice_id;
end;
$$;


ALTER FUNCTION "public"."convert_quote_to_invoice"("p_org_id" "uuid", "p_user_id" "uuid", "p_quote_id" "uuid", "p_due_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_quote_with_lines"("p_org_id" "uuid", "p_user_id" "uuid", "p_contact_id" "uuid", "p_subject" "text", "p_validity_days" integer, "p_lines" "jsonb", "p_validate" boolean, "p_company_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_quote_id uuid;
  v_total_ht integer;
  v_ref text;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Le devis doit contenir au moins une ligne';
  end if;

  -- RLS quotes_insert : organization_id doit etre l'org de la session
  -- appelante — un p_org_id etranger echoue ici (rollback).
  insert into public.quotes (
    organization_id, contact_id, company_id, subject, notes,
    validity_days, status, created_by
  ) values (
    p_org_id, p_contact_id, p_company_id, p_subject, p_notes,
    coalesce(p_validity_days, 30), 'draft', p_user_id
  )
  returning id into v_quote_id;

  insert into public.quote_lines (
    quote_id, description, quantity, unit, unit_price,
    vat_rate, discount_percent, position
  )
  select
    v_quote_id,
    line->>'description',
    (line->>'quantity')::numeric,
    coalesce(line->>'unit', 'unite'),
    (line->>'unit_price')::integer,
    (line->>'vat_rate')::integer,
    coalesce((line->>'discount_percent')::integer, 0),
    (idx - 1)::integer
  from jsonb_array_elements(p_lines) with ordinality as t(line, idx);

  if p_validate then
    -- Invariant domaine existant (cf. validateQuote) : total HT > 0.
    select total_ht into v_total_ht from public.quotes where id = v_quote_id;
    if coalesce(v_total_ht, 0) <= 0 then
      raise exception 'Le total HT doit etre superieur a 0';
    end if;

    v_ref := public.generate_quote_reference(p_org_id);

    update public.quotes
    set status = 'validated', reference = v_ref, issued_at = now()
    where id = v_quote_id;
  end if;

  return v_quote_id;
end;
$$;


ALTER FUNCTION "public"."create_quote_with_lines"("p_org_id" "uuid", "p_user_id" "uuid", "p_contact_id" "uuid", "p_subject" "text", "p_validity_days" integer, "p_lines" "jsonb", "p_validate" boolean, "p_company_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_reference"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_prefix text;
  v_year integer;
  v_next integer;
begin
  v_year := extract(year from now())::integer;

  select coalesce(config->>'invoice_prefix', 'FAC')
  into v_prefix
  from tenant_config
  where organization_id = p_org_id;

  if v_prefix is null then
    v_prefix := 'FAC';
  end if;

  insert into invoice_sequences (organization_id, year, last_number)
  values (p_org_id, v_year, 1)
  on conflict (organization_id, year)
  do update set last_number = invoice_sequences.last_number + 1
  returning last_number into v_next;

  return v_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;


ALTER FUNCTION "public"."generate_invoice_reference"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_quote_reference"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_prefix text;
  v_year integer;
  v_next integer;
  v_ref text;
begin
  v_year := extract(year from now())::integer;

  -- Recuperer le prefix depuis tenant_config
  select coalesce(config->>'quote_prefix', 'DEV')
  into v_prefix
  from tenant_config
  where organization_id = p_org_id;

  if v_prefix is null then
    v_prefix := 'DEV';
  end if;

  -- Inserer ou mettre a jour la sequence
  insert into quote_sequences (organization_id, current_number, year)
  values (p_org_id, 1, v_year)
  on conflict (organization_id) do update set
    current_number = case
      when quote_sequences.year = v_year then quote_sequences.current_number + 1
      else 1
    end,
    year = v_year
  returning current_number into v_next;

  v_ref := v_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
  return v_ref;
end;
$$;


ALTER FUNCTION "public"."generate_quote_reference"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select organization_id
  from organization_members
  where user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_user_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role::text
  from organization_members
  where user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
  v_full_name text;
  v_slug text;
begin
  -- Extraire le nom depuis les metadata du signup
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_slug := 'org-' || replace(gen_random_uuid()::text, '-', '');

  -- Creer l'organisation
  insert into organizations (name, slug)
  values (v_full_name || '''s Organization', v_slug)
  returning id into v_org_id;

  -- Ajouter le user comme admin
  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, 'admin');

  -- Creer la config tenant par defaut
  insert into tenant_config (organization_id, config)
  values (v_org_id, '{
    "currency": "EUR",
    "locale": "fr-FR",
    "quote_prefix": "DEV",
    "invoice_prefix": "FAC",
    "pipeline_stages": [
      {"id": "new", "label": "Nouveau", "color": "#6B7280", "order": 0},
      {"id": "qualifying", "label": "Qualification", "color": "#3B82F6", "order": 1},
      {"id": "proposal", "label": "Proposition", "color": "#F59E0B", "order": 2},
      {"id": "negotiation", "label": "Négociation", "color": "#8B5CF6", "order": 3},
      {"id": "won", "label": "Gagné", "color": "#10B981", "order": 4},
      {"id": "lost", "label": "Perdu", "color": "#EF4444", "order": 5}
    ],
    "probability_map": {"new": 10, "qualifying": 25, "proposal": 50, "negotiation": 75, "won": 100, "lost": 0},
    "default_vat_rate": 2000,
    "payment_terms_days": 30
  }'::jsonb);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_contacts"("p_org_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid", "p_field_overrides" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_winner contacts%rowtype;
  v_loser contacts%rowtype;
begin
  -- 1. Verifier que les 2 contacts existent et sont dans la meme org
  select * into v_winner from contacts
    where id = p_winner_id and organization_id = p_org_id;
  if not found then
    raise exception 'Winner contact not found';
  end if;

  select * into v_loser from contacts
    where id = p_loser_id and organization_id = p_org_id;
  if not found then
    raise exception 'Loser contact not found';
  end if;

  -- 2. Appliquer les field_overrides sur le winner
  if p_field_overrides != '{}'::jsonb then
    update contacts set
      first_name = coalesce(p_field_overrides->>'first_name', v_winner.first_name),
      last_name = coalesce(p_field_overrides->>'last_name', v_winner.last_name),
      email = coalesce(p_field_overrides->>'email', v_winner.email),
      phone = coalesce(p_field_overrides->>'phone', v_winner.phone),
      job_title = coalesce(p_field_overrides->>'job_title', v_winner.job_title),
      custom_fields = v_winner.custom_fields || coalesce(v_loser.custom_fields, '{}'::jsonb),
      updated_at = now()
    where id = p_winner_id;
  else
    -- Merger les custom_fields et combler les trous
    update contacts set
      email = coalesce(v_winner.email, v_loser.email),
      phone = coalesce(v_winner.phone, v_loser.phone),
      job_title = coalesce(v_winner.job_title, v_loser.job_title),
      custom_fields = v_winner.custom_fields || coalesce(v_loser.custom_fields, '{}'::jsonb),
      updated_at = now()
    where id = p_winner_id;
  end if;

  -- 3. Reparenter contact_companies (dedupliquer d'abord)
  delete from contact_companies
    where contact_id = p_loser_id
    and company_id in (select company_id from contact_companies where contact_id = p_winner_id);
  update contact_companies set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 4. Reparenter contact_tags (dedupliquer)
  delete from contact_tags
    where contact_id = p_loser_id
    and tag_id in (select tag_id from contact_tags where contact_id = p_winner_id);
  update contact_tags set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 4b. Reparenter contact_channels (dedupliquer)
  delete from contact_channels
    where contact_id = p_loser_id
    and (type, value) in (
      select type, value from contact_channels where contact_id = p_winner_id
    );
  update contact_channels set contact_id = p_winner_id, organization_id = p_org_id
    where contact_id = p_loser_id;

  -- 5. Reparenter deal_contacts (dedupliquer)
  delete from deal_contacts
    where contact_id = p_loser_id
    and deal_id in (select deal_id from deal_contacts where contact_id = p_winner_id);
  update deal_contacts set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 6. Reparenter quotes
  update quotes set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 7. Reparenter invoices
  update invoices set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 8. Reparenter email_participants
  update email_participants set contact_id = p_winner_id where contact_id = p_loser_id;

  -- 9. Reparenter les liens polymorphes (notes, activities, tasks, documents)
  update notes set entity_id = p_winner_id
    where entity_type = 'contact' and entity_id = p_loser_id;

  update activities set entity_id = p_winner_id
    where entity_type = 'contact' and entity_id = p_loser_id;

  update tasks set entity_id = p_winner_id
    where entity_type = 'contact' and entity_id = p_loser_id;

  update documents set entity_id = p_winner_id
    where entity_type = 'contact' and entity_id = p_loser_id;

  -- 10. Log de la fusion dans activities
  insert into activities (organization_id, entity_type, entity_id, action, metadata)
  values (
    p_org_id, 'contact', p_winner_id, 'merged',
    jsonb_build_object(
      'merged_contact_id', p_loser_id,
      'merged_contact_name', v_loser.first_name || ' ' || v_loser.last_name
    )
  );

  -- 11. Supprimer le loser
  delete from contacts where id = p_loser_id;

  return p_winner_id;
end;
$$;


ALTER FUNCTION "public"."merge_contacts"("p_org_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid", "p_field_overrides" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_invoice_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_invoice_id uuid;
  v_total_paid integer;
  v_total_ttc integer;
  v_new_status invoice_status;
  v_current_status invoice_status;
begin
  v_invoice_id := coalesce(NEW.invoice_id, OLD.invoice_id);

  -- Recalculer le montant total paye
  select coalesce(sum(amount), 0) into v_total_paid
  from payments where invoice_id = v_invoice_id;

  -- Charger la facture
  select total_ttc, status into v_total_ttc, v_current_status
  from invoices where id = v_invoice_id;

  -- Determiner le nouveau statut si la facture est en cours de paiement
  if v_current_status in ('sent', 'partial', 'overdue') then
    if v_total_paid >= v_total_ttc then
      v_new_status := 'paid';
    elsif v_total_paid > 0 then
      v_new_status := 'partial';
    else
      v_new_status := v_current_status;
    end if;

    update invoices
    set paid_amount = v_total_paid,
        status = v_new_status,
        paid_at = case when v_new_status = 'paid' then now() else paid_at end,
        updated_at = now()
    where id = v_invoice_id;
  else
    -- Juste mettre a jour le montant sans changer le statut
    update invoices
    set paid_amount = v_total_paid, updated_at = now()
    where id = v_invoice_id;
  end if;

  return coalesce(NEW, OLD);
end;
$$;


ALTER FUNCTION "public"."recalculate_invoice_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_invoice_id uuid;
begin
  if tg_op = 'DELETE' then
    v_invoice_id := old.invoice_id;
  else
    v_invoice_id := new.invoice_id;
  end if;

  update invoices set
    total_ht = coalesce((select sum(line_total_ht) from invoice_lines where invoice_id = v_invoice_id), 0),
    total_tax = coalesce((select sum(line_total_tax) from invoice_lines where invoice_id = v_invoice_id), 0),
    total_ttc = coalesce((select sum(line_total_ttc) from invoice_lines where invoice_id = v_invoice_id), 0),
    updated_at = now()
  where id = v_invoice_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."recalculate_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_quote_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_quote_id uuid;
begin
  -- Determiner le quote_id selon l'operation
  if tg_op = 'DELETE' then
    v_quote_id := old.quote_id;
  else
    v_quote_id := new.quote_id;
  end if;

  update quotes set
    total_ht = coalesce((select sum(line_total_ht) from quote_lines where quote_id = v_quote_id), 0),
    total_tax = coalesce((select sum(line_total_tax) from quote_lines where quote_id = v_quote_id), 0),
    total_ttc = coalesce((select sum(line_total_ttc) from quote_lines where quote_id = v_quote_id), 0),
    updated_at = now()
  where id = v_quote_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."recalculate_quote_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_api_key"("p_key_hash" "text") RETURNS TABLE("organization_id" "uuid", "robot_user_id" "uuid", "id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select organization_id, robot_user_id, id
  from public.api_keys
  where key_hash = p_key_hash and revoked_at is null;
$$;


ALTER FUNCTION "public"."resolve_api_key"("p_key_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_soft_deleted"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  v_org_id uuid;
begin
  -- Allowlist : seules les tables soft-deletable sont autorisees
  if p_table not in ('contacts', 'companies', 'deals', 'products', 'quotes', 'invoices', 'notes') then
    raise exception 'Table non autorisee pour restore : %', p_table;
  end if;

  -- Restauration : admin uniquement
  if get_user_role() != 'admin' then
    raise exception 'Permission refusee : admin requis pour restaurer';
  end if;

  -- Forcer l''organisation de l''utilisateur courant (ignorer p_org_id)
  v_org_id := get_user_org_id();

  execute format(
    'UPDATE %I SET deleted_at = null, updated_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NOT NULL',
    p_table
  ) using p_id, v_org_id;
end;
$_$;


ALTER FUNCTION "public"."restore_soft_deleted"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  v_org_id uuid;
begin
  -- Allowlist : seules les tables soft-deletable sont autorisees
  if p_table not in ('contacts', 'companies', 'deals', 'products', 'quotes', 'invoices', 'notes') then
    raise exception 'Table non autorisee pour soft delete : %', p_table;
  end if;

  -- Verifier le role (viewer ne peut pas supprimer)
  if get_user_role() not in ('admin', 'member') then
    raise exception 'Permission refusee : role insuffisant pour soft delete';
  end if;

  -- Forcer l''organisation de l''utilisateur courant (ignorer p_org_id)
  v_org_id := get_user_org_id();

  execute format(
    'UPDATE %I SET deleted_at = now(), updated_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
    p_table
  ) using p_id, v_org_id;
end;
$_$;


ALTER FUNCTION "public"."soft_delete"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  update public.api_keys
  set last_used_at = now()
  where key_hash = p_key_hash and revoked_at is null;
$$;


ALTER FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "robot_user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text",
    "industry" "text",
    "size" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'FR'::"text",
    "phone" "text",
    "website" "text",
    "siren" "text",
    "siret" "text",
    "vat_number" "text",
    "legal_form" "text",
    "capital" integer,
    "naf_code" "text",
    "status" "public"."entity_status" DEFAULT 'active'::"public"."entity_status" NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_companies_capital" CHECK ((("capital" IS NULL) OR ("capital" >= 0))),
    CONSTRAINT "chk_companies_naf" CHECK ((("naf_code" IS NULL) OR ("naf_code" ~ '^\d{4}[A-Z]$'::"text"))),
    CONSTRAINT "chk_companies_siren" CHECK ((("siren" IS NULL) OR ("siren" ~ '^\d{9}$'::"text"))),
    CONSTRAINT "chk_companies_siret" CHECK ((("siret" IS NULL) OR ("siret" ~ '^\d{14}$'::"text"))),
    CONSTRAINT "chk_companies_siret_siren" CHECK ((("siret" IS NULL) OR ("siren" IS NULL) OR ("left"("siret", 9) = "siren"))),
    CONSTRAINT "chk_companies_vat" CHECK ((("vat_number" IS NULL) OR ("vat_number" ~ '^FR\d{11}$'::"text"))),
    CONSTRAINT "chk_companies_vat_siren" CHECK ((("vat_number" IS NULL) OR ("siren" IS NULL) OR ("right"("vat_number", 9) = "siren")))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_tags" (
    "company_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."company_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connected_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "public"."email_provider" NOT NULL,
    "email_address" "text" NOT NULL,
    "display_name" "text",
    "credentials_encrypted" "text" NOT NULL,
    "status" "public"."email_account_status" DEFAULT 'connected'::"public"."email_account_status" NOT NULL,
    "last_sync_at" timestamp with time zone,
    "sync_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."connected_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "value" "text" NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_contact_channels_value" CHECK ((("char_length"(TRIM(BOTH FROM "value")) > 0) AND ("char_length"("value") <= 200))),
    CONSTRAINT "contact_channels_label_check" CHECK (("label" = ANY (ARRAY['work'::"text", 'personal'::"text", 'mobile'::"text", 'other'::"text"]))),
    CONSTRAINT "contact_channels_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'phone'::"text"])))
);


ALTER TABLE "public"."contact_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "role" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contact_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_tags" (
    "contact_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."contact_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "job_title" "text",
    "status" "public"."entity_status" DEFAULT 'active'::"public"."entity_status" NOT NULL,
    "avatar_url" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "content_piece_id" "uuid",
    "deliverable_id" "uuid",
    "document_id" "uuid",
    "external_url" "text",
    "role" "public"."asset_role" NOT NULL,
    "version_label" "text",
    "is_final" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_asset_parent" CHECK ((("content_piece_id" IS NOT NULL) OR ("deliverable_id" IS NOT NULL))),
    CONSTRAINT "chk_asset_source" CHECK ((("document_id" IS NOT NULL) OR ("external_url" IS NOT NULL)))
);


ALTER TABLE "public"."content_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "content_piece_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_done" boolean DEFAULT false NOT NULL,
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_ideas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "angle" "text",
    "promise" "text",
    "hook" "text",
    "notes" "text",
    "target" "text",
    "planned_format" "public"."content_format",
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "desired_publish_date" "date",
    "owner_id" "uuid",
    "status" "public"."entity_status" DEFAULT 'active'::"public"."entity_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."content_ideas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_pieces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "idea_id" "uuid",
    "title" "text" NOT NULL,
    "format" "public"."content_format" NOT NULL,
    "status" "public"."content_status" DEFAULT 'idea'::"public"."content_status" NOT NULL,
    "summary" "text",
    "target_audience" "text",
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "owner_id" "uuid",
    "position" integer DEFAULT 0 NOT NULL,
    "scheduled_date" "date",
    "published_at" timestamp with time zone,
    "published_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_blocked" boolean DEFAULT false NOT NULL,
    "blocked_reason" "text",
    "blocked_at" timestamp with time zone,
    "validated_at" timestamp with time zone,
    "validated_by" "uuid"
);


ALTER TABLE "public"."content_pieces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_scripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "content_piece_id" "uuid" NOT NULL,
    "hook" "text",
    "intro" "text",
    "structure" "text",
    "key_points" "text",
    "cta" "text",
    "shooting_notes" "text",
    "short_version" "text",
    "long_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_scripts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "format" "public"."content_format" NOT NULL,
    "target_audience" "text",
    "default_priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "script_skeleton" "jsonb",
    "checklist_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "deliverable_specs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."content_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."deal_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_tags" (
    "deal_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."deal_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "stage" "text" DEFAULT 'new'::"text" NOT NULL,
    "deal_status" "public"."deal_status" DEFAULT 'open'::"public"."deal_status" NOT NULL,
    "amount" integer,
    "probability" integer,
    "weighted_amount" integer GENERATED ALWAYS AS (
CASE
    WHEN (("amount" IS NOT NULL) AND ("probability" IS NOT NULL)) THEN (("amount" * "probability") / 100)
    ELSE NULL::integer
END) STORED,
    "expected_close_date" "date",
    "closed_at" timestamp with time zone,
    "lost_reason" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "assigned_to" "uuid",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "deals_probability_check" CHECK ((("probability" >= 0) AND ("probability" <= 100)))
);


ALTER TABLE "public"."deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliverables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "content_piece_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "format" "public"."content_format" NOT NULL,
    "status" "public"."deliverable_status" DEFAULT 'planned'::"public"."deliverable_status" NOT NULL,
    "owner_id" "uuid",
    "position" integer DEFAULT 0 NOT NULL,
    "scheduled_date" "date",
    "published_at" timestamp with time zone,
    "published_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "channel" "public"."publication_channel"
);


ALTER TABLE "public"."deliverables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" integer NOT NULL,
    "entity_type" "public"."entity_type",
    "entity_id" "uuid",
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_document_entity" CHECK (((("entity_type" IS NULL) AND ("entity_id" IS NULL)) OR (("entity_type" IS NOT NULL) AND ("entity_id" IS NOT NULL)))),
    CONSTRAINT "chk_document_size" CHECK (("size_bytes" > 0))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connected_account_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "sync_mode" "text" DEFAULT 'inbound_only'::"text" NOT NULL,
    "sync_cursor" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_channels_sync_mode_check" CHECK (("sync_mode" = ANY (ARRAY['full'::"text", 'inbound_only'::"text"])))
);


ALTER TABLE "public"."email_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_id" "uuid" NOT NULL,
    "role" "public"."email_participant_role" NOT NULL,
    "email_address" "text" NOT NULL,
    "display_name" "text",
    "contact_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "thread_id" "text",
    "message_id" "text" NOT NULL,
    "in_reply_to" "text",
    "subject" "text",
    "body_text" "text",
    "body_html" "text",
    "snippet" "text",
    "direction" "public"."email_direction" NOT NULL,
    "received_at" timestamp with time zone NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "folder" "text" DEFAULT 'inbox'::"text" NOT NULL,
    "has_attachments" boolean DEFAULT false NOT NULL,
    "headers" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'unite'::"text",
    "unit_price" integer NOT NULL,
    "vat_rate" integer DEFAULT 2000 NOT NULL,
    "discount_percent" integer DEFAULT 0 NOT NULL,
    "line_total_ht" integer DEFAULT 0 NOT NULL,
    "line_total_tax" integer DEFAULT 0 NOT NULL,
    "line_total_ttc" integer DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_sequences" (
    "organization_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."invoice_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reference" "text",
    "company_id" "uuid",
    "contact_id" "uuid",
    "deal_id" "uuid",
    "source_quote_id" "uuid",
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status" NOT NULL,
    "subject" "text" NOT NULL,
    "notes" "text",
    "total_ht" integer DEFAULT 0 NOT NULL,
    "total_tax" integer DEFAULT 0 NOT NULL,
    "total_ttc" integer DEFAULT 0 NOT NULL,
    "paid_amount" integer DEFAULT 0 NOT NULL,
    "paid_at" timestamp with time zone,
    "due_date" "date",
    "issued_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "is_credit_note" boolean DEFAULT false NOT NULL,
    "credit_note_for" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_invoice_credit_note" CHECK (((("is_credit_note" = false) AND ("credit_note_for" IS NULL)) OR (("is_credit_note" = true) AND ("credit_note_for" IS NOT NULL)))),
    CONSTRAINT "chk_invoice_paid_amount" CHECK (("paid_amount" >= 0)),
    CONSTRAINT "chk_invoice_recipient" CHECK ((("company_id" IS NOT NULL) OR ("contact_id" IS NOT NULL)))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."member_role" DEFAULT 'member'::"public"."member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "status" "public"."entity_status" DEFAULT 'active'::"public"."entity_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_method" "text" DEFAULT 'virement'::"text" NOT NULL,
    "reference" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_payment_amount" CHECK (("amount" > 0)),
    CONSTRAINT "chk_payment_method" CHECK (("payment_method" = ANY (ARRAY['virement'::"text", 'cheque'::"text", 'carte'::"text", 'prelevement'::"text", 'especes'::"text", 'autre'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "reference" "text",
    "unit_price" integer NOT NULL,
    "unit" "text" DEFAULT 'unite'::"text",
    "vat_rate" integer DEFAULT 2000 NOT NULL,
    "status" "public"."entity_status" DEFAULT 'active'::"public"."entity_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'unite'::"text",
    "unit_price" integer NOT NULL,
    "vat_rate" integer DEFAULT 2000 NOT NULL,
    "discount_percent" integer DEFAULT 0 NOT NULL,
    "line_total_ht" integer DEFAULT 0 NOT NULL,
    "line_total_tax" integer DEFAULT 0 NOT NULL,
    "line_total_ttc" integer DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "current_number" integer DEFAULT 0 NOT NULL,
    "year" integer DEFAULT (EXTRACT(year FROM "now"()))::integer NOT NULL
);


ALTER TABLE "public"."quote_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reference" "text",
    "deal_id" "uuid",
    "company_id" "uuid",
    "contact_id" "uuid",
    "status" "public"."quote_status" DEFAULT 'draft'::"public"."quote_status" NOT NULL,
    "subject" "text" NOT NULL,
    "notes" "text",
    "total_ht" integer DEFAULT 0 NOT NULL,
    "total_tax" integer DEFAULT 0 NOT NULL,
    "total_ttc" integer DEFAULT 0 NOT NULL,
    "validity_days" integer DEFAULT 30 NOT NULL,
    "issued_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "refused_at" timestamp with time zone,
    "refused_reason" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "parent_quote_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_quote_recipient" CHECK ((("company_id" IS NOT NULL) OR ("contact_id" IS NOT NULL)))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."task_status" DEFAULT 'todo'::"public"."task_status" NOT NULL,
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "task_type" "text",
    "due_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "entity_type" "public"."entity_type",
    "entity_id" "uuid",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_task_completed" CHECK (((("status" = 'done'::"public"."task_status") AND ("completed_at" IS NOT NULL)) OR ("status" <> 'done'::"public"."task_status"))),
    CONSTRAINT "chk_task_entity" CHECK (((("entity_type" IS NULL) AND ("entity_id" IS NULL)) OR (("entity_type" IS NOT NULL) AND ("entity_id" IS NOT NULL))))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_config" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "chk_invoice_reference_unique" UNIQUE ("organization_id", "reference");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_tags"
    ADD CONSTRAINT "company_tags_pkey" PRIMARY KEY ("company_id", "tag_id");



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_organization_id_email_address_key" UNIQUE ("organization_id", "email_address");



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_channels"
    ADD CONSTRAINT "contact_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_companies"
    ADD CONSTRAINT "contact_companies_contact_id_company_id_key" UNIQUE ("contact_id", "company_id");



ALTER TABLE ONLY "public"."contact_companies"
    ADD CONSTRAINT "contact_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contact_id", "tag_id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_assets"
    ADD CONSTRAINT "content_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_checklist_items"
    ADD CONSTRAINT "content_checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_ideas"
    ADD CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_pieces"
    ADD CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_scripts"
    ADD CONSTRAINT "content_scripts_content_piece_id_key" UNIQUE ("content_piece_id");



ALTER TABLE ONLY "public"."content_scripts"
    ADD CONSTRAINT "content_scripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deal_contacts"
    ADD CONSTRAINT "deal_contacts_deal_id_contact_id_key" UNIQUE ("deal_id", "contact_id");



ALTER TABLE ONLY "public"."deal_contacts"
    ADD CONSTRAINT "deal_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deal_tags"
    ADD CONSTRAINT "deal_tags_pkey" PRIMARY KEY ("deal_id", "tag_id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deliverables"
    ADD CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_channels"
    ADD CONSTRAINT "email_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_participants"
    ADD CONSTRAINT "email_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_organization_id_message_id_key" UNIQUE ("organization_id", "message_id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("organization_id", "year");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_lines"
    ADD CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_sequences"
    ADD CONSTRAINT "quote_sequences_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."quote_sequences"
    ADD CONSTRAINT "quote_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_organization_id_name_entity_type_key" UNIQUE ("organization_id", "name", "entity_type");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_config"
    ADD CONSTRAINT "tenant_config_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."tenant_config"
    ADD CONSTRAINT "tenant_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "uq_document_storage_path" UNIQUE ("storage_path");



CREATE INDEX "idx_activities_created" ON "public"."activities" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_activities_entity" ON "public"."activities" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_activities_org" ON "public"."activities" USING "btree" ("organization_id");



CREATE INDEX "idx_api_keys_org_active" ON "public"."api_keys" USING "btree" ("organization_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_companies_active" ON "public"."companies" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_companies_domain" ON "public"."companies" USING "btree" ("organization_id", "domain") WHERE ("domain" IS NOT NULL);



CREATE INDEX "idx_companies_name" ON "public"."companies" USING "btree" ("organization_id", "name");



CREATE INDEX "idx_companies_org" ON "public"."companies" USING "btree" ("organization_id");



CREATE INDEX "idx_companies_siren" ON "public"."companies" USING "btree" ("organization_id", "siren") WHERE ("siren" IS NOT NULL);



CREATE INDEX "idx_companies_siret" ON "public"."companies" USING "btree" ("organization_id", "siret") WHERE ("siret" IS NOT NULL);



CREATE INDEX "idx_companies_status" ON "public"."companies" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_companies_vat" ON "public"."companies" USING "btree" ("organization_id", "vat_number") WHERE ("vat_number" IS NOT NULL);



CREATE INDEX "idx_connected_accounts_org" ON "public"."connected_accounts" USING "btree" ("organization_id");



CREATE INDEX "idx_connected_accounts_status" ON "public"."connected_accounts" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_connected_accounts_user" ON "public"."connected_accounts" USING "btree" ("user_id");



CREATE INDEX "idx_contact_channels_contact" ON "public"."contact_channels" USING "btree" ("contact_id");



CREATE INDEX "idx_contact_channels_email" ON "public"."contact_channels" USING "btree" ("organization_id", "value") WHERE ("type" = 'email'::"text");



CREATE INDEX "idx_contact_channels_org" ON "public"."contact_channels" USING "btree" ("organization_id");



CREATE INDEX "idx_contact_companies_company" ON "public"."contact_companies" USING "btree" ("company_id");



CREATE INDEX "idx_contact_companies_contact" ON "public"."contact_companies" USING "btree" ("contact_id");



CREATE INDEX "idx_contacts_active" ON "public"."contacts" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("organization_id", "email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_contacts_name" ON "public"."contacts" USING "btree" ("organization_id", "last_name", "first_name");



CREATE INDEX "idx_contacts_org" ON "public"."contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_contacts_status" ON "public"."contacts" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_content_assets_deliverable" ON "public"."content_assets" USING "btree" ("deliverable_id") WHERE ("deliverable_id" IS NOT NULL);



CREATE INDEX "idx_content_assets_document" ON "public"."content_assets" USING "btree" ("document_id") WHERE ("document_id" IS NOT NULL);



CREATE INDEX "idx_content_assets_org" ON "public"."content_assets" USING "btree" ("organization_id");



CREATE INDEX "idx_content_assets_piece" ON "public"."content_assets" USING "btree" ("content_piece_id") WHERE ("content_piece_id" IS NOT NULL);



CREATE INDEX "idx_content_checklist_org" ON "public"."content_checklist_items" USING "btree" ("organization_id");



CREATE INDEX "idx_content_checklist_piece" ON "public"."content_checklist_items" USING "btree" ("content_piece_id");



CREATE INDEX "idx_content_ideas_active" ON "public"."content_ideas" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_ideas_org" ON "public"."content_ideas" USING "btree" ("organization_id");



CREATE INDEX "idx_content_ideas_owner" ON "public"."content_ideas" USING "btree" ("owner_id") WHERE ("owner_id" IS NOT NULL);



CREATE INDEX "idx_content_pieces_active" ON "public"."content_pieces" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_pieces_idea" ON "public"."content_pieces" USING "btree" ("idea_id") WHERE ("idea_id" IS NOT NULL);



CREATE INDEX "idx_content_pieces_org" ON "public"."content_pieces" USING "btree" ("organization_id");



CREATE INDEX "idx_content_pieces_owner" ON "public"."content_pieces" USING "btree" ("owner_id") WHERE ("owner_id" IS NOT NULL);



CREATE INDEX "idx_content_pieces_scheduled" ON "public"."content_pieces" USING "btree" ("organization_id", "scheduled_date") WHERE ("scheduled_date" IS NOT NULL);



CREATE INDEX "idx_content_pieces_status" ON "public"."content_pieces" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_content_scripts_org" ON "public"."content_scripts" USING "btree" ("organization_id");



CREATE INDEX "idx_content_templates_active" ON "public"."content_templates" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_templates_org" ON "public"."content_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_deal_contacts_contact" ON "public"."deal_contacts" USING "btree" ("contact_id");



CREATE INDEX "idx_deal_contacts_deal" ON "public"."deal_contacts" USING "btree" ("deal_id");



CREATE INDEX "idx_deals_active" ON "public"."deals" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_deals_assigned" ON "public"."deals" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_deals_close_date" ON "public"."deals" USING "btree" ("organization_id", "expected_close_date") WHERE ("expected_close_date" IS NOT NULL);



CREATE INDEX "idx_deals_company" ON "public"."deals" USING "btree" ("company_id");



CREATE INDEX "idx_deals_org" ON "public"."deals" USING "btree" ("organization_id");



CREATE INDEX "idx_deals_stage" ON "public"."deals" USING "btree" ("organization_id", "stage");



CREATE INDEX "idx_deals_status" ON "public"."deals" USING "btree" ("organization_id", "deal_status");



CREATE INDEX "idx_deliverables_active" ON "public"."deliverables" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_deliverables_org" ON "public"."deliverables" USING "btree" ("organization_id");



CREATE INDEX "idx_deliverables_piece" ON "public"."deliverables" USING "btree" ("content_piece_id");



CREATE INDEX "idx_deliverables_status" ON "public"."deliverables" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_documents_created" ON "public"."documents" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_documents_entity" ON "public"."documents" USING "btree" ("entity_type", "entity_id") WHERE ("entity_type" IS NOT NULL);



CREATE INDEX "idx_documents_name" ON "public"."documents" USING "btree" ("organization_id", "name");



CREATE INDEX "idx_documents_org" ON "public"."documents" USING "btree" ("organization_id");



CREATE INDEX "idx_documents_uploaded_by" ON "public"."documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_email_channels_account" ON "public"."email_channels" USING "btree" ("connected_account_id");



CREATE INDEX "idx_email_channels_active" ON "public"."email_channels" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_email_channels_org" ON "public"."email_channels" USING "btree" ("organization_id");



CREATE INDEX "idx_email_participants_address" ON "public"."email_participants" USING "btree" ("email_address");



CREATE INDEX "idx_email_participants_contact" ON "public"."email_participants" USING "btree" ("contact_id") WHERE ("contact_id" IS NOT NULL);



CREATE INDEX "idx_email_participants_email" ON "public"."email_participants" USING "btree" ("email_id");



CREATE INDEX "idx_emails_channel" ON "public"."emails" USING "btree" ("channel_id");



CREATE INDEX "idx_emails_direction" ON "public"."emails" USING "btree" ("organization_id", "direction");



CREATE INDEX "idx_emails_folder" ON "public"."emails" USING "btree" ("organization_id", "folder");



CREATE INDEX "idx_emails_org" ON "public"."emails" USING "btree" ("organization_id");



CREATE INDEX "idx_emails_received" ON "public"."emails" USING "btree" ("organization_id", "received_at" DESC);



CREATE INDEX "idx_emails_thread" ON "public"."emails" USING "btree" ("organization_id", "thread_id") WHERE ("thread_id" IS NOT NULL);



CREATE INDEX "idx_invoice_lines_invoice" ON "public"."invoice_lines" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_lines_product" ON "public"."invoice_lines" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_invoices_active" ON "public"."invoices" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_invoices_company" ON "public"."invoices" USING "btree" ("company_id");



CREATE INDEX "idx_invoices_created" ON "public"."invoices" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_invoices_deal" ON "public"."invoices" USING "btree" ("deal_id") WHERE ("deal_id" IS NOT NULL);



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("organization_id", "due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_invoices_org" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_reference" ON "public"."invoices" USING "btree" ("organization_id", "reference") WHERE ("reference" IS NOT NULL);



CREATE INDEX "idx_invoices_source_quote" ON "public"."invoices" USING "btree" ("source_quote_id") WHERE ("source_quote_id" IS NOT NULL);



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_notes_active" ON "public"."notes" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notes_author" ON "public"."notes" USING "btree" ("author_id");



CREATE INDEX "idx_notes_entity" ON "public"."notes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notes_org" ON "public"."notes" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_payments_date" ON "public"."payments" USING "btree" ("organization_id", "payment_date" DESC);



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_org" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_products_org" ON "public"."products" USING "btree" ("organization_id");



CREATE INDEX "idx_products_reference" ON "public"."products" USING "btree" ("organization_id", "reference") WHERE ("reference" IS NOT NULL);



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_quote_lines_product" ON "public"."quote_lines" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_quote_lines_quote" ON "public"."quote_lines" USING "btree" ("quote_id");



CREATE INDEX "idx_quotes_active" ON "public"."quotes" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_quotes_company" ON "public"."quotes" USING "btree" ("company_id");



CREATE INDEX "idx_quotes_deal" ON "public"."quotes" USING "btree" ("deal_id") WHERE ("deal_id" IS NOT NULL);



CREATE INDEX "idx_quotes_org" ON "public"."quotes" USING "btree" ("organization_id");



CREATE INDEX "idx_quotes_reference" ON "public"."quotes" USING "btree" ("organization_id", "reference") WHERE ("reference" IS NOT NULL);



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_tags_entity_type" ON "public"."tags" USING "btree" ("organization_id", "entity_type");



CREATE INDEX "idx_tags_org" ON "public"."tags" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_assigned" ON "public"."tasks" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_tasks_created" ON "public"."tasks" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("organization_id", "due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_tasks_entity" ON "public"."tasks" USING "btree" ("entity_type", "entity_id") WHERE ("entity_type" IS NOT NULL);



CREATE INDEX "idx_tasks_org" ON "public"."tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("organization_id", "priority");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("organization_id", "status");



CREATE OR REPLACE TRIGGER "trg_companies_updated" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_connected_accounts_updated" BEFORE UPDATE ON "public"."connected_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contacts_updated" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_assets_updated" BEFORE UPDATE ON "public"."content_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_checklist_updated" BEFORE UPDATE ON "public"."content_checklist_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_ideas_updated" BEFORE UPDATE ON "public"."content_ideas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_pieces_updated" BEFORE UPDATE ON "public"."content_pieces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_scripts_updated" BEFORE UPDATE ON "public"."content_scripts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_content_templates_updated" BEFORE UPDATE ON "public"."content_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_deals_updated" BEFORE UPDATE ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_deliverables_updated" BEFORE UPDATE ON "public"."deliverables" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_documents_updated" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_email_channels_updated" BEFORE UPDATE ON "public"."email_channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoice_lines_calc" BEFORE INSERT OR UPDATE ON "public"."invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_line_totals"();



CREATE OR REPLACE TRIGGER "trg_invoice_lines_updated" BEFORE UPDATE ON "public"."invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoice_totals_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_invoice_totals"();



CREATE OR REPLACE TRIGGER "trg_invoices_updated" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notes_updated" BEFORE UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_org_members_updated" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_organizations_updated" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quote_lines_calc" BEFORE INSERT OR UPDATE ON "public"."quote_lines" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_quote_line_totals"();



CREATE OR REPLACE TRIGGER "trg_quote_lines_updated" BEFORE UPDATE ON "public"."quote_lines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quote_totals_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."quote_lines" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_quote_totals"();



CREATE OR REPLACE TRIGGER "trg_quotes_updated" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_recalculate_invoice_paid" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_invoice_paid"();



CREATE OR REPLACE TRIGGER "trg_tasks_updated" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tenant_config_updated" BEFORE UPDATE ON "public"."tenant_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_robot_user_id_fkey" FOREIGN KEY ("robot_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_tags"
    ADD CONSTRAINT "company_tags_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_tags"
    ADD CONSTRAINT "company_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_channels"
    ADD CONSTRAINT "contact_channels_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_channels"
    ADD CONSTRAINT "contact_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_companies"
    ADD CONSTRAINT "contact_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_companies"
    ADD CONSTRAINT "contact_companies_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_assets"
    ADD CONSTRAINT "content_assets_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_assets"
    ADD CONSTRAINT "content_assets_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_assets"
    ADD CONSTRAINT "content_assets_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_assets"
    ADD CONSTRAINT "content_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_checklist_items"
    ADD CONSTRAINT "content_checklist_items_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_checklist_items"
    ADD CONSTRAINT "content_checklist_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ideas"
    ADD CONSTRAINT "content_ideas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ideas"
    ADD CONSTRAINT "content_ideas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."content_pieces"
    ADD CONSTRAINT "content_pieces_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."content_ideas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_pieces"
    ADD CONSTRAINT "content_pieces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_pieces"
    ADD CONSTRAINT "content_pieces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."content_pieces"
    ADD CONSTRAINT "content_pieces_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."content_scripts"
    ADD CONSTRAINT "content_scripts_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_scripts"
    ADD CONSTRAINT "content_scripts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_contacts"
    ADD CONSTRAINT "deal_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_contacts"
    ADD CONSTRAINT "deal_contacts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_tags"
    ADD CONSTRAINT "deal_tags_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_tags"
    ADD CONSTRAINT "deal_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliverables"
    ADD CONSTRAINT "deliverables_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliverables"
    ADD CONSTRAINT "deliverables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliverables"
    ADD CONSTRAINT "deliverables_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_channels"
    ADD CONSTRAINT "email_channels_connected_account_id_fkey" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_channels"
    ADD CONSTRAINT "email_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_participants"
    ADD CONSTRAINT "email_participants_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_participants"
    ADD CONSTRAINT "email_participants_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."email_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_credit_note_for_fkey" FOREIGN KEY ("credit_note_for") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_lines"
    ADD CONSTRAINT "quote_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_lines"
    ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_sequences"
    ADD CONSTRAINT "quote_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_parent_quote_id_fkey" FOREIGN KEY ("parent_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_config"
    ADD CONSTRAINT "tenant_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activities_insert" ON "public"."activities" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "activities_select" ON "public"."activities" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_keys_insert" ON "public"."api_keys" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "api_keys_select" ON "public"."api_keys" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "api_keys_update" ON "public"."api_keys" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_delete" ON "public"."companies" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "companies_insert" ON "public"."companies" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "companies_select" ON "public"."companies" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "companies_select_deleted" ON "public"."companies" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "companies_update" ON "public"."companies" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."company_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_tags_delete" ON "public"."company_tags" FOR DELETE USING ((("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "company_tags_insert" ON "public"."company_tags" FOR INSERT WITH CHECK ((("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "company_tags_select" ON "public"."company_tags" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."connected_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "connected_accounts_delete" ON "public"."connected_accounts" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "connected_accounts"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."member_role")))))));



CREATE POLICY "connected_accounts_insert" ON "public"."connected_accounts" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("user_id" = "auth"."uid"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "connected_accounts_select" ON "public"."connected_accounts" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "connected_accounts_update" ON "public"."connected_accounts" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "connected_accounts"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."member_role")))))));



ALTER TABLE "public"."contact_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_channels_delete" ON "public"."contact_channels" FOR DELETE USING ((("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_channels_insert" ON "public"."contact_channels" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_channels_select" ON "public"."contact_channels" FOR SELECT USING (("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."contact_companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_companies_delete" ON "public"."contact_companies" FOR DELETE USING ((("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_companies_insert" ON "public"."contact_companies" FOR INSERT WITH CHECK ((("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_companies_select" ON "public"."contact_companies" FOR SELECT USING (("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."contact_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_tags_delete" ON "public"."contact_tags" FOR DELETE USING ((("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_tags_insert" ON "public"."contact_tags" FOR INSERT WITH CHECK ((("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contact_tags_select" ON "public"."contact_tags" FOR SELECT USING (("contact_id" IN ( SELECT "contacts"."id"
   FROM "public"."contacts"
  WHERE ("contacts"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_delete" ON "public"."contacts" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "contacts_insert" ON "public"."contacts" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "contacts_select" ON "public"."contacts" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "contacts_select_deleted" ON "public"."contacts" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "contacts_update" ON "public"."contacts" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_assets_delete" ON "public"."content_assets" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_assets_insert" ON "public"."content_assets" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_assets_select" ON "public"."content_assets" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "content_assets_update" ON "public"."content_assets" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_checklist_delete" ON "public"."content_checklist_items" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_checklist_insert" ON "public"."content_checklist_items" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_checklist_select" ON "public"."content_checklist_items" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "content_checklist_update" ON "public"."content_checklist_items" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_ideas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_ideas_delete" ON "public"."content_ideas" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "content_ideas_insert" ON "public"."content_ideas" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_ideas_select" ON "public"."content_ideas" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "content_ideas_select_deleted" ON "public"."content_ideas" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "content_ideas_update" ON "public"."content_ideas" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_pieces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_pieces_delete" ON "public"."content_pieces" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "content_pieces_insert" ON "public"."content_pieces" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_pieces_select" ON "public"."content_pieces" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "content_pieces_select_deleted" ON "public"."content_pieces" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "content_pieces_update" ON "public"."content_pieces" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_scripts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_scripts_delete" ON "public"."content_scripts" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_scripts_insert" ON "public"."content_scripts" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_scripts_select" ON "public"."content_scripts" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "content_scripts_update" ON "public"."content_scripts" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."content_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_templates_delete" ON "public"."content_templates" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "content_templates_insert" ON "public"."content_templates" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "content_templates_select" ON "public"."content_templates" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "content_templates_select_deleted" ON "public"."content_templates" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "content_templates_soft_delete" ON "public"."content_templates" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "content_templates_update_data" ON "public"."content_templates" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



ALTER TABLE "public"."deal_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deal_contacts_delete" ON "public"."deal_contacts" FOR DELETE USING ((("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deal_contacts_insert" ON "public"."deal_contacts" FOR INSERT WITH CHECK ((("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deal_contacts_select" ON "public"."deal_contacts" FOR SELECT USING (("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."deal_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deal_tags_delete" ON "public"."deal_tags" FOR DELETE USING ((("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deal_tags_insert" ON "public"."deal_tags" FOR INSERT WITH CHECK ((("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deal_tags_select" ON "public"."deal_tags" FOR SELECT USING (("deal_id" IN ( SELECT "deals"."id"
   FROM "public"."deals"
  WHERE ("deals"."organization_id" = "public"."get_user_org_id"()))));



ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deals_delete" ON "public"."deals" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "deals_insert" ON "public"."deals" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deals_select" ON "public"."deals" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "deals_select_deleted" ON "public"."deals" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "deals_update" ON "public"."deals" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."deliverables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deliverables_delete" ON "public"."deliverables" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "deliverables_insert" ON "public"."deliverables" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "deliverables_select" ON "public"."deliverables" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "deliverables_select_deleted" ON "public"."deliverables" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "deliverables_update" ON "public"."deliverables" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete" ON "public"."documents" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND (("uploaded_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "documents"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."member_role")))))));



CREATE POLICY "documents_insert" ON "public"."documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "documents_select" ON "public"."documents" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "documents_update" ON "public"."documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."email_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_channels_delete" ON "public"."email_channels" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "email_channels_insert" ON "public"."email_channels" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "email_channels_select" ON "public"."email_channels" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "email_channels_update" ON "public"."email_channels" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."email_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_participants_insert" ON "public"."email_participants" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_participants"."email_id") AND ("emails"."organization_id" = "public"."get_user_org_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "email_participants_select" ON "public"."email_participants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."emails"
  WHERE (("emails"."id" = "email_participants"."email_id") AND ("emails"."organization_id" = "public"."get_user_org_id"())))));



ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "emails_insert" ON "public"."emails" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "emails_select" ON "public"."emails" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



ALTER TABLE "public"."invoice_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_lines_delete" ON "public"."invoice_lines" FOR DELETE USING ((("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "invoice_lines_insert" ON "public"."invoice_lines" FOR INSERT WITH CHECK ((("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "invoice_lines_select" ON "public"."invoice_lines" FOR SELECT USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."organization_id" = "public"."get_user_org_id"()))));



CREATE POLICY "invoice_lines_update" ON "public"."invoice_lines" FOR UPDATE USING ((("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."invoice_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_sequences_insert" ON "public"."invoice_sequences" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "invoice_sequences_select" ON "public"."invoice_sequences" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "invoice_sequences_update" ON "public"."invoice_sequences" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_delete" ON "public"."invoices" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("status" = 'draft'::"public"."invoice_status") AND ("is_credit_note" = false) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "invoices_insert" ON "public"."invoices" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "invoices_select" ON "public"."invoices" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "invoices_select_deleted" ON "public"."invoices" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "invoices_update" ON "public"."invoices" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_delete" ON "public"."notes" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "notes_insert" ON "public"."notes" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "notes_select" ON "public"."notes" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "notes_select_deleted" ON "public"."notes" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "notes_update" ON "public"."notes" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("author_id" = "auth"."uid"())));



CREATE POLICY "org_members_delete" ON "public"."organization_members" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = 'admin'::"public"."member_role")))));



CREATE POLICY "org_members_insert" ON "public"."organization_members" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = 'admin'::"public"."member_role")))));



CREATE POLICY "org_members_select" ON "public"."organization_members" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "org_members_update" ON "public"."organization_members" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = 'admin'::"public"."member_role")))));



CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_update" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."member_role")))));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete" ON "public"."payments" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "payments_insert" ON "public"."payments" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "payments_update" ON "public"."payments" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete" ON "public"."products" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "products_select_deleted" ON "public"."products" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."quote_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_lines_delete" ON "public"."quote_lines" FOR DELETE USING ((("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "quote_lines_insert" ON "public"."quote_lines" FOR INSERT WITH CHECK ((("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "quote_lines_select" ON "public"."quote_lines" FOR SELECT USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."organization_id" = "public"."get_user_org_id"()))));



CREATE POLICY "quote_lines_update" ON "public"."quote_lines" FOR UPDATE USING ((("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."organization_id" = "public"."get_user_org_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."quote_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_sequences_insert" ON "public"."quote_sequences" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "quote_sequences_select" ON "public"."quote_sequences" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "quote_sequences_update" ON "public"."quote_sequences" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotes_delete" ON "public"."quotes" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text") AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "quotes_insert" ON "public"."quotes" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "quotes_select" ON "public"."quotes" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "quotes_select_deleted" ON "public"."quotes" FOR SELECT USING ((("organization_id" = "public"."get_user_org_id"()) AND ("deleted_at" IS NOT NULL) AND ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "quotes_update" ON "public"."quotes" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_delete" ON "public"."tags" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "tags_insert" ON "public"."tags" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "tags_select" ON "public"."tags" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "tags_update" ON "public"."tags" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_delete" ON "public"."tasks" FOR DELETE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "tasks_select" ON "public"."tasks" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE USING ((("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



ALTER TABLE "public"."tenant_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_config_insert" ON "public"."tenant_config" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."member_role")))));



CREATE POLICY "tenant_config_select" ON "public"."tenant_config" FOR SELECT USING (("organization_id" = "public"."get_user_org_id"()));



CREATE POLICY "tenant_config_update" ON "public"."tenant_config" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."member_role")))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_content_template"("p_template_id" "uuid", "p_title" "text", "p_scheduled_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_content_template"("p_template_id" "uuid", "p_title" "text", "p_scheduled_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_content_template"("p_template_id" "uuid", "p_title" "text", "p_scheduled_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_invoice_line_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_invoice_line_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_invoice_line_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_quote_line_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quote_line_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quote_line_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_invoice_with_credit_note"("p_org_id" "uuid", "p_invoice_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_invoice_with_credit_note"("p_org_id" "uuid", "p_invoice_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_invoice_with_credit_note"("p_org_id" "uuid", "p_invoice_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_quote_to_invoice"("p_org_id" "uuid", "p_user_id" "uuid", "p_quote_id" "uuid", "p_due_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_quote_to_invoice"("p_org_id" "uuid", "p_user_id" "uuid", "p_quote_id" "uuid", "p_due_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_quote_to_invoice"("p_org_id" "uuid", "p_user_id" "uuid", "p_quote_id" "uuid", "p_due_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_quote_with_lines"("p_org_id" "uuid", "p_user_id" "uuid", "p_contact_id" "uuid", "p_subject" "text", "p_validity_days" integer, "p_lines" "jsonb", "p_validate" boolean, "p_company_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_quote_with_lines"("p_org_id" "uuid", "p_user_id" "uuid", "p_contact_id" "uuid", "p_subject" "text", "p_validity_days" integer, "p_lines" "jsonb", "p_validate" boolean, "p_company_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quote_with_lines"("p_org_id" "uuid", "p_user_id" "uuid", "p_contact_id" "uuid", "p_subject" "text", "p_validity_days" integer, "p_lines" "jsonb", "p_validate" boolean, "p_company_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_reference"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_reference"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_reference"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_quote_reference"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_quote_reference"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_quote_reference"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_contacts"("p_org_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid", "p_field_overrides" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_contacts"("p_org_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid", "p_field_overrides" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_contacts"("p_org_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid", "p_field_overrides" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_invoice_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_quote_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_quote_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_quote_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_api_key"("p_key_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_api_key"("p_key_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_api_key"("p_key_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_soft_deleted"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_soft_deleted"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_soft_deleted"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete"("p_table" "text", "p_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."api_keys" TO "authenticated";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_tags" TO "anon";
GRANT ALL ON TABLE "public"."company_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."company_tags" TO "service_role";



GRANT ALL ON TABLE "public"."connected_accounts" TO "anon";
GRANT ALL ON TABLE "public"."connected_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."connected_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."contact_channels" TO "anon";
GRANT ALL ON TABLE "public"."contact_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_channels" TO "service_role";



GRANT ALL ON TABLE "public"."contact_companies" TO "anon";
GRANT ALL ON TABLE "public"."contact_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_companies" TO "service_role";



GRANT ALL ON TABLE "public"."contact_tags" TO "anon";
GRANT ALL ON TABLE "public"."contact_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_tags" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."content_assets" TO "anon";
GRANT ALL ON TABLE "public"."content_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."content_assets" TO "service_role";



GRANT ALL ON TABLE "public"."content_checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."content_checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."content_checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."content_ideas" TO "anon";
GRANT ALL ON TABLE "public"."content_ideas" TO "authenticated";
GRANT ALL ON TABLE "public"."content_ideas" TO "service_role";



GRANT ALL ON TABLE "public"."content_pieces" TO "anon";
GRANT ALL ON TABLE "public"."content_pieces" TO "authenticated";
GRANT ALL ON TABLE "public"."content_pieces" TO "service_role";



GRANT ALL ON TABLE "public"."content_scripts" TO "anon";
GRANT ALL ON TABLE "public"."content_scripts" TO "authenticated";
GRANT ALL ON TABLE "public"."content_scripts" TO "service_role";



GRANT ALL ON TABLE "public"."content_templates" TO "anon";
GRANT ALL ON TABLE "public"."content_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."content_templates" TO "service_role";



GRANT ALL ON TABLE "public"."deal_contacts" TO "anon";
GRANT ALL ON TABLE "public"."deal_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."deal_tags" TO "anon";
GRANT ALL ON TABLE "public"."deal_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_tags" TO "service_role";



GRANT ALL ON TABLE "public"."deals" TO "anon";
GRANT ALL ON TABLE "public"."deals" TO "authenticated";
GRANT ALL ON TABLE "public"."deals" TO "service_role";



GRANT ALL ON TABLE "public"."deliverables" TO "anon";
GRANT ALL ON TABLE "public"."deliverables" TO "authenticated";
GRANT ALL ON TABLE "public"."deliverables" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."email_channels" TO "anon";
GRANT ALL ON TABLE "public"."email_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."email_channels" TO "service_role";



GRANT ALL ON TABLE "public"."email_participants" TO "anon";
GRANT ALL ON TABLE "public"."email_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."email_participants" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_lines" TO "anon";
GRANT ALL ON TABLE "public"."invoice_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_lines" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_sequences" TO "anon";
GRANT ALL ON TABLE "public"."invoice_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."quote_lines" TO "anon";
GRANT ALL ON TABLE "public"."quote_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_lines" TO "service_role";



GRANT ALL ON TABLE "public"."quote_sequences" TO "anon";
GRANT ALL ON TABLE "public"."quote_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_config" TO "anon";
GRANT ALL ON TABLE "public"."tenant_config" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_config" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







