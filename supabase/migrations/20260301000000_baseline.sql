-- ============================================================================
-- Baseline migration — état initial du schéma (ADR-0009).
-- Concatène schema.sql + rls.sql + storage.sql dans l'ordre d'application.
-- À partir d'ici, toute évolution = nouvelle migration incrémentale.
-- ============================================================================

-- ─────────────────────────── schema.sql ───────────────────────────
-- ============================================================================
-- XAIS SuperCRM — Schema principal
-- Source de verite unique. Pas de migrations incrementales en V1.
-- Pour appliquer : npx supabase db reset
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type member_role as enum ('admin', 'member', 'viewer');
create type entity_status as enum ('active', 'archived');
create type entity_type as enum ('contact', 'company', 'deal', 'quote', 'invoice', 'product', 'task');
create type email_provider as enum ('gmail', 'microsoft', 'imap_smtp');
create type email_account_status as enum ('connected', 'disconnected', 'error');
create type email_direction as enum ('inbound', 'outbound');
create type email_participant_role as enum ('from', 'to', 'cc', 'bcc');

-- ----------------------------------------------------------------------------
-- Organizations
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_slug on organizations (slug);

-- ----------------------------------------------------------------------------
-- Organization Members (lien auth.users <-> organizations)
-- ----------------------------------------------------------------------------
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_org_members_org on organization_members (organization_id);
create index idx_org_members_user on organization_members (user_id);

-- ----------------------------------------------------------------------------
-- Tenant Config (singleton JSONB par organisation)
-- Pattern Atomic CRM : configuration dynamique sans migration
-- ----------------------------------------------------------------------------
create table tenant_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Contacts
-- ----------------------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  job_title text,
  status entity_status not null default 'active',
  avatar_url text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_contacts_org on contacts (organization_id);
create index idx_contacts_active on contacts (organization_id) where deleted_at is null;
create index idx_contacts_email on contacts (organization_id, email) where email is not null;
create index idx_contacts_name on contacts (organization_id, last_name, first_name);
create index idx_contacts_status on contacts (organization_id, status);

-- ----------------------------------------------------------------------------
-- Companies
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  size text,
  address text,
  city text,
  postal_code text,
  country text default 'FR',
  phone text,
  website text,
  -- Champs PME FR
  siren text,
  siret text,
  vat_number text,
  legal_form text,
  capital integer,
  naf_code text,
  status entity_status not null default 'active',
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null,
  -- Contraintes formats FR
  constraint chk_companies_siren check (siren is null or siren ~ '^\d{9}$'),
  constraint chk_companies_siret check (siret is null or siret ~ '^\d{14}$'),
  constraint chk_companies_siret_siren check (
    siret is null or siren is null or left(siret, 9) = siren
  ),
  constraint chk_companies_vat check (
    vat_number is null or vat_number ~ '^FR\d{11}$'
  ),
  constraint chk_companies_vat_siren check (
    vat_number is null or siren is null or right(vat_number, 9) = siren
  ),
  constraint chk_companies_naf check (
    naf_code is null or naf_code ~ '^\d{4}[A-Z]$'
  ),
  constraint chk_companies_capital check (
    capital is null or capital >= 0
  )
);

create index idx_companies_org on companies (organization_id);
create index idx_companies_siren on companies (organization_id, siren) where siren is not null;
create index idx_companies_siret on companies (organization_id, siret) where siret is not null;
create index idx_companies_vat on companies (organization_id, vat_number) where vat_number is not null;
create index idx_companies_active on companies (organization_id) where deleted_at is null;
create index idx_companies_name on companies (organization_id, name);
create index idx_companies_domain on companies (organization_id, domain) where domain is not null;
create index idx_companies_status on companies (organization_id, status);

-- ----------------------------------------------------------------------------
-- Contact <-> Company (N:M via table de jointure, FK strictes)
-- ----------------------------------------------------------------------------
create table contact_companies (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  role text, -- ex: 'Directeur', 'Comptable', 'Contact principal'
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contact_id, company_id)
);

create index idx_contact_companies_contact on contact_companies (contact_id);
create index idx_contact_companies_company on contact_companies (company_id);

-- ----------------------------------------------------------------------------
-- Tags
-- ----------------------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  color text not null default '#6B7280', -- gris par defaut
  entity_type entity_type not null, -- a quel type d'entite ce tag s'applique
  created_at timestamptz not null default now(),
  unique (organization_id, name, entity_type)
);

create index idx_tags_org on tags (organization_id);
create index idx_tags_entity_type on tags (organization_id, entity_type);

