# Executive Architecture Summary -- ENNEAD Studio Creator

> Document de decisions architecturales. Synthese des analyses de 5 repos CRM open-source.
> Cible : SaaS CRM intelligent pour PME francaises.
> Stack : TypeScript, React/Next.js, Supabase/PostgreSQL.

---

## 1. Choix structurants

### Decisions a figer tot

1. **Multi-tenant par RLS avec `tenant_id` sur toutes les tables** -- Pas de schema-per-tenant (Twenty). Le RLS Supabase avec `tenant_id` injecte via `auth.jwt()` est suffisant pour des PME, plus simple a operer, et ne complique pas les migrations. Twenty a prouve que le schema-per-tenant marche mais le cout operationnel est disproportionne pour notre marche cible.

2. **Tables de jointure partout, jamais d'arrays PostgreSQL** -- Atomic CRM utilise `bigint[]` pour les relations N-M (contact_ids, tags). Ca casse l'integrite referentielle et empeche les metadonnees sur la relation. On utilise des tables de jointure avec FK des le jour 1. Pas de dette technique sur les relations.

3. **Schema declaratif Supabase comme source de verite** -- On adopte la convention Atomic CRM (`01_tables` -> `07_storage`). Les migrations sont auto-generees par `supabase db diff`. On ne touche jamais les migrations a la main. C'est le pattern le plus propre observe dans les 5 repos.

4. **Pas de dependance a un meta-framework CRM (ra-core, etc.)** -- Atomic CRM depend de ra-core (~180 concepts) pour le data fetching, routing, auth. C'est une dependance lourde pour un projet qui veut un controle total. On utilise TanStack Query + Next.js App Router + Supabase Auth directement.

5. **Anglais pour tout le code, francais via i18n uniquement** -- Dolibarr melange `llx_societe`, `fk_soc`, `datec`, `fin_validite`. 20 ans de dette technique de nommage. Tout en anglais : tables, colonnes, variables, fonctions. Le francais passe par next-intl.

