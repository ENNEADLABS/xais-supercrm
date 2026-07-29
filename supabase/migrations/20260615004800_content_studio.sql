-- ============================================================================
-- Content Studio — V1 (Noyau + production)
-- Spec : specs/todo/021-content-studio.md
--
-- Approche hybride (ADR collaboration 2026-06-15) :
--   - On etend l'enum partage entity_type pour reutiliser tasks/documents/
--     activities/notes tels quels sur les entites Studio.
--   - Le metier purement editorial vit dans des tables dediees.
--
-- Multi-tenant jour 0 : organization_id NOT NULL + RLS sur chaque table,
-- grille admin/member/viewer identique au reste du CRM.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extension de l'enum partage entity_type
--    Place en tete : ces valeurs ne sont PAS reference dans le DDL de cette
--    migration (uniquement a l'execution par tasks/documents/activities),
--    donc pas de risque "unsafe use of new enum value" en transaction.
-- ----------------------------------------------------------------------------
alter type entity_type add value if not exists 'content_idea';
alter type entity_type add value if not exists 'content_piece';
alter type entity_type add value if not exists 'deliverable';

-- ----------------------------------------------------------------------------
-- 2. Enums propres au Studio
-- ----------------------------------------------------------------------------
create type content_status as enum (
  'idea', 'research', 'script', 'recording', 'editing',
  'review', 'scheduled', 'published', 'archived'
);

create type content_format as enum (
  'youtube_long', 'youtube_short', 'skool_post', 'newsletter', 'linkedin_post',
  'podcast', 'course_lesson', 'blog_article', 'case_study', 'other'
);

create type deliverable_status as enum (
  'planned', 'draft', 'ready', 'scheduled', 'published', 'cancelled'
);

create type asset_role as enum (
  'thumbnail', 'raw_video', 'final_video', 'short_clip', 'audio',
  'transcript', 'script_doc', 'brand_asset', 'reference'
);

-- ----------------------------------------------------------------------------
-- 3. content_ideas — point de depart de la chaine editoriale
-- ----------------------------------------------------------------------------
create table content_ideas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  angle text,
  promise text,
  hook text,
  notes text,
  target text,
  planned_format content_format,
  priority task_priority not null default 'medium',
  desired_publish_date date,
  owner_id uuid references auth.users (id),
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_content_ideas_org on content_ideas (organization_id);
create index idx_content_ideas_active on content_ideas (organization_id) where deleted_at is null;
create index idx_content_ideas_owner on content_ideas (owner_id) where owner_id is not null;

create trigger trg_content_ideas_updated before update on content_ideas
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 4. content_pieces — le contenu principal
-- ----------------------------------------------------------------------------
create table content_pieces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  idea_id uuid references content_ideas (id) on delete set null,
  title text not null,
  format content_format not null,
  status content_status not null default 'idea',
  summary text,
  target_audience text,
  priority task_priority not null default 'medium',
  owner_id uuid references auth.users (id),
  position integer not null default 0,
  scheduled_date date,
  published_at timestamptz,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_content_pieces_org on content_pieces (organization_id);
create index idx_content_pieces_active on content_pieces (organization_id) where deleted_at is null;
create index idx_content_pieces_status on content_pieces (organization_id, status);
create index idx_content_pieces_scheduled on content_pieces (organization_id, scheduled_date) where scheduled_date is not null;
create index idx_content_pieces_idea on content_pieces (idea_id) where idea_id is not null;
create index idx_content_pieces_owner on content_pieces (owner_id) where owner_id is not null;

create trigger trg_content_pieces_updated before update on content_pieces
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 5. content_scripts — un script par contenu
-- ----------------------------------------------------------------------------
create table content_scripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  content_piece_id uuid not null unique references content_pieces (id) on delete cascade,
  hook text,
  intro text,
  structure text,
  key_points text,
  cta text,
  shooting_notes text,
  short_version text,
  long_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_scripts_org on content_scripts (organization_id);

create trigger trg_content_scripts_updated before update on content_scripts
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 6. deliverables — sorties derivees d'un contenu (repurposing)
-- ----------------------------------------------------------------------------
create table deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  content_piece_id uuid not null references content_pieces (id) on delete cascade,
  title text not null,
  format content_format not null,
  status deliverable_status not null default 'planned',
  owner_id uuid references auth.users (id),
  position integer not null default 0,
  scheduled_date date,
  published_at timestamptz,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create index idx_deliverables_org on deliverables (organization_id);
create index idx_deliverables_active on deliverables (organization_id) where deleted_at is null;
create index idx_deliverables_piece on deliverables (content_piece_id);
create index idx_deliverables_status on deliverables (organization_id, status);

create trigger trg_deliverables_updated before update on deliverables
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 7. content_assets — fichier GED OU lien externe, avec role et version
-- ----------------------------------------------------------------------------
create table content_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  content_piece_id uuid references content_pieces (id) on delete cascade,
  deliverable_id uuid references deliverables (id) on delete cascade,
  document_id uuid references documents (id) on delete cascade,
  external_url text,
  role asset_role not null,
  version_label text,
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- L'asset doit etre rattache a un contenu ou un livrable
  constraint chk_asset_parent check (
    content_piece_id is not null or deliverable_id is not null
  ),
  -- L'asset doit avoir une source : fichier GED ou lien externe
  constraint chk_asset_source check (
    document_id is not null or external_url is not null
  )
);