-- ----------------------------------------------------------------------------
-- Contact Tags (N:M)
-- ----------------------------------------------------------------------------
create table contact_tags (
  contact_id uuid not null references contacts (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (contact_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- Company Tags (N:M)
-- ----------------------------------------------------------------------------
create table company_tags (
  company_id uuid not null references companies (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (company_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- Contact Channels (emails / téléphones supplémentaires)
-- ----------------------------------------------------------------------------
create table contact_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  type text not null check (type in ('email', 'phone')),
  value text not null,
  label text check (label in ('work', 'personal', 'mobile', 'other')),
  created_at timestamptz not null default now(),
  constraint chk_contact_channels_value check (
    char_length(trim(value)) > 0 and char_length(value) <= 200
  )
);

create index idx_contact_channels_contact on contact_channels (contact_id);
create index idx_contact_channels_org on contact_channels (organization_id);
create index idx_contact_channels_email on contact_channels (organization_id, value) where type = 'email';

-- ----------------------------------------------------------------------------
-- Notes (polymorphe via entity_type + entity_id)
-- ----------------------------------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  entity_type entity_type not null,
  entity_id uuid not null,
  content text not null,
  author_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_notes_org on notes (organization_id);
create index idx_notes_entity on notes (entity_type, entity_id);
create index idx_notes_author on notes (author_id);
create index idx_notes_active on notes (organization_id) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Activities (log automatique, polymorphe)
-- ----------------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  entity_type entity_type not null,
  entity_id uuid not null,
  action text not null, -- ex: 'created', 'updated', 'status_changed', 'note_added'
  actor_id uuid references auth.users (id),
  metadata jsonb not null default '{}'::jsonb, -- details du changement
  created_at timestamptz not null default now()
);

create index idx_activities_org on activities (organization_id);
create index idx_activities_entity on activities (entity_type, entity_id);
create index idx_activities_created on activities (organization_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Deals (opportunites)
-- ----------------------------------------------------------------------------

-- Enum pour les etats terminaux des deals
create type deal_status as enum ('open', 'won', 'lost');

create table deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  company_id uuid not null references companies (id) on delete restrict,
  stage text not null default 'new',
  deal_status deal_status not null default 'open',
  amount integer,
  probability integer check (probability >= 0 and probability <= 100),
  weighted_amount integer generated always as (
    case when amount is not null and probability is not null
      then amount * probability / 100
      else null
    end
  ) stored,
  expected_close_date date,
  closed_at timestamptz,
  lost_reason text,
  position integer not null default 0,
  assigned_to uuid references auth.users (id),
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_deals_org on deals (organization_id);
create index idx_deals_stage on deals (organization_id, stage);
create index idx_deals_company on deals (company_id);
create index idx_deals_status on deals (organization_id, deal_status);
create index idx_deals_assigned on deals (assigned_to) where assigned_to is not null;
create index idx_deals_active on deals (organization_id) where deleted_at is null;
create index idx_deals_close_date on deals (organization_id, expected_close_date) where expected_close_date is not null;

-- ----------------------------------------------------------------------------
-- Deal <-> Contact (N:M)
-- ----------------------------------------------------------------------------
create table deal_contacts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique (deal_id, contact_id)
);

create index idx_deal_contacts_deal on deal_contacts (deal_id);
create index idx_deal_contacts_contact on deal_contacts (contact_id);

-- ----------------------------------------------------------------------------
-- Deal Tags (N:M)
-- ----------------------------------------------------------------------------
create table deal_tags (
  deal_id uuid not null references deals (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (deal_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- Enum : statut des devis
-- ----------------------------------------------------------------------------
create type quote_status as enum ('draft','validated','sent','signed','refused','cancelled','invoiced');

-- ----------------------------------------------------------------------------
-- Products (catalogue produits/services)
-- ----------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  reference text,
  unit_price integer not null, -- centimes
  unit text default 'unite',
  vat_rate integer not null default 2000, -- basis points (2000 = 20%)
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_products_org on products (organization_id);
create index idx_products_status on products (organization_id, status);
create index idx_products_reference on products (organization_id, reference) where reference is not null;
create index idx_products_active on products (organization_id) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Quotes (devis)
-- ----------------------------------------------------------------------------
create table quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reference text, -- ex: DEV-2026-0001, genere a la validation
  deal_id uuid references deals (id) on delete set null,
  company_id uuid not null references companies (id) on delete restrict,
  contact_id uuid references contacts (id) on delete set null,
  status quote_status not null default 'draft',
  subject text not null,
  notes text,
  total_ht integer not null default 0, -- centimes, recalcule par trigger
  total_tax integer not null default 0,
  total_ttc integer not null default 0,
  validity_days integer not null default 30,
  issued_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  refused_at timestamptz,
  refused_reason text,
  version integer not null default 1,
  parent_quote_id uuid references quotes (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_quotes_org on quotes (organization_id);
create index idx_quotes_status on quotes (organization_id, status);
create index idx_quotes_company on quotes (company_id);
create index idx_quotes_deal on quotes (deal_id) where deal_id is not null;
create index idx_quotes_active on quotes (organization_id) where deleted_at is null;
create index idx_quotes_reference on quotes (organization_id, reference) where reference is not null;

-- ----------------------------------------------------------------------------
-- Quote Lines (lignes de devis)
-- Totaux calcules par trigger (pas de generated columns avec round())
-- ----------------------------------------------------------------------------
create table quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text default 'unite',
  unit_price integer not null, -- centimes
  vat_rate integer not null default 2000, -- basis points
  discount_percent integer not null default 0, -- basis points (ex: 1000 = 10%)
  line_total_ht integer not null default 0, -- calcule par trigger
  line_total_tax integer not null default 0, -- calcule par trigger
  line_total_ttc integer not null default 0, -- calcule par trigger
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_quote_lines_quote on quote_lines (quote_id);
create index idx_quote_lines_product on quote_lines (product_id) where product_id is not null;

-- Trigger pour calculer les totaux des lignes de devis
create or replace function calculate_quote_line_totals()
returns trigger as $$
begin
  -- Cast en bigint pour eviter l'overflow sur les gros montants
  new.line_total_ht := round(new.unit_price::bigint * new.quantity * (10000 - new.discount_percent) / 10000)::integer;
  -- ::numeric (pas ::bigint) : sinon la division entière tronque AVANT round()
  -- (ex. 333 * 2000 / 10000 = 66 au lieu de 66,6 -> 67). Arrondi TVA au centime.
  new.line_total_tax := round(new.line_total_ht::numeric * new.vat_rate / 10000)::integer;
  new.line_total_ttc := new.line_total_ht + new.line_total_tax;
  return new;
end;
$$ language plpgsql;

create trigger trg_quote_lines_calc
  before insert or update on quote_lines
  for each row execute function calculate_quote_line_totals();

-- ----------------------------------------------------------------------------
-- Quote Sequences (numeros sequentiels par organisation)
-- ----------------------------------------------------------------------------
create table quote_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations (id) on delete cascade,
  current_number integer not null default 0,
  year integer not null default extract(year from now())::integer
);

-- ----------------------------------------------------------------------------
-- Recalcul automatique des totaux du devis quand les lignes changent
-- ----------------------------------------------------------------------------
create or replace function recalculate_quote_totals()
returns trigger as $$
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
$$ language plpgsql;

create trigger trg_quote_totals_recalc
  after insert or update or delete on quote_lines
  for each row execute function recalculate_quote_totals();

-- ----------------------------------------------------------------------------
-- Generation de reference de devis (ex: DEV-2026-0001)
-- ----------------------------------------------------------------------------
create or replace function generate_quote_reference(p_org_id uuid)
returns text as $$
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
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Enum : statut des factures
-- ----------------------------------------------------------------------------
create type invoice_status as enum ('draft','validated','sent','paid','partial','overdue','cancelled');

-- ----------------------------------------------------------------------------
-- Invoices (factures)
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reference text,
  company_id uuid not null references companies (id) on delete restrict,
  contact_id uuid references contacts (id) on delete set null,
  deal_id uuid references deals (id) on delete set null,
  source_quote_id uuid references quotes (id) on delete set null,
  status invoice_status not null default 'draft',
  subject text not null,
  notes text,
  total_ht integer not null default 0,
  total_tax integer not null default 0,
  total_ttc integer not null default 0,
  paid_amount integer not null default 0,
  paid_at timestamptz,
  due_date date,
  issued_at timestamptz,
  sent_at timestamptz,
  is_credit_note boolean not null default false,
  credit_note_for uuid references invoices (id) on delete restrict,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_invoice_reference_unique unique (organization_id, reference),
  constraint chk_invoice_paid_amount check (paid_amount >= 0),
  deleted_at timestamptz default null,
  constraint chk_invoice_credit_note check (
    (is_credit_note = false and credit_note_for is null)
    or (is_credit_note = true and credit_note_for is not null)
  )
);

create index idx_invoices_org on invoices (organization_id);
create index idx_invoices_status on invoices (organization_id, status);
create index idx_invoices_company on invoices (company_id);
create index idx_invoices_deal on invoices (deal_id) where deal_id is not null;
create index idx_invoices_source_quote on invoices (source_quote_id) where source_quote_id is not null;
create index idx_invoices_reference on invoices (organization_id, reference) where reference is not null;
create index idx_invoices_due_date on invoices (organization_id, due_date) where due_date is not null;
create index idx_invoices_created on invoices (organization_id, created_at desc);
create index idx_invoices_active on invoices (organization_id) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Payments (paiements sur factures)
-- Chaque paiement est trace individuellement avec methode, reference, notes
-- Un trigger recalcule automatiquement paid_amount + statut sur invoices
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  invoice_id uuid not null references invoices (id) on delete restrict,
  amount integer not null,
  payment_date date not null,
  payment_method text not null default 'virement',
  reference text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_payment_amount check (amount > 0),
  constraint chk_payment_method check (payment_method in (
    'virement', 'cheque', 'carte', 'prelevement', 'especes', 'autre'
  ))
);

create index idx_payments_org on payments (organization_id);
create index idx_payments_invoice on payments (invoice_id);
create index idx_payments_date on payments (organization_id, payment_date desc);

-- Trigger : recalcul automatique de paid_amount et statut sur invoices
create or replace function recalculate_invoice_paid()
returns trigger as $$
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
$$ language plpgsql security definer;

create trigger trg_recalculate_invoice_paid
  after insert or update or delete on payments
  for each row execute function recalculate_invoice_paid();

-- ----------------------------------------------------------------------------
-- Invoice Lines (lignes de facture)
-- Totaux calcules par trigger (meme pattern que quote_lines)
-- ----------------------------------------------------------------------------
create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text default 'unite',
  unit_price integer not null,
  vat_rate integer not null default 2000,
  discount_percent integer not null default 0,
  line_total_ht integer not null default 0,
  line_total_tax integer not null default 0,
  line_total_ttc integer not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoice_lines_invoice on invoice_lines (invoice_id);
create index idx_invoice_lines_product on invoice_lines (product_id) where product_id is not null;

-- Trigger pour calculer les totaux des lignes de facture
create or replace function calculate_invoice_line_totals()
returns trigger as $$
begin
  -- Cast en bigint pour eviter l'overflow sur les gros montants
  new.line_total_ht := round(new.unit_price::bigint * new.quantity * (10000 - new.discount_percent) / 10000)::integer;
  -- ::numeric (pas ::bigint) : sinon la division entière tronque AVANT round()
  -- (ex. 333 * 2000 / 10000 = 66 au lieu de 66,6 -> 67). Arrondi TVA au centime.
  new.line_total_tax := round(new.line_total_ht::numeric * new.vat_rate / 10000)::integer;
  new.line_total_ttc := new.line_total_ht + new.line_total_tax;
  return new;
end;
$$ language plpgsql;

create trigger trg_invoice_lines_calc
  before insert or update on invoice_lines
  for each row execute function calculate_invoice_line_totals();

-- ----------------------------------------------------------------------------
-- Recalcul automatique des totaux de la facture quand les lignes changent
-- ----------------------------------------------------------------------------
create or replace function recalculate_invoice_totals()
returns trigger as $$
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
$$ language plpgsql;

create trigger trg_invoice_totals_recalc
  after insert or update or delete on invoice_lines
  for each row execute function recalculate_invoice_totals();

-- ----------------------------------------------------------------------------
-- Invoice Sequences (numeros sequentiels par organisation et annee)
-- Obligation legale FR : numeros sans trou
-- ----------------------------------------------------------------------------
create table invoice_sequences (
  organization_id uuid not null references organizations (id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (organization_id, year)
);

-- ----------------------------------------------------------------------------
-- Generation de reference facture (ex: FAC-2026-0001)
-- Atomique, sans trou (obligation legale FR)
-- ----------------------------------------------------------------------------
create or replace function generate_invoice_reference(p_org_id uuid)
returns text as $$
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
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : updated_at automatique
-- ----------------------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers updated_at
create trigger trg_organizations_updated before update on organizations for each row execute function update_updated_at();
create trigger trg_contacts_updated before update on contacts for each row execute function update_updated_at();
create trigger trg_companies_updated before update on companies for each row execute function update_updated_at();
create trigger trg_notes_updated before update on notes for each row execute function update_updated_at();
create trigger trg_tenant_config_updated before update on tenant_config for each row execute function update_updated_at();
create trigger trg_org_members_updated before update on organization_members for each row execute function update_updated_at();
create trigger trg_deals_updated before update on deals for each row execute function update_updated_at();
create trigger trg_products_updated before update on products for each row execute function update_updated_at();
create trigger trg_quotes_updated before update on quotes for each row execute function update_updated_at();
create trigger trg_quote_lines_updated before update on quote_lines for each row execute function update_updated_at();
create trigger trg_invoices_updated before update on invoices for each row execute function update_updated_at();
create trigger trg_invoice_lines_updated before update on invoice_lines for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : recuperer l'organization_id du user connecte
-- Utilisee dans les policies RLS
-- ----------------------------------------------------------------------------
create or replace function get_user_org_id()
returns uuid as $$
  select organization_id
  from organization_members
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : recuperer le role du user connecte dans son org
-- Utilisee dans les policies RLS pour bloquer les viewers en ecriture
-- ----------------------------------------------------------------------------
create or replace function get_user_role()
returns text as $$
  select role::text
  from organization_members
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ----------------------------------------------------------------------------
-- Ajout de 'email' a l'enum entity_type
-- Necessaire pour les liens polymorphes (notes, activities, tags)
-- ----------------------------------------------------------------------------
alter type entity_type add value 'email';

-- ----------------------------------------------------------------------------
-- Connected Accounts (comptes email connectes : Gmail, Microsoft, IMAP)
-- credentials_encrypted : chiffrement applicatif obligatoire (AES-256)
-- ----------------------------------------------------------------------------
create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider email_provider not null,
  email_address text not null,
  display_name text,
  -- Credentials chiffrees : tokens OAuth ou config IMAP/SMTP
  -- JAMAIS en clair — chiffrement applicatif avant insert
  credentials_encrypted text not null,
  status email_account_status not null default 'connected',
  last_sync_at timestamptz,
  sync_error text, -- dernier message d'erreur si status = 'error'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email_address)
);

create index idx_connected_accounts_org on connected_accounts (organization_id);
create index idx_connected_accounts_user on connected_accounts (user_id);
create index idx_connected_accounts_status on connected_accounts (organization_id, status);

-- ----------------------------------------------------------------------------
-- Email Channels (canaux de synchronisation)
-- Denormalisation organization_id pour le RLS sans jointure
-- ----------------------------------------------------------------------------
create table email_channels (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references connected_accounts (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  sync_mode text not null default 'inbound_only' check (sync_mode in ('full', 'inbound_only')),
  sync_cursor text, -- token de pagination pour sync incrementale
  is_active boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_channels_account on email_channels (connected_account_id);
create index idx_email_channels_org on email_channels (organization_id);
create index idx_email_channels_active on email_channels (organization_id) where is_active = true;

-- ----------------------------------------------------------------------------
-- Emails (messages importes)
-- Immutables une fois importes (pas de updated_at)
-- ----------------------------------------------------------------------------
create table emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  channel_id uuid not null references email_channels (id) on delete cascade,
  thread_id text, -- groupement par conversation (Gmail threadId, MS conversationId)
  message_id text not null, -- header Message-ID RFC 5322 (deduplication)
  in_reply_to text, -- header In-Reply-To (threading)
  subject text,
  body_text text, -- version texte brut
  body_html text, -- version HTML
  snippet text, -- apercu court (150 chars max)
  direction email_direction not null,
  received_at timestamptz not null,
  is_read boolean not null default false,
  folder text not null default 'inbox', -- inbox, sent, archive, trash, drafts
  has_attachments boolean not null default false,
  headers jsonb, -- headers bruts pour debug/tracing
  created_at timestamptz not null default now(),
  unique (organization_id, message_id) -- deduplication stricte
);

create index idx_emails_org on emails (organization_id);
create index idx_emails_channel on emails (channel_id);
create index idx_emails_thread on emails (organization_id, thread_id) where thread_id is not null;
create index idx_emails_received on emails (organization_id, received_at desc);
create index idx_emails_folder on emails (organization_id, folder);
create index idx_emails_direction on emails (organization_id, direction);

-- ----------------------------------------------------------------------------
-- Email Participants (expediteurs/destinataires)
-- Pas d'organization_id : RLS via jointure emails
-- ----------------------------------------------------------------------------
create table email_participants (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails (id) on delete cascade,
  role email_participant_role not null,
  email_address text not null,
  display_name text,
  contact_id uuid references contacts (id) on delete set null, -- resolu par matching
  created_at timestamptz not null default now()
);

create index idx_email_participants_email on email_participants (email_id);
create index idx_email_participants_address on email_participants (email_address);
create index idx_email_participants_contact on email_participants (contact_id) where contact_id is not null;

-- Triggers updated_at pour les tables email (pas sur emails ni email_participants — immutables)
create trigger trg_connected_accounts_updated before update on connected_accounts for each row execute function update_updated_at();
create trigger trg_email_channels_updated before update on email_channels for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- Enums pour les taches
-- ----------------------------------------------------------------------------
create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

-- ----------------------------------------------------------------------------
-- Tasks (taches rattachees a toute entite via lien polymorphe)
-- ----------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  task_type text, -- ex: 'call', 'email', 'meeting', 'follow_up'
  due_date timestamptz,
  completed_at timestamptz,
  entity_type entity_type, -- lien polymorphe optionnel
  entity_id uuid,
  assigned_to uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Les deux champs du lien polymorphe doivent etre presents ensemble ou absents ensemble
  constraint chk_task_entity check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null)
  ),
  -- completed_at doit etre renseigne si done, autorise null si cancelled
  constraint chk_task_completed check (
    (status = 'done' and completed_at is not null)
    or (status != 'done')
  )
);

create index idx_tasks_org on tasks (organization_id);
create index idx_tasks_status on tasks (organization_id, status);
create index idx_tasks_priority on tasks (organization_id, priority);
create index idx_tasks_entity on tasks (entity_type, entity_id) where entity_type is not null;
create index idx_tasks_assigned on tasks (assigned_to) where assigned_to is not null;
create index idx_tasks_due_date on tasks (organization_id, due_date) where due_date is not null;
create index idx_tasks_created on tasks (organization_id, created_at desc);

create trigger trg_tasks_updated before update on tasks for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- Documents (GED — fichiers rattaches a toute entite via lien polymorphe)
-- Stockage dans Supabase Storage, metadonnees dans cette table
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  storage_path text not null, -- chemin dans le bucket Supabase Storage
  mime_type text not null,
  size_bytes integer not null,
  entity_type entity_type, -- lien polymorphe optionnel
  entity_id uuid,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Les deux champs du lien polymorphe doivent etre presents ensemble ou absents ensemble
  constraint chk_document_entity check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null)
  ),
  -- Taille de fichier positive
  constraint chk_document_size check (size_bytes > 0),
  -- Chemin de stockage unique (pas de doublons dans le bucket)
  constraint uq_document_storage_path unique (storage_path)
);