6. **RBAC 3 niveaux : role -> permissions CRUD par entite -> scope (own/team/all)** -- Synthese du modele EspoCRM (own/team/all) et Dolibarr (CRUD par module). Implemente via RLS policies Supabase + fonction SQL `is_authorized()`. On ne fait PAS du field-level permission en V1 (Twenty le fait, c'est premature pour des PME).

7. **PostgREST + Edge Functions, pas de backend custom** -- On n'ecrit pas de serveur NestJS (Twenty) ni de framework PHP maison (Dolibarr, EspoCRM). Le CRUD passe par PostgREST auto-genere. La logique metier complexe (conversion, merge, workflows) passe par des Edge Functions Deno ou des fonctions PL/pgSQL.

### Decisions a garder flexibles

8. **Choix du driver email (Gmail API vs IMAP vs webhooks)** -- Twenty a prouve que le driver pattern fonctionne (drivers interchangeables pour Gmail, IMAP, Microsoft). On commence avec un seul driver (probablement Gmail API + webhooks), on ajoute les autres en V2. L'interface du driver doit etre definie tot, pas l'implementation de tous les drivers.

9. **Moteur de workflow** -- Dolibarr a un WorkflowManager configurable par constantes. Twenty a un moteur complet avec versions, actions modulaires, triggers. On commence par des automations simples (devis signe -> facture auto) via triggers SQL + Edge Functions. Le moteur visuel peut attendre.

10. **Systeme de vues (filtres, tris, groupes persistes)** -- Twenty a un systeme de vues tres complet (ViewFilterGroup, ViewFieldGroup, etc.). On commence avec des vues simples (type + filtres + tris), on evolue vers les groupes et aggregations quand le besoin se confirme.

11. **Champs personnalises** -- Dolibarr a des tables `*_extrafields`, EspoCRM a des metadata JSON, Twenty a 60+ metadata modules. On commence avec une colonne JSONB `custom_fields` par entite + validation Zod runtime. On n'implemente PAS d'objets custom entiers en V1.

12. **Generation PDF** -- Dolibarr genere des PDF via des classes PHP ou des templates ODT. On commence avec `@react-pdf/renderer` pour des devis/factures simples. On evalue puppeteer ou un service tiers si les besoins de mise en page deviennent complexes.

13. **Offline/PWA** -- Atomic CRM a une PWA offline avec TanStack Query persistence localStorage. C'est un nice-to-have, pas un must pour V1. On garde la porte ouverte en utilisant TanStack Query (qui supporte nativement la persistence).

14. **Recherche avancee** -- On commence avec Supabase full-text search (tsvector + pg_trgm). On evalue un index externe (MeiliSearch, Typesense) si les performances ne suffisent pas a l'echelle.

---

## 2. Blueprint recommande

### Architecture cible a haut niveau

```
                    +------------------+
                    |   Navigateur     |
                    | Next.js App      |
                    | React + shadcn   |
                    | TanStack Query   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+         +---------v---------+
     | Next.js API      |         | Supabase          |
     | Routes (BFF)     |         | PostgREST (CRUD)  |
     | - webhooks in    |         | - auto-generated  |
     | - PDF generation |         | - RLS enforced    |
     | - aggregation    |         +---+------+--------+
     +--------+---------+             |      |
              |                       |      |
              |              +--------v--+ +-v-----------+
              |              | PostgreSQL | | Supabase    |
              |              | + RLS      | | Auth        |
              |              | + triggers | | + JWT       |
              |              | + views    | | + tenant_id |
              |              | + funcs    | +-------------+
              |              +-----+------+
              |                    |
     +--------v--------+   +------v--------+
     | Edge Functions   |   | Supabase      |
     | Deno             |   | Storage       |
     | - email sync     |   | - attachments |
     | - merge contacts |   | - documents   |
     | - admin ops      |   | - logos       |
     | - webhook out    |   +---------------+
     +------------------+
```

### Modules principaux avec responsabilites

| Module | Responsabilite | Dependances |
|--------|---------------|-------------|
| **Core CRM** | Contacts, Societes, Tags, Merge, Import/Export | Auth, Config |
| **Pipeline** | Leads, Opportunities, Kanban, Conversion Lead, Forecast | Core CRM, Config |
| **Commercial** | Devis, Factures, Lignes, Paiements, Workflow devis->facture | Core CRM, Pipeline, Produits |
| **Produits** | Catalogue produits/services, tarifs, TVA | Config |
| **Email** | ConnectedAccounts, Channels, Sync, Matching participants | Core CRM, Auth |
| **Activites** | Taches, Notes, Meetings, Timeline, Activity log | Core CRM |
| **Documents** | Attachments, Generation PDF, Storage | Core CRM, Commercial |
| **Dashboard** | Widgets, Charts, KPIs, Forecast | Pipeline, Commercial, Activites |
| **Settings** | Config tenant, Users, Teams, Roles, Permissions | Auth |
| **Auth** | Login, Signup, OAuth, JWT, Tenant resolution | Supabase Auth |

### Dependances principales

```
Auth <-- Settings <-- Config
  |         |
  v         v
Core CRM <---+
  |    |      |
  v    v      v
Pipeline  Activites  Email
  |
  v
Commercial <-- Produits
  |
  v
Documents <-- Dashboard
```

### Logique de separation des responsabilites

- **PostgreSQL** : Integrite des donnees (FK, contraintes, triggers), RLS multi-tenant, vues agregees, fonctions critiques (merge, conversion), audit trail
- **Edge Functions** : Operations admin (service_role), webhooks entrants, sync email, operations qui contournent RLS
- **Next.js API Routes** : BFF pour le frontend, webhooks entrants, generation PDF, aggregation de donnees
- **Frontend React** : UI, state management, optimistic updates, validation client (Zod), offline cache

---

## 3. Noyau metier recommande

### Objets indispensables (V1)

```
Core CRM :
  Tenant              -- organisation, config, branding
  User                -- auth + profil, lie a Tenant via TeamMember
  Team                -- equipe (scope permissions own/team/all)
  TeamMember           -- user <-> team, avec role
  Company              -- societe cliente (Atomic CRM + Dolibarr)
  Contact              -- personne physique, multi-email/phone via tables de jointure
  ContactEmail         -- table jointure contact <-> email
  ContactPhone         -- table jointure contact <-> phone

Pipeline :
  Lead                 -- prospect pre-qualification (EspoCRM)
  Opportunity          -- deal pipeline, etapes + montant + probabilite (EspoCRM)
  OpportunityContact   -- table jointure opportunity <-> contact (avec role)

Gestion commerciale :
  Product              -- catalogue produits/services (Dolibarr)
  Quote                -- devis (Dolibarr propal)
  QuoteLine            -- ligne de devis
  Invoice              -- facture (Dolibarr facture)
  InvoiceLine          -- ligne de facture
  Payment              -- paiement sur facture

Activites :
  Task                 -- tache avec assignee, due date, lien polymorphe
  Note                 -- note rich text, lien polymorphe
  Meeting              -- reunion/appel avec participants

Transverse :
  Tag                  -- tag avec couleur
  EntityTag            -- table jointure entity <-> tag (polymorphe)
  Attachment           -- piece jointe (Supabase Storage)
  EntityLink           -- liens generiques entre objets (Dolibarr element_element)
  Configuration        -- singleton JSONB par tenant (Atomic CRM)
```

### Workflows indispensables (V1)

1. **Lead -> Opportunity + Contact + Company** : Conversion avec field mapping configurable (EspoCRM)
2. **Quote lifecycle** : Draft -> Validated -> Sent -> Signed/Refused -> Invoiced/Canceled (Dolibarr)
3. **Quote -> Invoice** : Conversion avec copie structuree des lignes (Dolibarr createFromXxx)
4. **Pipeline Opportunity** : Kanban configurable, drag & drop optimiste, probabilite par etape, forecast (Atomic CRM + EspoCRM)
5. **Activity log** : Vue SQL UNION ALL des creations/modifications (Atomic CRM)
6. **Merge contacts** : Fusion transactionnelle SQL avec deduplication (Atomic CRM)
7. **Onboarding tenant** : Creation workspace, seed config, guide interactif

### Ce qui peut attendre (V2+)

- **Email sync multi-boites** (V2) -- complexe, driver pattern a preparer mais pas implementer entierement
- **Commandes** (V2) -- intermediaire devis/facture, pas critique pour PME francaises qui sautent souvent cette etape
- **Workflow engine visuel** (V2) -- automations configurables par les utilisateurs non-devs
- **Champs personnalises par tenant** (V2) -- JSONB + Zod pret, UI de config a construire
- **Calendrier integre** (V2) -- sync Google/Microsoft Calendar
- **Objets custom** (V3) -- permettre aux tenants de creer leurs propres entites
- **Signature electronique integree** (V3) -- integration avec un provider externe
- **Analytics CRM avances** (V2) -- sales velocity, win/loss ratio, temps moyen par etape
- **PWA offline** (V3) -- persistence TanStack Query
- **Automatisations no-code** (V3) -- builder visuel pour les utilisateurs PME

---

## 4. Patterns a reprendre

### Patterns metier

| Pattern | Source | Description | Priorite |
|---------|--------|-------------|----------|
| Workflow devis -> commande -> facture | Dolibarr | Machine a etats configurable avec `WorkflowManager`, transitions automatisees, comparaison des montants HT pour coherence | P0 |
| Lead conversion avec field mapping | EspoCRM | `convertFields` declaratif en JSON, zero code, un Lead produit Account + Contact + Opportunity | P0 |
| Pipeline probability map | EspoCRM | Chaque etape a une probabilite (Prospecting:10%, Proposal:50%, etc.), `amount * probability` = forecast | P0 |
| Merge contacts transactionnel | Atomic CRM | Fusion SQL atomique, deduplication emails/phones par map, reassignation notes/tasks/deals | P1 |
| Configuration CRM dynamique | Atomic CRM | Singleton JSONB, Context React, fallback defaults, modifiable en runtime | P0 |
| Duplicate detection declarative | EspoCRM | `duplicateCheckFieldList` dans le scope de l'entite, detection auto a la creation | P1 |
| createFromXxx (conversion entre objets) | Dolibarr | Copie structuree des lignes, metadonnees, extrafields lors de la conversion devis -> facture | P0 |
| ConnectedAccount -> Channel -> Message | Twenty | Separation compte (credentials) / canal (config sync) / messages. Multi-boites natif | P1 |

### Patterns d'architecture

| Pattern | Source | Description | Priorite |
|---------|--------|-------------|----------|
| Schema declaratif Supabase | Atomic CRM | `01_tables` -> `07_storage`, migrations auto-generees par `supabase db diff` | P0 |
| Auto-populate via triggers SQL | Atomic CRM | Avatar auto (gravatar), logo auto (favicon), sales_id default, last_seen update | P0 |
| Liens generiques entre objets (element_element) | Dolibarr | Table pivot `(source_type, source_id, target_type, target_id)` avec methodes generiques | P0 |
| Driver pattern pour integrations | Twenty | Interface commune, implementations specifiques (Gmail, IMAP, Microsoft). Extensible | P1 |
| Metadata merge hierarchique | EspoCRM | `core -> modules -> custom`, chaque couche peut etendre ou surcharger | P2 |
| Dual data provider | Atomic CRM | FakeRest pour dev/demo, Supabase pour prod, meme interface | P1 |
| Workspace event emitter | Twenty | Events emis dans le contexte d'un workspace specifique | P2 |

### Patterns UI/UX

| Pattern | Source | Description | Priorite |
|---------|--------|-------------|----------|
| Kanban drag & drop optimiste | Atomic CRM | Etat local mis a jour immediatement, persistence asynchrone, @hello-pangea/dnd | P0 |
| Layout Show avec aside | Atomic CRM | 2 colonnes : contenu principal (timeline) a gauche, infos + taches a droite | P0 |
| Command palette Cmd+K | Twenty | Recherche universelle tous objets, standard SaaS moderne | P1 |
| Record inline editing | Twenty | Edition en place dans les tables, reduit les allers-retours formulaires | P1 |
| Notes avec infinite scroll | Atomic CRM | Pagination infinie, creation inline, selection de statut | P0 |
| Responsive desktop/mobile | Atomic CRM | Detection mobile, layout different, resources differentes | P1 |
| Record table/board generiques | Twenty | Un composant unique pour tous les types d'objets, configurable via metadata | P2 |

### Patterns de modularite

| Pattern | Source | Description | Priorite |
|---------|--------|-------------|----------|
| Module par feature | Atomic CRM | Chaque entite = dossier avec `{ list, show, edit, create }` + index.ts | P0 |
| Modules activables/desactivables | Dolibarr | Descripteur declarant permissions, tables, menus, triggers, constantes | P2 |
| Workflow actions extensibles | Twenty | Chaque action = module independant (AI Agent, Code, HTTP, Mail, Record CRUD) | P2 |
| Feature flags par workspace | Twenty | Rollout progressif de features par tenant | P1 |

### Patterns de maintenabilite

| Pattern | Source | Description | Priorite |
|---------|--------|-------------|----------|
| Types centraux TypeScript | Atomic CRM | `types.ts` centralise tous les types metier, stricts, pas de `any` | P0 |
| Lifecycle callbacks | Atomic CRM | Interception des operations CRUD (upload avant save, transform search, redirect views) | P0 |
| Optimistic concurrency control | EspoCRM | `optimisticConcurrencyControl: true`, empech conflits d'edition multi-utilisateur | P1 |
| Field-level audit trail | EspoCRM | `audited: true` par champ, historique des changements granulaire | P2 |

---

## 5. Patterns a bannir

### 1. God-class / BaseEntity monolithique
- **Source** : Dolibarr `CommonObject` (11 884 lignes), Twenty `WorkspaceEntity` (350 lignes, 40+ colonnes), EspoCRM `Record\Service` (1 800 lignes)
- **Pourquoi** : Chaque CRM mature finit avec une entite de base monolithique. Impossible a tester, impossible a composer. Les modifications impactent tout le systeme.
- **Quoi faire** : Composition via interfaces/mixins separes : `Auditable`, `SoftDeletable`, `Linkable`, `Taggable`. Chaque concern dans son propre fichier. Maximum 300 lignes par fichier.

### 2. Relations N-M via arrays PostgreSQL
- **Source** : Atomic CRM (`contact_ids bigint[]`, `tags bigint[]`)
- **Pourquoi** : Pas d'integrite referentielle sur les elements, pas de metadonnees sur la relation, queries non standard (`@>` au lieu de JOIN), impossible d'indexer proprement.
- **Quoi faire** : Tables de jointure avec FK et contraintes. Toujours. Meme si ca fait "plus de tables".

### 3. RLS permissif ou absent
- **Source** : Atomic CRM (`authenticated using (true)`), EspoCRM et Dolibarr (single-tenant, pas de RLS)
- **Pourquoi** : Tout utilisateur authentifie peut tout voir/modifier. Inacceptable pour un SaaS multi-tenant. Une faille de securite structurelle.
- **Quoi faire** : `tenant_id = (auth.jwt()->>'tenant_id')::uuid` sur chaque policy RLS, des le jour 1. Pas d'exception.

### 4. ORM/framework maison
- **Source** : Twenty (twenty-orm), EspoCRM (ORM custom), Dolibarr (SQL inline partout)
- **Pourquoi** : Cout de maintenance disproportionne, courbe d'apprentissage pour les nouveaux devs, bugs subtils non couverts par la communaute.
- **Quoi faire** : Client Supabase + PostgREST pour le CRUD. PL/pgSQL pour la logique complexe en DB. Pas d'ORM intermediaire.

### 5. Wrapping legacy
- **Source** : SuiteCRM-Core (`chdir()`, `BeanFactory`, `LegacyHandler`)
- **Pourquoi** : Modernisation cosmetique qui double le cout de maintenance. Deux sources de verite, pas de type safety, impossibilite de tester proprement.
- **Quoi faire** : Ne jamais wrapper. Reecrire proprement. Si on doit migrer, on extrait les regles metier puis on reimplemente.

### 6. Over-engineering metadata
- **Source** : Twenty (60+ metadata modules, 20+ flat-* modules, ORM custom, triple API)
- **Pourquoi** : La genericite a un cout en complexite et en lisibilite. Un CRM PME n'a pas besoin d'objets custom complets ni de schema dynamique. Le ratio signal/bruit s'effondre.
- **Quoi faire** : Entites definies en code TypeScript + schema SQL. Champs custom via JSONB + Zod. Pas d'objets custom entiers avant V3. Commencer simple, abstraire quand le besoin se confirme.

### 7. Triple API simultanee
- **Source** : Twenty (GraphQL + REST + MCP en parallele)
- **Pourquoi** : Trois fois le cout de maintenance, trois fois la surface de bugs, trois fois la documentation. Un seul protocole principal suffit pour 95% des usages.
- **Quoi faire** : PostgREST auto-genere (Supabase) pour le CRUD + Edge Functions pour la logique complexe. Un seul point d'entree API. Ajouter GraphQL ou MCP uniquement si un use case concret l'exige.

### 8. Duplication de modeles pour le cache
- **Source** : Twenty (20+ modules `flat-*` : flat-object-metadata, flat-field-metadata, flat-view, etc.)
- **Pourquoi** : Doubler les modeles pour le cache multiplie la surface de code, cree des bugs de synchronisation, et rend le debugging cauchemardesque.
- **Quoi faire** : Cache Redis ou cache en memoire avec invalidation par version (le pattern `metadataVersion` de Twenty est bon, pas les flat-* entities).

### 9. Melange francais/anglais dans le code
- **Source** : Dolibarr (`llx_societe`, `fk_soc`, `$statut` vs `$status`, `$nom` vs `$name`, `fin_validite`)
- **Pourquoi** : 20 ans de dette technique accumulee. Impossible de savoir si un champ est en francais ou en anglais sans regarder. Les nouveaux devs perdent du temps.
- **Quoi faire** : Anglais partout (tables, colonnes, variables, fonctions, commentaires techniques). Francais exclusivement via i18n (next-intl) pour les labels UI.

### 10. Code mort et champs deprecated jamais nettoyes
- **Source** : Twenty (`addressOld`, `probability` deprecated, commentaires "if we are in December 2025 you can remove this" encore la en 2026), Dolibarr (`$statut` vs `$status`)
- **Pourquoi** : Le code mort brouille la comprehension, genere des faux positifs de recherche, et finit par casser subtilement quand quelqu'un l'utilise par erreur.
- **Quoi faire** : Supprimer agressivement. Si un champ est deprecated, il est supprime au prochain cycle. Pas de commentaire "a supprimer plus tard" -- on supprime maintenant.

---

## 6. Recommandations concretes

### Ce que je devrais probablement faire

1. **Commencer par le schema SQL et les types TypeScript** -- Le modele de donnees est la fondation. Definir les tables (convention Atomic CRM), les types (inspirees EspoCRM entityDefs), les contraintes et les RLS policies avant d'ecrire la premiere ligne de React.

2. **Implementer le multi-tenant RLS des le premier commit** -- Ajouter `tenant_id` retroactivement est un cauchemar. Chaque table, chaque policy, chaque query doit etre tenant-scoped des le depart.

3. **Construire devis + factures en V1** -- C'est la plus grosse opportunite de differenciation. Aucun CRM moderne open-source (Atomic CRM, Twenty) n'a de devis/factures. C'est pourtant le besoin #1 des PME francaises. Les regles metier sont dans Dolibarr, l'architecture moderne est dans Atomic CRM.

4. **Adopter la convention module-par-feature d'Atomic CRM** -- `contacts/`, `companies/`, `quotes/`, `invoices/` avec `{ list, show, edit, create }` par module. C'est lisible, maintenable, et permet le travail en parallele.

5. **Utiliser la config dynamique JSONB par tenant** -- Le pattern Atomic CRM (singleton JSONB + Context React + defaults) est parfait. Etapes pipeline, categories, devise, logos, types de taches -- tout configurable en runtime sans migration.

6. **Implementer les triggers SQL d'auto-populate** -- Avatar auto (gravatar), logo auto (favicon), sales_id default, last_seen update. Ca reduit le code frontend et garantit la coherence.

7. **Construire le pipeline kanban avec forecast** -- Combiner le drag & drop optimiste d'Atomic CRM avec le probability map d'EspoCRM. Le forecast (`SUM(amount * probability)` par periode) est un killer feature pour les dirigeants de PME.

8. **Preparer l'interface du driver email sans implementer tous les drivers** -- Definir `EmailDriver { connect, sync, send, disconnect }` inspire de Twenty. Implementer un seul driver (Gmail API) en V1. Les autres viendront.

9. **Mettre en place le pattern EntityLink (element_element)** -- Table pivot generique `(source_type, source_id, target_type, target_id)` de Dolibarr. Indispensable pour lier devis -> facture, opportunity -> contact, etc., sans couplage fort entre modules.

10. **Ecrire les tests sur les workflows critiques** -- Conversion lead, creation facture depuis devis, merge contacts, calcul forecast. Ce sont les endroits ou les bugs coutent cher. Tests unitaires sur les fonctions SQL + tests d'integration sur les Edge Functions.

### Ce que je ne devrais probablement pas faire

1. **Ne pas construire un metadata engine** -- Twenty a prouve que c'est puissant mais le cout est disproportionne (60+ modules, ORM custom, schema dynamique). Les entites sont definies en code TypeScript, pas en metadata runtime. Les champs custom (JSONB + Zod) suffisent pour V1.

2. **Ne pas implementer GraphQL** -- PostgREST auto-genere par Supabase couvre 95% des besoins CRUD. Les cas complexes passent par Edge Functions ou Next.js API Routes. GraphQL ajoute de la complexite (schema, resolvers, cache) sans benefice proportionnel pour un CRM PME.

3. **Ne pas construire un systeme de permissions field-level** -- Twenty le fait, mais c'est premature pour des PME de 2-20 personnes. RBAC avec scope own/team/all par entite est suffisant. On ajoutera field-level si un client enterprise le demande.

4. **Ne pas construire d'objets custom** -- Les tenants ne pourront pas creer leurs propres entites en V1. Les champs custom (JSONB) oui. Les objets custom, c'est le territoire du metadata engine qu'on ne veut pas construire.

5. **Ne pas wrapper de legacy** -- Si on evalue un composant existant (ex: librairie PHP), on extrait les regles metier et on reimplemente en TypeScript. Le pattern LegacyHandler de SuiteCRM-Core est le pire anti-pattern observe.

6. **Ne pas construire le sync email bidirectionnel en V1** -- C'est complexe (OAuth tokens, rate limiting, pagination, matching, edge cases). On commence avec l'inbound webhook (pattern Atomic CRM/Postmark) et on ajoute le sync actif en V2.

7. **Ne pas sur-generaliser les composants UI** -- Twenty a des record-table, record-board, record-calendar generiques pour tous les objets. C'est elegant mais c'est 40+ modules frontend. Commencer avec des composants specifiques par entite, extraire les composants generiques quand on voit la duplication.

8. **Ne pas construire un workflow engine visuel** -- Dolibarr a un WorkflowManager simple (constantes de config). Twenty a un moteur complet avec versions et actions. Pour V1, des automations codees (triggers SQL + Edge Functions) suffisent. Le builder visuel est V3.

9. **Ne pas implementer le multi-devise en V1** -- Dolibarr le fait, EspoCRM aussi. C'est complexe (taux de change, champs convertis, coherence). On commence avec l'euro uniquement (configurable par tenant dans le JSONB), on ajoute le multi-devise si le marche l'exige.

10. **Ne pas construire de systeme de modules activables/desactivables** -- Dolibarr a un systeme puissant (descripteurs, permissions, tables, menus par module). C'est premature. Tous les modules sont actifs pour tous les tenants en V1. La modularite arrive avec les plans tarifaires.

### Les 10 decisions techniques les plus impactantes

1. **RLS multi-tenant avec `tenant_id` plutot que schema-per-tenant** -- Twenty a prouve que schema-per-tenant isole bien mais complique les migrations et les operations (backup, restore, monitoring). Pour des PME, le RLS avec `tenant_id` dans le JWT est suffisant, plus simple a deployer sur Supabase, et ne necessite pas de gestion de schema dynamique. Si un jour on a un client enterprise qui exige l'isolation forte, on migrera ce tenant specifique vers un schema dedie.

2. **Supabase PostgREST comme API CRUD principale plutot qu'un backend custom** -- Atomic CRM valide que PostgREST couvre les besoins CRUD d'un CRM. Twenty a construit un backend NestJS massif (200+ modules) pour obtenir le meme resultat. Le rapport effort/resultat de PostgREST est imbattable. On investit le temps economise dans les regles metier (devis, factures, conversion).

3. **Devis/factures en V1 comme facteur de differenciation** -- Analyse des 5 repos : aucun CRM moderne (Atomic CRM, Twenty) ne fait de devis/factures. Seuls Dolibarr et SuiteCRM le font (en PHP legacy). Le workflow commercial complet dans un CRM moderne TypeScript/React est une opportunite unique sur le marche. Les regles metier sont documentees dans Dolibarr.

4. **TanStack Query plutot que ra-core ou Jotai AtomFamily** -- Atomic CRM depend de ra-core pour le data fetching (~180 concepts, couplage fort). Twenty utilise Jotai AtomFamily + Apollo Client (complexe, 2 systemes de cache). TanStack Query est le standard React pour les donnees serveur : cache, mutations, invalidation, pagination, optimistic updates, persistence offline. Un seul systeme, bien maitrise.

5. **Composition plutot qu'heritage pour les entites** -- Les 5 repos analysees convergent vers un probleme : la god-class. Dolibarr (CommonObject 11k LOC), Twenty (WorkspaceEntity 350 LOC 40 colonnes), EspoCRM (Record\Service 1800 LOC). La solution : des interfaces TypeScript composables (`Auditable`, `SoftDeletable`, `Linkable`, `Taggable`) plutot qu'un BaseEntity monolithique.

6. **Table `entity_links` plutot que des FK directes entre modules** -- Le pattern `element_element` de Dolibarr est le plus puissant pattern de decouplage observe. Une seule table pivot relie n'importe quel objet a n'importe quel autre. Les modules n'ont pas besoin de se connaitre mutuellement. Critique pour le workflow devis -> facture et pour l'extensibilite future.

7. **Convention schema declaratif Supabase (01_tables -> 07_storage)** -- Atomic CRM a prouve que ce pattern fonctionne. Les schemas declaratifs sont la source de verite, les migrations sont auto-generees. Ca evite la derive schema/code, simplifie le code review sur les changements de schema, et rend le projet accessible aux nouveaux devs.

8. **Permissions RBAC own/team/all implementees en RLS SQL** -- EspoCRM a le meilleur modele de permissions CRM observe (scope own/team/all par entite par action CRUD). Dolibarr a les permissions les plus granulaires par module. En implementant ca en RLS PostgreSQL plutot qu'en code applicatif, on garantit que les permissions sont enforces meme quand on accede a la DB directement (Edge Functions, scripts de migration, debugging).

9. **Triggers SQL pour la logique d'integrite plutot que du code applicatif** -- Atomic CRM a prouve le pattern (auto-populate avatar, logo, sales_id, last_seen via triggers). La logique critique doit etre dans la DB, pas dans le frontend ni dans un middleware. Ca garantit la coherence meme quand les donnees sont modifiees hors frontend (import CSV, API, migration).

10. **Next.js App Router plutot qu'un SPA pur** -- Atomic CRM est un SPA React pur (Vite). Ca fonctionne pour un outil interne, mais pour un SaaS PME, on a besoin de pages publiques (devis partages, portail client, landing pages) qui beneficient du SSR/ISR de Next.js. Le App Router permet de melanger pages dynamiques (dashboard CRM) et pages statiques (marketing, help center) dans le meme projet.
