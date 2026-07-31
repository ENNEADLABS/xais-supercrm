-- ============================================================================
-- Content Studio — V1.5 (cockpit quotidien de production)
-- Phase 0 — socle de donnees du cockpit
--
-- Migration additive unique : enum canal + table content_templates + colonnes
-- de blocage/validation sur content_pieces + canal sur deliverables + fonction
-- transactionnelle apply_content_template (calquee sur convert_quote_to_invoice).
--
-- Multi-tenant jour 0 : organization_id NOT NULL + RLS grille admin/member/viewer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nouvel enum : canal de publication (ou ca se publie)
--    Axe distinct du format (content_format = ce que c'est). Enum isole, non
--    reference dans le DDL ci-dessous => pas de piege "unsafe use of new enum".
-- ----------------------------------------------------------------------------
create type publication_channel as enum (
  'youtube', 'skool', 'linkedin', 'newsletter', 'instagram',
  'tiktok', 'x_twitter', 'podcast', 'blog', 'other'
);

-- Valeur d'enum entity_type pour journaliser les activites de template (log
-- d'audit). Non referencee dans le DDL ci-dessous (seulement a l'execution par
-- activityService) => pas de piege "unsafe use of new enum value" en transaction.
alter type entity_type add value if not exists 'content_template';

-- ----------------------------------------------------------------------------
-- 2. content_templates — gabarit reutilisable (soft-delete)
--    Les listes (checklist, livrables, script) sont du config embarque (JSONB),
--    pas des entites (cf. pattern config dynamique, pas une relation N:M).
-- ----------------------------------------------------------------------------
create table content_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  format content_format not null,
  target_audience text,
  default_priority task_priority not null default 'medium',
  -- { hook?, intro?, structure?, key_points?, cta?, shooting_notes? } (strings)
  script_skeleton jsonb,
  -- string[] ordonne (libelles)
  checklist_items jsonb not null default '[]',
  -- { title, format, channel?, status?, offset_days? }[]
  deliverable_specs jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_content_templates_org on content_templates (organization_id);
create index idx_content_templates_active on content_templates (organization_id) where deleted_at is null;

create trigger trg_content_templates_updated before update on content_templates
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Extension deliverables : dimension canal (nullable)
--    Reutilise scheduled_date / published_at / published_url / status existants.
-- ----------------------------------------------------------------------------
alter table deliverables add column channel publication_channel;

-- ----------------------------------------------------------------------------
-- 4. Extension content_pieces : blocage manuel + validation
--    validated_by -> auth.users(id) comme TOUT le schema (owner_id, actor_id...).
-- ----------------------------------------------------------------------------
alter table content_pieces add column is_blocked boolean not null default false;
alter table content_pieces add column blocked_reason text;
alter table content_pieces add column blocked_at timestamptz;
alter table content_pieces add column validated_at timestamptz;
alter table content_pieces add column validated_by uuid references auth.users (id);

-- ============================================================================
-- 5. RLS — content_templates (grille admin/member/viewer + soft-delete admin)
-- ============================================================================
alter table content_templates enable row level security;

create policy "content_templates_select" on content_templates
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "content_templates_select_deleted" on content_templates
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "content_templates_insert" on content_templates
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- Update de DONNEES (member|admin) : with check interdit d'ecrire deleted_at
-- (la ligne resultante doit rester active) -> un member ne peut pas soft-delete.
create policy "content_templates_update_data" on content_templates
  for update
  using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'))
  with check (organization_id = get_user_org_id() and deleted_at is null);

-- Soft-delete = update deleted_at, RESERVE admin (le code fait update, jamais .delete()).
-- Pas de WITH CHECK (implicite TRUE) : un admin peut donc ecrire deleted_at. Un
-- member est bloque car son USING n'est satisfait que par update_data, dont le
-- WITH CHECK exige deleted_at is null (Postgres n'evalue le WITH CHECK d'une
-- policy que si son USING passe).
create policy "content_templates_soft_delete" on content_templates
  for update
  using (organization_id = get_user_org_id() and get_user_role() = 'admin');

-- La policy for delete reste admin-only en filet, non utilisee par l'application.
create policy "content_templates_delete" on content_templates
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ============================================================================
-- 6. apply_content_template — application transactionnelle d'un gabarit
--    SECURITY DEFINER : autorite derivee du contexte d'auth (auth.uid() /
--    get_user_org_id() / get_user_role()), JAMAIS de p_org/p_user en argument.
--    Calquee sur convert_quote_to_invoice (multi-insert atomique).
-- ============================================================================
create or replace function apply_content_template(
  p_template_id uuid,
  p_title text,
  p_scheduled_date timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
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

-- ============================================================================
-- 7. Grants (le grant blanket de la baseline ne couvre pas les migrations
--    incrementales — cf. ADR-0009)
-- ============================================================================
grant all on table content_templates to anon, authenticated, service_role;
grant execute on function apply_content_template(uuid, text, timestamptz) to authenticated, service_role;
