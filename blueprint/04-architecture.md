# 04 - Architecture technique

> Document d'architecture pour ENNEAD Studio Creator, SaaS CRM + Content Studio pour createurs et PME francaises.
> Base sur l'analyse de 5 CRM open-source : Atomic CRM, Twenty, Dolibarr, EspoCRM, SuiteCRM-Core.

---

## Principes d'architecture

### 1. Domain-first, not framework-first

Le code metier dicte la structure, pas le framework. Dolibarr a survecu 20+ ans parce que ses regles de gestion (devis -> commande -> facture) sont solides, malgre une architecture datee. Twenty a une architecture brillante mais sans regles metier commerciales. On ecrit d'abord les types metier et les invariants, puis on branche le framework dessus.

### 2. Couches strictes, communication unidirectionnelle

Dolibarr melange SQL, logique metier et affichage dans les memes classes. Le resultat : une god-class `CommonObject` de 11k lignes intouchable. A l'inverse, Atomic CRM separe proprement DB (schemas SQL), logique (edge functions), et UI (composants React). On adopte une separation stricte : UI -> Application -> Domaine -> Infrastructure. Jamais dans l'autre sens.

### 3. Composition over inheritance

Dolibarr et EspoCRM ont des classes de base monolithiques (`CommonObject` 11k LOC, `Record\Service` 1800 LOC). Twenty a un `WorkspaceEntity` god-object de 350 lignes et 40+ colonnes. On interdit les classes de base fourre-tout. On compose des comportements via des interfaces TypeScript : `Auditable`, `SoftDeletable`, `Linkable`, `Taggable`.

### 4. Multi-tenant RLS des le jour 1

Atomic CRM utilise `authenticated using (true)` -- tout utilisateur voit tout. C'est inacceptable pour un SaaS. EspoCRM et Dolibarr sont single-tenant par design. Twenty a le schema-per-tenant (puissant mais complexe a operer). On choisit le RLS row-level avec `tenant_id` sur chaque table, injecte via `auth.jwt()`. Plus simple que schema-per-tenant, suffisant pour des PME de 1-50 utilisateurs.

### 5. Start simple, abstract when proven

Twenty a 60+ metadata modules, un ORM custom, 20+ modules "flat-*" de cache denormalise, et une triple API (GraphQL + REST + MCP). C'est de l'over-engineering massif pour un CRM PME. Atomic CRM fait tourner un CRM complet avec ~15k LOC. On demarre avec des entites definies en code TypeScript + schema SQL declaratif. Les abstractions (champs custom, vues configurables) s'ajoutent quand le besoin est confirme par les utilisateurs.

### 6. La DB comme source de verite et garant de coherence

Atomic CRM met la logique critique dans PostgreSQL : merge contacts transactionnel, auto-populate via triggers, activity log via vues SQL, RLS pour la securite. C'est le bon reflexe. La base de donnees survit aux refactos frontend. On place dans la DB : l'integrite referentielle, les contraintes metier critiques (statuts, montants), l'audit trail, les permissions (RLS). Le code applicatif orchestre, la DB garantit.

### 7. Configuration declarative, pas de code pour le standard

EspoCRM montre la puissance du declaratif : un Lead se convertit en Account + Contact + Opportunity via un mapping JSON, zero code. Les etapes pipeline ont des probabilites declarees en JSON. Les champs sont definis en JSON avec validation, layout, permissions. On adopte ce pattern pour tout ce qui est configurable par tenant : etapes pipeline, categories, mapping de conversion, regles de validation.

### 8. Suppression agressive du code mort

Twenty a des champs `deprecated` jamais nettoyes ("if we are in December 2025 you can remove this" encore present en 2026), des methodes desactivees qui lancent des exceptions, des TODO en production. Dolibarr a `$statut` vs `$status`, `$nom` vs `$name`. On applique une regle zero tolerance : pas de code commente, pas de champs deprecated, pas de TODO en production. Feature flags pour le code en transition.

---

## Separation des couches

### Architecture en 4 couches + integrations

```
+------------------------------------------------------------------+
|                         UI (Next.js App Router)                   |
|  Pages, Layouts, Composants React, shadcn/ui, Tailwind            |
|  Responsabilite : affichage, interactions, validation formulaires  |
+------------------------------------------------------------------+
         |  (hooks, server actions, API calls)
         v
+------------------------------------------------------------------+
|                    APPLICATION (Services / Actions)               |
|  Server Actions, API Routes, Edge Functions                       |
|  Responsabilite : orchestration, auth, validation, transformation |
+------------------------------------------------------------------+
         |  (appels directs, types partages)
         v
+------------------------------------------------------------------+
|                         DOMAINE (Types + Regles)                  |
|  Types TypeScript, schemas Zod, constantes metier, invariants     |
|  Responsabilite : definition du metier, validation, calculs       |
|  ZERO dependance framework                                        |
+------------------------------------------------------------------+
         |  (Supabase client, SQL)
         v
+------------------------------------------------------------------+
|                    INFRASTRUCTURE (Persistance)                    |
|  Supabase (PostgREST, Auth, Storage, Realtime), PL/pgSQL         |
|  Responsabilite : stockage, RLS, triggers, fonctions SQL          |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                    INTEGRATIONS (Externes)                         |
|  Email (Gmail API, Microsoft Graph, IMAP), PDF, IA, Webhooks     |
|  Responsabilite : communication avec les services tiers           |
+------------------------------------------------------------------+
```