create index idx_documents_org on documents (organization_id);
create index idx_documents_entity on documents (entity_type, entity_id) where entity_type is not null;
create index idx_documents_uploaded_by on documents (uploaded_by);
create index idx_documents_created on documents (organization_id, created_at desc);
create index idx_documents_name on documents (organization_id, name);

create trigger trg_documents_updated before update on documents for each row execute function update_updated_at();

-- ============================================================
-- Onboarding : creation auto org + membership au signup
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RPC transactionnelles pour operations multi-tables
-- ============================================================
-- Note : GRANT EXECUTE aux authenticated users a la fin de chaque fonction

-- Conversion devis signe → facture brouillon (atomique)
create or replace function convert_quote_to_invoice(
  p_org_id uuid,
  p_user_id uuid,
  p_quote_id uuid,
  p_due_date date
)
returns uuid
language plpgsql
security definer
as $$
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

grant execute on function convert_quote_to_invoice(uuid, uuid, uuid, date) to authenticated;

-- Creation d'un avoir lors de l'annulation d'une facture validee (atomique)
create or replace function cancel_invoice_with_credit_note(
  p_org_id uuid,
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
as $$
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

grant execute on function cancel_invoice_with_credit_note(uuid, uuid) to authenticated;

-- ============================================================
-- Fusion de 2 contacts : reparente toutes les relations vers le winner, supprime le loser
-- Pattern Atomic CRM adapte a notre schema (10 tables)
-- ============================================================
create or replace function merge_contacts(
  p_org_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_field_overrides jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function merge_contacts(uuid, uuid, uuid, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Soft Delete / Restore — fonctions utilitaires
-- ----------------------------------------------------------------------------

-- Soft delete generique
create or replace function soft_delete(
  p_table text,
  p_id uuid,
  p_org_id uuid
) returns void as $$
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
$$ language plpgsql security definer;

-- Restore (sortir de la corbeille) — admin uniquement
create or replace function restore_soft_deleted(
  p_table text,
  p_id uuid,
  p_org_id uuid
) returns void as $$
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
$$ language plpgsql security definer;

grant execute on function soft_delete(text, uuid, uuid) to authenticated;
grant execute on function restore_soft_deleted(text, uuid, uuid) to authenticated;

-- ─────────────────────────── rls.sql ──────────────────────────────
-- ============================================================================
-- XAIS SuperCRM — Row-Level Security
-- Applique apres schema.sql
-- Regle : chaque table metier filtre par organization_id via get_user_org_id()
-- Regle : mutations (INSERT/UPDATE/DELETE) restreintes aux roles admin et member
--         les viewers ont uniquement acces en lecture (SELECT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organizations : un user ne voit que son/ses organisation(s)
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;

create policy "org_select" on organizations
  for select using (
    id in (select organization_id from organization_members where user_id = auth.uid())
  );

create policy "org_update" on organizations
  for update using (
    id in (select organization_id from organization_members where user_id = auth.uid() and role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Organization Members : visible si meme organisation
-- ----------------------------------------------------------------------------
alter table organization_members enable row level security;

create policy "org_members_select" on organization_members
  for select using (
    organization_id = get_user_org_id()
  );

create policy "org_members_insert" on organization_members
  for insert with check (
    organization_id in (select organization_id from organization_members where user_id = auth.uid() and role = 'admin')
  );

create policy "org_members_update" on organization_members
  for update using (
    organization_id in (select organization_id from organization_members where user_id = auth.uid() and role = 'admin')
  );

create policy "org_members_delete" on organization_members
  for delete using (
    organization_id in (select organization_id from organization_members where user_id = auth.uid() and role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Tenant Config
-- ----------------------------------------------------------------------------
alter table tenant_config enable row level security;

create policy "tenant_config_select" on tenant_config
  for select using (organization_id = get_user_org_id());

create policy "tenant_config_update" on tenant_config
  for update using (
    organization_id in (select organization_id from organization_members where user_id = auth.uid() and role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Contacts
-- ----------------------------------------------------------------------------
alter table contacts enable row level security;

create policy "contacts_select" on contacts
  for select using (organization_id = get_user_org_id() and deleted_at is null);

-- Corbeille : seuls les admins voient les enregistrements soft-deleted
create policy "contacts_select_deleted" on contacts
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "contacts_insert" on contacts
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "contacts_update" on contacts
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- Hard delete uniquement sur les enregistrements deja en corbeille, admin seulement
create policy "contacts_delete" on contacts
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Companies
-- ----------------------------------------------------------------------------
alter table companies enable row level security;

create policy "companies_select" on companies
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "companies_select_deleted" on companies
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "companies_insert" on companies
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "companies_update" on companies
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "companies_delete" on companies
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Contact Companies (jointure — RLS via les FK)
-- On filtre via le contact qui est lui-meme filtre par org
-- ----------------------------------------------------------------------------
alter table contact_companies enable row level security;

create policy "contact_companies_select" on contact_companies
  for select using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
  );

create policy "contact_companies_insert" on contact_companies
  for insert with check (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "contact_companies_delete" on contact_companies
  for delete using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Tags
-- ----------------------------------------------------------------------------
alter table tags enable row level security;

create policy "tags_select" on tags
  for select using (organization_id = get_user_org_id());

create policy "tags_insert" on tags
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "tags_update" on tags
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "tags_delete" on tags
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Contact Tags (jointure — RLS via contact)
-- ----------------------------------------------------------------------------
alter table contact_tags enable row level security;

create policy "contact_tags_select" on contact_tags
  for select using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
  );

create policy "contact_tags_insert" on contact_tags
  for insert with check (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "contact_tags_delete" on contact_tags
  for delete using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Contact Channels (canaux de communication supplémentaires)
-- ----------------------------------------------------------------------------
alter table contact_channels enable row level security;

create policy "contact_channels_select" on contact_channels
  for select using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
  );

create policy "contact_channels_insert" on contact_channels
  for insert with check (
    organization_id = get_user_org_id()
    and contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "contact_channels_delete" on contact_channels
  for delete using (
    contact_id in (select id from contacts where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Company Tags (jointure — RLS via company)
-- ----------------------------------------------------------------------------
alter table company_tags enable row level security;

create policy "company_tags_select" on company_tags
  for select using (
    company_id in (select id from companies where organization_id = get_user_org_id())
  );

create policy "company_tags_insert" on company_tags
  for insert with check (
    company_id in (select id from companies where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "company_tags_delete" on company_tags
  for delete using (
    company_id in (select id from companies where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
alter table notes enable row level security;

create policy "notes_select" on notes
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "notes_select_deleted" on notes
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "notes_insert" on notes
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "notes_update" on notes
  for update using (
    organization_id = get_user_org_id() and author_id = auth.uid()
  );

create policy "notes_delete" on notes
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Activities (lecture seule pour les users, ecriture via service_role ou triggers)
-- ----------------------------------------------------------------------------
alter table activities enable row level security;

create policy "activities_select" on activities
  for select using (organization_id = get_user_org_id());

-- Pas de insert/update/delete via RLS pour les users
-- Les activities sont creees par le backend (service_role) ou des triggers

-- ----------------------------------------------------------------------------
-- Deals
-- ----------------------------------------------------------------------------
alter table deals enable row level security;

create policy "deals_select" on deals
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "deals_select_deleted" on deals
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "deals_insert" on deals
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "deals_update" on deals
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "deals_delete" on deals
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Deal Contacts (jointure — RLS via deal)
-- ----------------------------------------------------------------------------
alter table deal_contacts enable row level security;

create policy "deal_contacts_select" on deal_contacts
  for select using (
    deal_id in (select id from deals where organization_id = get_user_org_id())
  );

create policy "deal_contacts_insert" on deal_contacts
  for insert with check (
    deal_id in (select id from deals where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "deal_contacts_delete" on deal_contacts
  for delete using (
    deal_id in (select id from deals where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Deal Tags (jointure — RLS via deal)
-- ----------------------------------------------------------------------------
alter table deal_tags enable row level security;

create policy "deal_tags_select" on deal_tags
  for select using (
    deal_id in (select id from deals where organization_id = get_user_org_id())
  );

create policy "deal_tags_insert" on deal_tags
  for insert with check (
    deal_id in (select id from deals where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "deal_tags_delete" on deal_tags
  for delete using (
    deal_id in (select id from deals where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
alter table products enable row level security;

create policy "products_select" on products
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "products_select_deleted" on products
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "products_insert" on products
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "products_update" on products
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "products_delete" on products
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Quotes
-- ----------------------------------------------------------------------------
alter table quotes enable row level security;

create policy "quotes_select" on quotes
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "quotes_select_deleted" on quotes
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "quotes_insert" on quotes
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "quotes_update" on quotes
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "quotes_delete" on quotes
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Quote Lines (jointure — RLS via quote)
-- ----------------------------------------------------------------------------
alter table quote_lines enable row level security;

create policy "quote_lines_select" on quote_lines
  for select using (
    quote_id in (select id from quotes where organization_id = get_user_org_id())
  );

create policy "quote_lines_insert" on quote_lines
  for insert with check (
    quote_id in (select id from quotes where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "quote_lines_update" on quote_lines
  for update using (
    quote_id in (select id from quotes where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "quote_lines_delete" on quote_lines
  for delete using (
    quote_id in (select id from quotes where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Quote Sequences
-- ----------------------------------------------------------------------------
alter table quote_sequences enable row level security;

create policy "quote_sequences_select" on quote_sequences
  for select using (organization_id = get_user_org_id());

create policy "quote_sequences_insert" on quote_sequences
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "quote_sequences_update" on quote_sequences
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Invoices (DELETE restreint aux brouillons uniquement — obligation legale FR)
-- ----------------------------------------------------------------------------
alter table invoices enable row level security;

create policy "invoices_select" on invoices
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "invoices_select_deleted" on invoices
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "invoices_insert" on invoices
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "invoices_update" on invoices
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- Factures : hard delete uniquement brouillons (non-avoirs) deja en corbeille, admin seulement
create policy "invoices_delete" on invoices
  for delete using (
    organization_id = get_user_org_id()
    and status = 'draft'
    and is_credit_note = false
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ----------------------------------------------------------------------------
-- Invoice Lines (jointure — RLS via invoice)
-- ----------------------------------------------------------------------------
alter table invoice_lines enable row level security;

create policy "invoice_lines_select" on invoice_lines
  for select using (
    invoice_id in (select id from invoices where organization_id = get_user_org_id())
  );

create policy "invoice_lines_insert" on invoice_lines
  for insert with check (
    invoice_id in (select id from invoices where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "invoice_lines_update" on invoice_lines
  for update using (
    invoice_id in (select id from invoices where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

create policy "invoice_lines_delete" on invoice_lines
  for delete using (
    invoice_id in (select id from invoices where organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Invoice Sequences
-- ----------------------------------------------------------------------------
alter table invoice_sequences enable row level security;

create policy "invoice_sequences_select" on invoice_sequences
  for select using (organization_id = get_user_org_id());

create policy "invoice_sequences_insert" on invoice_sequences
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "invoice_sequences_update" on invoice_sequences
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Payments (paiements sur factures)
-- ----------------------------------------------------------------------------
alter table payments enable row level security;

create policy "payments_select" on payments
  for select using (organization_id = get_user_org_id());

create policy "payments_insert" on payments
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "payments_update" on payments
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "payments_delete" on payments
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Connected Accounts
-- Seul le proprietaire ou un admin peut modifier/supprimer
-- ----------------------------------------------------------------------------
alter table connected_accounts enable row level security;

create policy "connected_accounts_select" on connected_accounts
  for select using (organization_id = get_user_org_id());

create policy "connected_accounts_insert" on connected_accounts
  for insert with check (
    organization_id = get_user_org_id()
    and user_id = auth.uid()
    and get_user_role() in ('admin', 'member')
  );

create policy "connected_accounts_update" on connected_accounts
  for update using (
    organization_id = get_user_org_id()
    and (user_id = auth.uid() or exists (
      select 1 from organization_members
      where user_id = auth.uid() and organization_id = connected_accounts.organization_id and role = 'admin'
    ))
  );

create policy "connected_accounts_delete" on connected_accounts
  for delete using (
    organization_id = get_user_org_id()
    and (user_id = auth.uid() or exists (
      select 1 from organization_members
      where user_id = auth.uid() and organization_id = connected_accounts.organization_id and role = 'admin'
    ))
  );

-- ----------------------------------------------------------------------------
-- Email Channels
-- ----------------------------------------------------------------------------
alter table email_channels enable row level security;

create policy "email_channels_select" on email_channels
  for select using (organization_id = get_user_org_id());

create policy "email_channels_insert" on email_channels
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "email_channels_update" on email_channels
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "email_channels_delete" on email_channels
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Emails (visibles par toute l'organisation, insert uniquement)
-- ----------------------------------------------------------------------------
alter table emails enable row level security;

create policy "emails_select" on emails
  for select using (organization_id = get_user_org_id());

create policy "emails_insert" on emails
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Email Participants (RLS via jointure emails)
-- ----------------------------------------------------------------------------
alter table email_participants enable row level security;

create policy "email_participants_select" on email_participants
  for select using (
    exists (select 1 from emails where emails.id = email_participants.email_id and emails.organization_id = get_user_org_id())
  );

create policy "email_participants_insert" on email_participants
  for insert with check (
    exists (select 1 from emails where emails.id = email_participants.email_id and emails.organization_id = get_user_org_id())
    and get_user_role() in ('admin', 'member')
  );

-- ----------------------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------------------
alter table tasks enable row level security;

create policy "tasks_select" on tasks
  for select using (organization_id = get_user_org_id());

create policy "tasks_insert" on tasks
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "tasks_update" on tasks
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "tasks_delete" on tasks
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ----------------------------------------------------------------------------
-- Documents
-- Suppression restreinte : seul l'uploader ou un admin peut supprimer
-- ----------------------------------------------------------------------------
alter table documents enable row level security;

create policy "documents_select" on documents
  for select using (organization_id = get_user_org_id());

create policy "documents_insert" on documents
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "documents_update" on documents
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "documents_delete" on documents
  for delete using (
    organization_id = get_user_org_id()
    and (uploaded_by = auth.uid() or exists (
      select 1 from organization_members
      where user_id = auth.uid() and organization_id = documents.organization_id and role = 'admin'
    ))
  );

-- ─────────────────────────── storage.sql ──────────────────────────
-- ============================================================================
-- XAIS SuperCRM — Supabase Storage Configuration
-- Bucket et policies pour les documents (GED)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bucket 'documents' — stockage prive, pas d'acces public
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 Mo max
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
-- Idempotent : le schéma `storage` n'est pas réinitialisé par `db reset --linked`,
-- le bucket peut déjà exister sur un environnement distant.
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Policies Storage — acces par organization_id (1er segment du path)
-- Le path suit le format : {org_id}/{entity_type}/{entity_id}/{uuid}-{filename}
-- ----------------------------------------------------------------------------

-- SELECT : les membres de l'org peuvent lire les fichiers
-- drop-if-exists : storage.objects n'est pas réinitialisé par `db reset --linked`.
drop policy if exists "storage_documents_select" on storage.objects;
create policy "storage_documents_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

-- INSERT : les membres de l'org peuvent uploader
drop policy if exists "storage_documents_insert" on storage.objects;
create policy "storage_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

-- DELETE : les membres de l'org peuvent supprimer
-- (la restriction uploader/admin est geree au niveau de la table documents)
drop policy if exists "storage_documents_delete" on storage.objects;
create policy "storage_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

-- ─────────────────────────── grants API roles ─────────────────────────────
-- `supabase db reset` applique cette migration avec un rôle dont les default
-- privileges ne grantent pas anon/authenticated/service_role (≠ psql-as-postgres).
-- On grante donc explicitement les rôles API (RLS protège toujours les lignes ;
-- service_role bypasse la RLS). + ALTER DEFAULT PRIVILEGES pour les objets futurs.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