create index idx_content_assets_org on content_assets (organization_id);
create index idx_content_assets_piece on content_assets (content_piece_id) where content_piece_id is not null;
create index idx_content_assets_deliverable on content_assets (deliverable_id) where deliverable_id is not null;
create index idx_content_assets_document on content_assets (document_id) where document_id is not null;

create trigger trg_content_assets_updated before update on content_assets
  for each row execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 8. content_checklist_items — checklist de production par contenu
-- ----------------------------------------------------------------------------
create table content_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  content_piece_id uuid not null references content_pieces (id) on delete cascade,
  label text not null,
  position integer not null default 0,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_checklist_org on content_checklist_items (organization_id);
create index idx_content_checklist_piece on content_checklist_items (content_piece_id);

create trigger trg_content_checklist_updated before update on content_checklist_items
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS — isolation par organization_id + grille admin/member/viewer
-- ============================================================================

-- ---- content_ideas (soft-delete) -------------------------------------------
alter table content_ideas enable row level security;

create policy "content_ideas_select" on content_ideas
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "content_ideas_select_deleted" on content_ideas
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "content_ideas_insert" on content_ideas
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_ideas_update" on content_ideas
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_ideas_delete" on content_ideas
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ---- content_pieces (soft-delete) ------------------------------------------
alter table content_pieces enable row level security;

create policy "content_pieces_select" on content_pieces
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "content_pieces_select_deleted" on content_pieces
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "content_pieces_insert" on content_pieces
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_pieces_update" on content_pieces
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_pieces_delete" on content_pieces
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ---- content_scripts (enfant, pas de soft-delete) --------------------------
alter table content_scripts enable row level security;

create policy "content_scripts_select" on content_scripts
  for select using (organization_id = get_user_org_id());

create policy "content_scripts_insert" on content_scripts
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_scripts_update" on content_scripts
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_scripts_delete" on content_scripts
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ---- deliverables (soft-delete) --------------------------------------------
alter table deliverables enable row level security;

create policy "deliverables_select" on deliverables
  for select using (organization_id = get_user_org_id() and deleted_at is null);

create policy "deliverables_select_deleted" on deliverables
  for select using (
    organization_id = get_user_org_id()
    and deleted_at is not null
    and get_user_role() = 'admin'
  );

create policy "deliverables_insert" on deliverables
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "deliverables_update" on deliverables
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "deliverables_delete" on deliverables
  for delete using (
    organization_id = get_user_org_id()
    and get_user_role() = 'admin'
    and deleted_at is not null
  );

-- ---- content_assets (enfant, pas de soft-delete) ---------------------------
alter table content_assets enable row level security;

create policy "content_assets_select" on content_assets
  for select using (organization_id = get_user_org_id());

create policy "content_assets_insert" on content_assets
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_assets_update" on content_assets
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_assets_delete" on content_assets
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ---- content_checklist_items (enfant, pas de soft-delete) ------------------
alter table content_checklist_items enable row level security;

create policy "content_checklist_select" on content_checklist_items
  for select using (organization_id = get_user_org_id());

create policy "content_checklist_insert" on content_checklist_items
  for insert with check (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_checklist_update" on content_checklist_items
  for update using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

create policy "content_checklist_delete" on content_checklist_items
  for delete using (organization_id = get_user_org_id() and get_user_role() in ('admin', 'member'));

-- ============================================================================
-- Grants explicites (le grant blanket de la baseline ne couvre pas les tables
-- creees par les migrations incrementales — cf. ADR-0009)
-- ============================================================================
grant all on table content_ideas to anon, authenticated, service_role;
grant all on table content_pieces to anon, authenticated, service_role;
grant all on table content_scripts to anon, authenticated, service_role;
grant all on table deliverables to anon, authenticated, service_role;
grant all on table content_assets to anon, authenticated, service_role;
grant all on table content_checklist_items to anon, authenticated, service_role;