### Frontieres

- **UI -> Application** : les composants React appellent des hooks custom ou des server actions. Jamais d'appel direct a Supabase depuis un composant.
- **Application -> Domaine** : les services importent les types et schemas Zod du domaine pour valider. Le domaine ne connait pas les services.
- **Application -> Infrastructure** : les services utilisent le client Supabase ou des fonctions SQL. L'infrastructure ne connait pas la couche application.
- **Integrations** : appelees uniquement depuis la couche Application (edge functions, API routes). Jamais depuis l'UI, jamais depuis le domaine.

### Justification

Atomic CRM a un bon equilibre : la logique critique est dans la DB (triggers, fonctions SQL), l'orchestration dans le data provider, l'UI dans les composants React. On pousse ce modele un cran plus loin en ajoutant une couche domaine explicite (types + Zod) qui est testable independamment.

Twenty a trop de couches (engine -> metadata-modules -> core-modules -> modules -> API -> frontend). Ca ajoute de la complexite sans valeur pour un CRM PME. Dolibarr n'a aucune separation (SQL dans les classes metier, affichage dans les modeles). On vise le juste milieu.

---

## Modules / Domaines

### Bounded contexts et responsabilites

```
NOYAU (toujours actif)
+---------------------------------------------------------------+
| crm/          Contacts, Companies, Tags, Merge, Import/Export |
| pipeline/     Leads, Opportunities, Stages, Forecasts         |
| commercial/   Quotes, Invoices, Payments, Products, PDF       |
| activity/     Tasks, Notes, Meetings, Timeline, Activity Log  |
+---------------------------------------------------------------+

PERIPHERIQUE (activable)
+---------------------------------------------------------------+
| email/         ConnectedAccounts, Channels, Messages, Sync    |
| documents/     Attachments, Storage, Generation PDF           |
| analytics/     Dashboard, KPIs, Forecast, Rapports            |
| settings/      Configuration tenant, Users, Teams, Roles      |
| ai/            Extraction, Enrichissement, Suggestions        |
+---------------------------------------------------------------+

TRANSVERSE (infrastructure partagee)
+---------------------------------------------------------------+
| auth/          Supabase Auth, JWT, Sessions                   |
| permissions/   RLS, RBAC, Scopes (own/team/all)               |
| config/        Singleton JSONB par tenant, Feature flags      |
| search/        Full-text search (tsvector + pg_trgm)          |
| realtime/      Supabase Realtime subscriptions                |
| audit/         Audit trail, Activity log                      |
+---------------------------------------------------------------+
```

### Detail par module noyau

**crm/** -- Gestion des contacts et societes
- Entites : `Company`, `Contact`, `Tag`, `ContactTag` (jointure)
- Inspire d'Atomic CRM (contacts avec multi-email, multi-phone, avatar auto) + Dolibarr (modele Contact/Societe robuste)
- Fonctions cles : merge contacts (Atomic CRM), import/export CSV, deduplication declarative (EspoCRM)

**pipeline/** -- Pipeline commercial
- Entites : `Lead`, `Opportunity`, `OpportunityContact` (jointure avec role)
- Inspire d'EspoCRM (Lead avec conversion declarative, Opportunity avec probability map) + Atomic CRM (Kanban drag & drop)
- Fonctions cles : conversion Lead -> Company + Contact + Opportunity, forecast pondere, etapes configurables par tenant

**commercial/** -- Gestion commerciale
- Entites : `Product`, `Quote`, `QuoteLine`, `Invoice`, `InvoiceLine`, `Payment`
- Inspire de Dolibarr (workflow devis -> facture complet, statuts eprouves, WorkflowManager)
- Fonctions cles : `createInvoiceFromQuote()`, generation PDF, statuts avec transitions, automations configurables

**activity/** -- Activites et suivi
- Entites : `Task`, `Note`, `Meeting`, `EntityLink` (liens generiques)
- Inspire d'Atomic CRM (notes avec status, activity log via vue SQL) + Twenty (Target polymorphe pour taches/notes) + Dolibarr (element_element)
- Fonctions cles : timeline polymorphe, liens generiques entre objets, rappels

### Liens entre modules

```
crm/ <-----> pipeline/      (Lead -> Contact + Company, Opportunity -> Company)
pipeline/ <-> commercial/   (Opportunity -> Quote -> Invoice)
activity/ <-> *             (Task/Note liees a tout objet via EntityLink)
email/ ----> crm/           (matching participants -> Contact)
email/ ----> activity/      (email recu -> Note auto)
documents/ -> commercial/   (PDF devis/factures)
analytics/ -> pipeline/     (forecast, conversion rates)
analytics/ -> commercial/   (CA, encaissements)
```

---

## Strategie backend

### Next.js API Routes vs serveur separe

**Decision : Next.js App Router uniquement, pas de serveur separe.**

Justification : Atomic CRM fonctionne sans serveur backend (SPA + Supabase). Twenty a un serveur NestJS complet, c'est adapte a leur complexite (metadata engine, ORM custom) mais overkill pour notre cas. Next.js App Router offre :
- Server Components pour le SSR (pages publiques de devis partages, portail client)
- Server Actions pour les mutations typees
- API Routes pour les webhooks et integrations
- Edge runtime pour les fonctions legeres

### Supabase : delegation vs code serveur

| Delegue a Supabase | Garde cote serveur (Next.js / Edge Functions) |
|---------------------|-----------------------------------------------|
| Auth (email/password, OAuth Google/Microsoft) | Operations admin (CRUD users via service_role) |
| Storage (documents, attachments) | Webhooks entrants (email inbound, paiements) |
| RLS (isolation multi-tenant) | Logique metier complexe (conversion Lead, createInvoiceFromQuote) |
| Realtime (subscriptions notifications) | Integrations tierces (Gmail API, Microsoft Graph) |
| PostgREST (CRUD simple) | Generation PDF |
| PL/pgSQL (merge contacts, auto-populate) | Envoi d'emails transactionnels |
| Triggers (audit trail, calculs) | Jobs planifies (sync email, relances) |
| Vues SQL (activity log, summaries, forecast) | Extraction IA |

### Server Actions vs API Routes vs Edge Functions

| Pattern | Quand l'utiliser | Exemple |
|---------|-----------------|---------|
| **Server Actions** | Mutations declenchees par l'UI, formulaires | Creer un contact, mettre a jour une opportunity, sauver un devis |
| **API Routes** | Webhooks, integrations entrantes, endpoints publics | Webhook email Postmark, callback OAuth, endpoint signature devis |
| **Edge Functions Supabase** | Operations admin (service_role), jobs cron, logique DB-intensive | Merge contacts, sync email, nettoyage storage, onboarding tenant |
| **PostgREST direct** | Lecture de donnees, CRUD simple | Listes, recherches, filtres, tri, pagination |

### Pattern pour operations complexes

Pour les operations multi-etapes (creation devis multi-lignes, conversion lead, envoi facture), on utilise un **service pattern transactionnel** :

```typescript
// services/commercial/createInvoiceFromQuote.ts
// Inspire du pattern createFromProposal() de Dolibarr

export async function createInvoiceFromQuote(
  supabase: SupabaseClient,
  input: CreateInvoiceFromQuoteInput  // valide par Zod
): Promise<Invoice> {
  // 1. Fetch le devis avec ses lignes
  // 2. Valider les preconditions (statut = signed)
  // 3. Transaction : creer facture + copier lignes + mettre a jour statut devis
  // 4. Creer le lien entity_link (quote -> invoice)
  // 5. Declencher les side effects (notification, log activite)
  // Tout dans un appel RPC Supabase vers une fonction PL/pgSQL
}
```

La logique critique (insertion atomique, calculs de montants) vit dans une fonction PL/pgSQL. Le service TypeScript orchestre, valide les inputs avec Zod, et gere les side effects.

### Strategie de validation

```
Schemas Zod partages (src/types/schemas/)
    |
    +-- Utilises par les Server Actions (validation input)
    +-- Utilises par les formulaires (react-hook-form resolver)
    +-- Utilises par les Edge Functions (validation webhook payloads)
    +-- Generes depuis les types TypeScript (inference bidirectionnelle)
```

Un seul schema Zod par entite, partage entre client et serveur. Les schemas sont la source de verite pour les types TypeScript (via `z.infer<>`). Les contraintes DB (NOT NULL, CHECK, FK) doublent la validation Zod cote infrastructure -- ceinture et bretelles.

---

## Strategie frontend

### State management

**Decision : TanStack Query (donnees serveur) + Zustand (etat UI local).**

Justification :
- Twenty utilise Jotai avec AtomFamily. C'est elegant pour le store de records par ID, mais l'API est complexe (atoms, selectors, families, scoped atoms) et la courbe d'apprentissage est raide. Atomic CRM utilise React Query (via ra-core) avec persistence localStorage pour le mobile offline -- c'est simple et ca marche.
- TanStack Query gere le cache serveur, les mutations optimistes, la deduplication de requetes, l'invalidation, le prefetch. C'est suffisant pour 95% des besoins.
- Zustand pour l'etat purement UI : sidebar ouverte/fermee, filtres temporaires, etat du kanban drag & drop, modale courante.

```
TanStack Query (useQuery / useMutation)
  -> Cache automatique des donnees serveur
  -> Invalidation ciblee apres mutation
  -> Optimistic updates (kanban drag & drop)
  -> Persistence localStorage (PWA offline)

Zustand (useStore)
  -> Etat UI global (sidebar, theme, filtres actifs)
  -> Pas de donnees serveur dans Zustand
```

### Pattern composants

**Décision actuelle : shadcn/ui `base-nova` + Tailwind CSS v4 + Base UI.**

Les premières recherches s'appuyaient sur des exemples Radix. L'implémentation a
finalement retenu `@base-ui/react` (ADR-0003). Les composants shadcn sont copiés dans
le projet (`src/components/ui/`) et restent modifiables sans forker un package.

Organisation :

```
src/components/
  ui/                    # shadcn/ui (Button, Dialog, Select, Table, etc.)
  crm/                   # Composants metier
    contacts/
      ContactList.tsx
      ContactShow.tsx
      ContactForm.tsx
      ContactCard.tsx
      ContactMerge.tsx
      index.ts           # export { ContactList, ContactShow, ... }
    opportunities/
      OpportunityKanban.tsx
      OpportunityCard.tsx
      OpportunityForm.tsx
    quotes/
      QuoteForm.tsx
      QuoteLineEditor.tsx  # editeur de lignes inline
      QuotePDF.tsx
    ...
  shared/                # Composants partages metier
    EntityLink.tsx        # Lien vers n'importe quelle entite
    Timeline.tsx          # Timeline polymorphe
    StatusBadge.tsx       # Badge de statut avec couleur
    AmountDisplay.tsx     # Affichage montant avec devise
    SearchCommand.tsx     # Command palette (cmdk)
```

### Data fetching

```typescript
// Pattern standard : hook custom par entite
// Inspire du dataProvider d'Atomic CRM mais sans ra-core

// hooks/useContacts.ts
export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => supabase
      .from('contacts_summary')  // vue SQL (pattern Atomic CRM)
      .select('*')
      .match(filters)
      .order('last_seen', { ascending: false }),
  })
}

// hooks/useCreateContact.ts
export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactInput) => createContactAction(input), // server action
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  })
}
```

### Formulaires et validation

**react-hook-form + Zod + shadcn/ui form components.**

Valide par Atomic CRM. Le schema Zod est la source de verite, partage avec le backend.

```typescript
// types/schemas/contact.ts
export const contactSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company_id: z.string().uuid().optional(),
  // ...
})
export type ContactInput = z.infer<typeof contactSchema>
```

### Kanban, Timeline, Dashboard

| Pattern | Implementation | Source d'inspiration |
|---------|---------------|---------------------|
| **Kanban** | @hello-pangea/dnd + optimistic updates TanStack Query | Atomic CRM (DealListContent.tsx) |
| **Timeline** | Vue SQL UNION ALL + infinite scroll | Atomic CRM (activity_log view + NotesIterator) |
| **Dashboard** | Composants widgets independants + vues SQL pour les KPIs | Atomic CRM (DashboardStepper) + Twenty (dashboards configurables) |
| **Command Palette** | cmdk (Cmd+K) | Twenty (command-menu) |
| **Record inline edit** | Double-click -> input inline -> blur save | Twenty (record-inline-cell) |
| **Layout Show** | 2 colonnes : timeline a gauche, infos + taches a droite | Atomic CRM (ContactShow + ContactAside) |

---

## Strategie de permissions

### Modele RBAC 3 niveaux

Synthese d'EspoCRM (own/team/all par entite) et Dolibarr (CRUD par module), appliquee via RLS Supabase.

```
Role (admin, manager, sales, viewer)
  |
  +-- Permission par entite (contacts, opportunities, quotes, invoices, ...)
        |
        +-- Action : create / read / update / delete
        |
        +-- Scope : all / team / own / none
```

### Tables de permissions

```sql
-- Table des roles
create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,           -- 'admin', 'manager', 'sales', 'viewer'
  is_system boolean default false, -- roles systeme non supprimables
  created_at timestamptz default now()
);

-- Permissions par entite
create table permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  entity_type text not null,     -- 'contact', 'opportunity', 'quote', 'invoice'
  can_create scope_level default 'none',   -- enum: none, own, team, all
  can_read scope_level default 'none',
  can_update scope_level default 'none',
  can_delete scope_level default 'none',
  unique(role_id, entity_type)
);

-- Assignation user -> role
create table user_roles (
  user_id uuid not null references auth.users(id),
  role_id uuid not null references roles(id),
  tenant_id uuid not null references tenants(id),
  primary key (user_id, role_id)
);

-- Teams (scope team)
create table teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null
);

create table team_members (
  team_id uuid not null references teams(id),
  user_id uuid not null references auth.users(id),
  primary key (team_id, user_id)
);
```

### RLS multi-tenant

Chaque table metier a une colonne `tenant_id` et une colonne `owner_id` (user qui a cree le record). La policy RLS :

```sql
-- Fonction helper reutilisee par toutes les policies
create or replace function is_authorized(
  p_tenant_id uuid,
  p_entity_type text,
  p_action text,        -- 'read', 'create', 'update', 'delete'
  p_owner_id uuid default null,
  p_team_ids uuid[] default null
) returns boolean as $$
  -- 1. Verifier tenant_id = auth.jwt()->>'tenant_id'
  -- 2. Lookup permission du role de l'user pour cette entite + action
  -- 3. Appliquer le scope :
  --    'all'  -> true
  --    'team' -> p_team_ids && user_team_ids
  --    'own'  -> p_owner_id = auth.uid()
  --    'none' -> false
$$ language plpgsql security definer stable;

-- Exemple policy sur contacts
create policy "contacts_select" on contacts
  for select using (
    is_authorized(tenant_id, 'contact', 'read', owner_id, team_ids)
  );
```

### Erreur a eviter

Atomic CRM montre ce qu'il ne faut PAS faire : `authenticated using (true)` -- aucune isolation, aucune restriction. On ne shortcute jamais le RLS, meme en dev. Les policies sont ecrites et testees des le premier sprint.

---

## Strategie documents / emails

### Stockage documents

**Supabase Storage** avec policies par tenant. Inspire d'Atomic CRM (bucket `attachments`) mais enrichi.

```
Structure buckets :
  attachments/
    {tenant_id}/
      contacts/{contact_id}/
      quotes/{quote_id}/
      invoices/{invoice_id}/
      emails/{email_id}/
```

Les documents generes (PDF devis/factures) sont stockes dans le meme bucket avec un flag `is_generated`. La table `attachments` suit le pattern lien polymorphe :

```sql
create table attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  entity_type text not null,   -- 'contact', 'quote', 'invoice', 'email'
  entity_id uuid not null,
  filename text not null,
  storage_path text not null,  -- chemin dans Supabase Storage
  mime_type text,
  size_bytes integer,
  is_generated boolean default false,  -- PDF genere vs upload
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

### Pattern email

**Inspire de Twenty** (ConnectedAccount -> Channel -> Message) mais simplifie.

```
ConnectedAccount          -- compte OAuth (Gmail, Microsoft) ou IMAP
  credentials             -- chiffrees, stockees cote serveur uniquement
  provider                -- 'gmail', 'microsoft', 'imap'
  |
  +-- EmailChannel        -- canal de sync (config)
        sync_status       -- 'active', 'paused', 'error'
        last_sync_at
        |
        +-- Email         -- message importe
              message_id  -- Message-ID header (dedup)
              thread_id   -- pour groupement en conversations
              subject, body_text, body_html
              sent_at, direction ('inbound' / 'outbound')
              |
              +-- EmailParticipant  -- liaison vers Contact
                    email_address
                    role            -- 'from', 'to', 'cc', 'bcc'
                    contact_id      -- FK nullable (null si contact inconnu)
```

### Driver pattern pour providers email

Inspire de Twenty (`modules/messaging/message-import-manager/drivers/`). Chaque provider implemente la meme interface :

```typescript
interface EmailDriver {
  connect(account: ConnectedAccount): Promise<void>
  fetchMessages(since: Date): Promise<RawEmail[]>
  sendMessage(message: OutboundEmail): Promise<void>
  watchForChanges(callback: (emails: RawEmail[]) => void): Promise<void>
}

// Implementations :
// - GmailDriver     (Gmail API + Push notifications)
// - MicrosoftDriver (Microsoft Graph + webhooks)
// - ImapSmtpDriver  (IMAP polling + SMTP envoi)
```

### Extraction intelligente (IA)

L'IA intervient a 3 niveaux, tous dans des Edge Functions asynchrones (jamais dans le chemin critique) :

1. **Email -> Entites** : A la reception d'un email, extraction des informations structurees (nom, societe, telephone, adresse) pour enrichir ou creer un contact. Modele : appel LLM avec le corps de l'email + schema Zod attendu.

2. **Email -> Actions** : Detection d'intentions dans les emails (demande de devis, relance, validation). Suggestion de taches ou creation automatique.

3. **Document -> Donnees** : Upload d'un bon de commande ou document commercial -> extraction des lignes, montants, references pour pre-remplir un devis ou une facture.

### Rattachement automatique emails <-> entites

Inspire du module `match-participant` de Twenty :

1. A l'import d'un email, chaque participant (from, to, cc) est matche par adresse email contre la table `contacts` du tenant.
2. Si match : creation d'un `EmailParticipant` avec `contact_id`.
3. Si pas de match : `contact_id` reste null. Option configurable : creation automatique du contact (pattern Twenty `contact-creation-manager`).
4. L'email est automatiquement visible dans la timeline du contact matche.

---

## Strategie extensibilite

### Configuration dynamique JSONB

**Pattern Atomic CRM** : table singleton `configuration` par tenant.

```sql
create table configurations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
```

Le champ `data` contient :

```jsonb
{
  "pipeline_stages": [
    {"id": "prospecting", "label": "Prospection", "probability": 10, "color": "#3B82F6"},
    {"id": "qualification", "label": "Qualification", "probability": 20, "color": "#8B5CF6"},
    {"id": "proposal", "label": "Proposition", "probability": 50, "color": "#F59E0B"},
    {"id": "negotiation", "label": "Negociation", "probability": 80, "color": "#EF4444"},
    {"id": "closed_won", "label": "Gagne", "probability": 100, "color": "#10B981"},
    {"id": "closed_lost", "label": "Perdu", "probability": 0, "color": "#6B7280"}
  ],
  "quote_statuses": ["draft", "validated", "sent", "signed", "refused", "invoiced"],
  "invoice_statuses": ["draft", "validated", "sent", "paid", "cancelled"],
  "contact_categories": ["client", "prospect", "fournisseur", "partenaire"],
  "company_sectors": ["tech", "industrie", "services", "commerce", "sante"],
  "task_types": ["appel", "email", "reunion", "relance", "administratif"],
  "currency": "EUR",
  "tax_rates": [{"label": "TVA 20%", "rate": 20}, {"label": "TVA 10%", "rate": 10}],
  "quote_validity_days": 30,
  "payment_terms_days": 30,
  "auto_create_contact_from_email": true,
  "auto_invoice_on_quote_signed": false
}
```

Cote frontend, un `ConfigContext` React (pattern Atomic CRM `ConfigurationContext.tsx`) avec fallback sur les valeurs par defaut.

### Champs custom

Inspire d'EspoCRM (metadata JSON) et Dolibarr (extrafields), mais simplifie. Pas de tables `*_extrafields` (Dolibarr) ni de metadata engine lourd (Twenty 60+ modules).

**Solution : colonne JSONB `custom_fields` sur chaque entite + definition par tenant.**

```sql
-- Definition des champs custom par tenant et entite
create table custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  entity_type text not null,
  field_name text not null,
  field_type text not null,   -- 'text', 'number', 'date', 'select', 'boolean', 'url'
  label text not null,
  options jsonb,              -- pour select: ["Option A", "Option B"]
  is_required boolean default false,
  display_order integer default 0,
  unique(tenant_id, entity_type, field_name)
);

-- Chaque entite a une colonne custom_fields jsonb
-- La validation est faite via Zod au runtime, basee sur les definitions
```

### Rester extensible sans metadata engine

On ne reproduit PAS le systeme de metadata de Twenty (objets custom dynamiques avec schema DB genere). Pour un CRM PME, les entites sont fixes (contacts, opportunities, quotes, invoices). Seuls les **champs** sont extensibles via JSONB + Zod. Si le besoin d'objets custom apparait (V2+), on evaluera un systeme metadata leger inspire d'EspoCRM (merge hierarchique core -> custom) plutot que le monstre de Twenty.

---

## Strategie tests

### Lecons des repos

- **Atomic CRM** : Vitest + Playwright + Storybook. Couverture modeste mais les tests ciblent les points critiques (dataProvider, merge contacts). Le dual data provider (FakeRest / Supabase) facilite les tests.
- **Twenty** : 487 tests backend + 771 tests frontend + 239 stories. Couverture correcte pour un projet de cette taille. Les tests e2e Playwright couvrent les parcours critiques.
- **Dolibarr** : Tests insuffisants pour 16k fichiers PHP. La couverture est faible. Resultat : des regressions frequentes.
- **EspoCRM** : Peu de tests visibles. Le systeme metadata-driven aide (configuration declarative = moins de code a tester) mais la logique metier dans `Record\Service` (1800 LOC) est sous-testee.

### Ce qu'il faut tester (par priorite)

1. **Fonctions PL/pgSQL** (merge contacts, createInvoiceFromQuote, is_authorized) : Tests SQL via `pgTAP` ou tests d'integration via Supabase local. Ce sont les operations les plus critiques.

2. **Schemas Zod et logique domaine** : Tests unitaires Vitest. Les schemas de validation, les calculs de montants (HT, TVA, TTC, remises), les transitions de statuts. Zero dependance externe, rapides.

3. **Services d'orchestration** : Tests d'integration avec Supabase local (`supabase start`). Conversion lead, creation facture depuis devis, sync email. Verifier les side effects (entity_links crees, statuts mis a jour, notifications envoyees).

4. **Parcours utilisateur critiques** : Tests e2e Playwright. Creer un devis -> signer -> generer facture. Importer des contacts CSV. Drag & drop pipeline.

5. **Composants interactifs complexes** : Storybook pour le Kanban, l'editeur de lignes de devis, le timeline, le formulaire multi-etapes.

### Ce qu'il ne faut PAS tester

- Les composants shadcn/ui (deja testes par la librairie)
- Le CRUD simple PostgREST (teste par Supabase)
- Les layouts statiques et l'assemblage de composants UI simples
- Les fonctions utilitaires triviales (formatDate, formatAmount -- tests implicites via l'usage)

### Stack de tests

| Type | Outil | Quand |
|------|-------|-------|
| Unit (domaine, schemas) | Vitest | CI, pre-commit |
| Integration (services, DB) | Vitest + Supabase local | CI |
| E2E (parcours) | Playwright | CI, pre-deploy |
| Composants visuels | Storybook | Dev, review |
| SQL (fonctions PL/pgSQL) | pgTAP ou Vitest + supabase client | CI |

---

## Strategie configuration

### Ce qui est configurable vs opine

| Configurable par tenant (JSONB) | Opine (code) |
|---------------------------------|--------------|
| Etapes pipeline + probabilites | Structure des entites (tables, colonnes) |
| Categories contacts/societes | Workflow devis -> facture (statuts fixes) |
| Types de taches | Calcul des montants (HT, TVA, TTC) |
| Taux de TVA | Format des numeros (DEVIS-2026-001) |
| Devise par defaut | Regles RLS |
| Validite devis (jours) | Architecture des permissions (own/team/all) |
| Conditions de paiement | Structure du schema DB |
| Automations (auto-facture apres signature) | Logique de merge contacts |
| Logos, couleurs, nom societe | |
| Champs custom | |

### Pattern singleton JSONB

Un seul row par tenant dans `configurations`. Pas de table key-value (trop de lectures). Le JSONB est valide par un schema Zod a chaque ecriture. Les valeurs par defaut sont definies dans le code TypeScript (`defaultConfiguration.ts`, pattern Atomic CRM) et servent de fallback si une cle manque dans le JSONB.

### Variables d'environnement vs config DB

| Variables d'env (.env) | Config DB (table configurations) |
|------------------------|----------------------------------|
| Cles API (Supabase, Gmail, Stripe) | Configuration metier par tenant |
| URL de services | Preferences utilisateur |
| Feature flags globaux (infra) | Feature flags par tenant |
| Secrets (JWT secret, encryption key) | Etapes pipeline, categories |
| Mode (dev/staging/prod) | Automations activees |

Les variables d'env ne sont JAMAIS en dur dans le code (regle absolue). Le fichier `.env.example` est maintenu a jour. `.env` est dans `.gitignore`.

---

## Recommandations de modularite

### Structure de dossiers

```
/
+-- src/
|   +-- app/                          # Next.js App Router
|   |   +-- (auth)/                   # Routes auth (login, signup, forgot)
|   |   +-- (app)/                    # Routes app (layout avec sidebar)
|   |   |   +-- contacts/
|   |   |   |   +-- page.tsx          # Liste contacts
|   |   |   |   +-- [id]/page.tsx     # Fiche contact
|   |   |   |   +-- new/page.tsx      # Creation contact
|   |   |   +-- opportunities/
|   |   |   +-- quotes/
|   |   |   +-- invoices/
|   |   |   +-- emails/
|   |   |   +-- tasks/
|   |   |   +-- dashboard/
|   |   |   +-- settings/
|   |   +-- api/                      # API Routes (webhooks)
|   |   |   +-- webhooks/
|   |   |   |   +-- email/route.ts
|   |   |   |   +-- stripe/route.ts
|   |   |   +-- public/
|   |   |       +-- quotes/[token]/route.ts  # Devis partage publiquement
|   |   +-- layout.tsx
|   |
|   +-- components/
|   |   +-- ui/                       # shadcn/ui (mutable)
|   |   +-- shared/                   # Composants partages metier
|   |   |   +-- Timeline.tsx
|   |   |   +-- EntityLink.tsx
|   |   |   +-- SearchCommand.tsx
|   |   |   +-- StatusBadge.tsx
|   |   |   +-- AmountDisplay.tsx
|   |   |   +-- DataTable.tsx         # Table generique avec tri/filtre/pagination
|   |   |   +-- KanbanBoard.tsx       # Board generique
|   |   +-- crm/                      # Composants par module
|   |       +-- contacts/
|   |       +-- opportunities/
|   |       +-- quotes/
|   |       +-- invoices/
|   |       +-- emails/
|   |       +-- tasks/
|   |       +-- dashboard/
|   |       +-- settings/
|   |
|   +-- actions/                      # Server Actions (Next.js)
|   |   +-- contacts.ts
|   |   +-- opportunities.ts
|   |   +-- quotes.ts
|   |   +-- invoices.ts
|   |   +-- emails.ts
|   |
|   +-- hooks/                        # Custom hooks
|   |   +-- useContacts.ts
|   |   +-- useOpportunities.ts
|   |   +-- useQuotes.ts
|   |   +-- useConfig.ts
|   |   +-- usePermissions.ts
|   |   +-- useDragAndDrop.ts
|   |
|   +-- lib/                          # Utilitaires purs
|   |   +-- supabase/
|   |   |   +-- client.ts             # Client browser
|   |   |   +-- server.ts             # Client server (cookies)
|   |   |   +-- admin.ts              # Client admin (service_role)
|   |   +-- utils.ts                  # cn(), formatters
|   |   +-- logger.ts                 # Logger structure (pino)
|   |   +-- pdf.ts                    # Generation PDF
|   |
|   +-- types/                        # Types et schemas domaine
|   |   +-- schemas/                  # Schemas Zod (source de verite)
|   |   |   +-- contact.ts
|   |   |   +-- opportunity.ts
|   |   |   +-- quote.ts
|   |   |   +-- invoice.ts
|   |   |   +-- common.ts            # Types partages (Amount, Address, ...)
|   |   +-- index.ts                  # Re-export des types inferes
|   |   +-- database.ts              # Types generes par Supabase CLI
|   |
|   +-- services/                     # Logique metier (orchestration)
|   |   +-- lead-conversion.ts
|   |   +-- quote-to-invoice.ts
|   |   +-- contact-merge.ts
|   |   +-- email-sync.ts
|   |   +-- email-matching.ts
|   |   +-- ai-extraction.ts
|   |
|   +-- providers/                    # Contextes React
|       +-- ConfigProvider.tsx
|       +-- PermissionsProvider.tsx
|       +-- RealtimeProvider.tsx
|
+-- supabase/
|   +-- schemas/                      # Source de verite DB (pattern Atomic CRM)
|   |   +-- 01_types.sql              # Enums, types custom
|   |   +-- 02_tables.sql             # Tables + FK + index + tenant_id
|   |   +-- 03_functions.sql          # PL/pgSQL (merge, conversion, is_authorized)
|   |   +-- 04_views.sql              # Vues (activity_log, summaries, forecast)
|   |   +-- 05_triggers.sql           # Auto-populate, audit trail
|   |   +-- 06_policies.sql           # RLS multi-tenant
|   |   +-- 07_grants.sql             # Grants restrictifs
|   |   +-- 08_storage.sql            # Storage policies
|   |   +-- 09_seed.sql               # Donnees de seed (roles par defaut, config)
|   +-- functions/                    # Edge Functions Deno
|   |   +-- email-webhook/            # Reception emails
|   |   +-- email-sync/               # Sync periodique
|   |   +-- admin-users/              # CRUD users (service_role)
|   |   +-- onboard-tenant/           # Initialisation nouveau tenant
|   |   +-- ai-extract/               # Extraction IA
|   |   +-- _shared/                  # Utils partages (auth, cors, db)
|   +-- migrations/                   # Auto-generees par supabase db diff
|
+-- tests/
|   +-- unit/                         # Vitest (schemas, calculs, utils)
|   +-- integration/                  # Vitest + Supabase local
|   +-- e2e/                          # Playwright
|
+-- .env.example
+-- .env                              # JAMAIS commit
```

### Conventions de nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Tables SQL | snake_case pluriel | `contacts`, `quote_lines`, `entity_links` |
| Colonnes SQL | snake_case | `tenant_id`, `created_at`, `total_amount_ht` |
| Types TypeScript | PascalCase | `Contact`, `QuoteLine`, `PipelineStage` |
| Schemas Zod | camelCase + "Schema" | `contactSchema`, `quoteLineSchema` |
| Composants React | PascalCase | `ContactList`, `OpportunityKanban` |
| Hooks | camelCase "use" | `useContacts`, `useCreateQuote` |
| Server Actions | camelCase | `createContact`, `updateOpportunity` |
| Edge Functions | kebab-case (dossier) | `email-webhook/`, `ai-extract/` |
| Variables d'env | SCREAMING_SNAKE | `SUPABASE_URL`, `GMAIL_CLIENT_ID` |
| Code source | anglais partout | variables, fonctions, commentaires techniques |
| Labels UI | francais via i18n | `next-intl` avec fichiers `messages/fr.json` |

### Gestion des dependances entre modules

1. **Imports unidirectionnels** : `crm/ -> types/`, `actions/ -> services/ -> types/`, `hooks/ -> actions/`. Jamais de cycle.
2. **Module index.ts** : Chaque dossier de module exporte son API publique. Les imports se font depuis l'index, pas depuis les fichiers internes.
3. **Types partages dans types/** : Les types metier sont la couche commune. Tous les modules les importent mais ne les definissent pas.
4. **Pas de barrel exports massifs** : Pas de `src/index.ts` qui reexporte tout. Imports cibles.
5. **Lint ESLint** : Regle `no-restricted-imports` pour empecher les imports cross-module non autorises (ex: un composant UI ne doit pas importer un service).

### Scalabilite a 50+ modules

Le pattern "module par feature" (Atomic CRM, Twenty) scale bien. Chaque entite a son dossier dans `components/crm/`, son hook dans `hooks/`, ses actions dans `actions/`, son schema dans `types/schemas/`. Ajouter un module = ajouter un dossier dans chaque couche, sans toucher aux modules existants.

Si le nombre de modules explose (V3+), on passera a une structure domain-driven avec des dossiers par bounded context (`src/domains/crm/`, `src/domains/commercial/`, `src/domains/email/`) qui contiennent chacun leurs composants, hooks, actions, types. Mais on ne premature-optimise pas : la structure plate suffit jusqu'a 20-30 modules.

---

## Frontieres domaine / orchestration / integrations / UI

```
+------------------+     +--------------------+     +------------------+
|       UI         |     |   ORCHESTRATION    |     |  INTEGRATIONS    |
| (React, Next.js) |     | (Actions, Services)|     | (Email, IA, PDF) |
+--------+---------+     +---------+----------+     +--------+---------+
         |                         |                          |
         |  1. User action         |                          |
         |  (click, submit)        |                          |
         +------------------------>|                          |
         |                         |  2. Validate (Zod)       |
         |                         |  3. Check permissions    |
         |                         |  4. Call DB / integration |
         |                         +------------------------->|
         |                         |                          |
         |                         |  5. Side effects          |
         |                         |  (notifications,         |
         |                         |   activity log,          |
         |                         |   webhooks)              |
         |                         |                          |
         |<------------------------+                          |
         |  6. Invalidate cache    |                          |
         |  7. Re-render           |                          |
         |                         |                          |
+---------v---------+     +--------v-----------+     +--------v---------+
|      DOMAINE      |     |   INFRASTRUCTURE   |     |    SERVICES      |
| (Types, Schemas,  |     | (Supabase, PG,     |     |   EXTERNES       |
|  Invariants,      |     |  RLS, Triggers,    |     | (Gmail API,      |
|  Calculs)         |     |  Fonctions SQL)    |     |  Stripe, LLM)    |
+-------------------+     +--------------------+     +------------------+

Regles de communication :
- UI         -> Orchestration (jamais directement Infrastructure ou Integrations)
- Orchestration -> Domaine (validation, types)
- Orchestration -> Infrastructure (persistance)
- Orchestration -> Integrations (si besoin)
- Infrastructure -> Domaine (schemas SQL coherents avec types TS)
- Domaine     -> RIEN (zero dependance, testable en isolation)
- Integrations -> RIEN d'interne (interface definie, implementation interchangeable)
```

### Flux concret : "Utilisateur signe un devis"

```
1. UI : click "Marquer comme signe" sur QuoteShow
2. UI : appelle signQuoteAction(quoteId) (server action)
3. Orchestration : valide l'input (Zod), verifie les permissions (is_authorized)
4. Orchestration : appelle la fonction PL/pgSQL sign_quote(quoteId)
   - DB : verifie statut = 'sent' (precondition)
   - DB : met a jour statut -> 'signed', signed_at = now()
   - DB : si auto_invoice_on_quote_signed = true (config tenant) :
     - Cree la facture + copie les lignes (createInvoiceFromQuote)
     - Cree l'entity_link (quote -> invoice)
     - Met a jour statut devis -> 'invoiced'
   - DB : trigger audit trail
5. Orchestration : envoie notification email au commercial (integration)
6. Orchestration : retourne le resultat
7. UI : TanStack Query invalide les caches ['quotes'], ['invoices']
8. UI : re-render avec le nouveau statut + toast de confirmation
```

Ce flux montre la separation : l'UI ne connait pas la logique metier. L'orchestration ne sait pas comment la DB est structuree en detail. La DB garantit l'atomicite et la coherence. Les integrations (email) sont des side effects non bloquants.
