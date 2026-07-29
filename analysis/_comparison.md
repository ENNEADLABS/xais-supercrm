# Synthèse transversale — Analyse comparative CRM open-source

---

## 1. Classement global

| # | Repo | Valeur métier | Valeur architecture | Modernité | Pertinence SaaS CRM PME | Signal/Bruit | Moyenne |
|---|------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Atomic CRM** | 7 | 8 | 9 | 8 | 9 | **8.2** |
| 2 | **EspoCRM** | 8 | 7 | 4 | 7 | 8 | **6.8** |
| 3 | **Twenty** | 6 | 9 | 10 | 6 | 6 | **7.4** |
| 4 | **Dolibarr** | 10 | 4 | 2 | 7 | 7 | **6.0** |
| 5 | **SuiteCRM-Core** | 6 | 3 | 5 | 4 | 4 | **4.4** |

### Justifications

- **Atomic CRM (1er)** : Meilleur rapport signal/bruit. Stack quasi-identique à la nôtre (React, Supabase, shadcn, TypeScript). Code compact (~15k LOC), lisible, patterns immédiatement réutilisables. Manque devis/factures et emails complets, mais l'architecture est la plus proche de notre cible.

- **EspoCRM (2e)** : Meilleur système metadata-driven accessible. Le modèle CRM (Lead avec conversion, Opportunity avec probabilités, ACL own/team/all) est mature et directement applicable. Frontend obsolète mais le backend est une mine d'or de règles métier déclaratives.

- **Twenty (3e)** : Architecture la plus sophistiquée (metadata-driven, schema-per-tenant, triple API, workflows, IA). Mais over-engineered pour un CRM PME : 60+ metadata modules, ORM custom, flat entities dupliquées. Le signal utile est noyé dans la complexité. Excellent pour les patterns d'intégration email et le multi-tenant.

- **Dolibarr (4e)** : Référence incontournable pour le workflow commercial complet (devis → commande → facture). 20+ ans de maturité métier. Architecture datée (PHP procédural, god-class de 11k lignes), mais les règles de gestion sont les plus complètes et éprouvées.

- **SuiteCRM-Core (5e)** : Anti-pattern architectural instructif. Le wrapping legacy via `chdir()` et `LegacyHandler` montre comment NE PAS faire une migration. Seuls l'utilisation d'API Platform et la couverture fonctionnelle (Quotes, Invoices, Contracts) présentent un intérêt.

---

## 2. Tableau comparatif

| Repo | Force principale | Faiblesse principale | Meilleur pattern métier | Meilleur pattern architecture | Ce qu'il faut copier | Ce qu'il faut éviter | Priorité de lecture |
|------|-----------------|----------------------|------------------------|------------------------------|---------------------|---------------------|-------------------|
| **Atomic CRM** | Stack moderne identique à la nôtre (React/Supabase/shadcn) | Pas de devis/factures, email limité à l'inbound webhook | Configuration CRM dynamique (singleton JSONB + Context React) | Schema déclaratif Supabase (`01_tables` → `07_storage`) | Schema déclaratif, auto-populate triggers, merge contacts SQL, config dynamique, Kanban drag & drop | Relations N-M via arrays `bigint[]`, RLS `authenticated using (true)`, dépendance monolithique ra-core | **P0** — Lire en premier |
| **Twenty** | Architecture metadata-driven + multi-tenant schema-per-tenant | Over-engineering (60+ metadata modules, ORM custom, flat entities) | ConnectedAccount → Channel → Message (multi-boîtes email) | Resolver factory pattern (CRUD auto-généré par metadata) | Pattern Target polymorphe, driver pattern email, workflow actions modulaires, BaseWorkspaceEntity | ORM custom, 20+ flat-* modules, god object WorkspaceEntity, triple API simultanée | **P1** — Lire pour email, multi-tenant, permissions |
| **Dolibarr** | Workflow devis → commande → facture complet et éprouvé | God-class CommonObject (11k lignes), pas de séparation des couches | WorkflowManager (automations configurables par événements business) | element_element (liens génériques entre objets via table pivot) | Statuts/transitions devis-commande-facture, permissions granulaires par module, modèle Contact/Société, createFromXxx | God-class, SQL inline, nommage FR/EN mélangé, frontend jQuery, routing procédural | **P1** — Lire pour les règles de gestion commerciale |
| **EspoCRM** | Système metadata-driven mature (JSON déclaratif) | Frontend Backbone obsolète, ORM maison, single-tenant | Lead conversion avec field mapping déclaratif + pipeline probability map | Metadata merge hiérarchique (core → modules → custom) | Modèle Lead/Opportunity/Account, ACL own/team/all, champs composites (currency, address), duplicate detection déclarative | Frontend JS vanilla, ORM maison, controller générique unique, Record Service monolithique | **P2** — Lire pour le modèle CRM et les permissions |
| **SuiteCRM-Core** | Couverture fonctionnelle (Quotes, Invoices, Contracts) | Wrapping legacy sans vrai modèle de données | Process pattern (opérations complexes encapsulées avec status) | API Platform avec Record générique (un endpoint pour tous les modules) | Liste des modules comme roadmap fonctionnelle, pattern Process pour opérations async | LegacyHandler + chdir(), attributs non typés, double source de vérité, absence d'entités Doctrine | **P3** — Parcourir pour la couverture fonctionnelle |

---

## 3. Synthèse transversale

### 3.1 Meilleurs patterns métier observés

1. **Workflow devis → commande → facture avec automations** (Dolibarr) : Machine à états configurable. Chaque transition (devis signé → commande auto, commande livrée → facture auto) est pilotée par des constantes de configuration. Le `WorkflowManager` écoute les événements et enchaîne les actions. Les méthodes `createFromProposal()` / `createFromOrder()` copient toutes les lignes (produits, quantités, prix, TVA, extrafields). Statuts éprouvés sur 20+ ans : Draft → Validated → Signed/Refused → Billed/Canceled.

2. **Lead conversion avec field mapping déclaratif** (EspoCRM) : Un Lead se convertit en Account + Contact + Opportunity via un mapping JSON déclaratif (`"convertFields": {"Account": {"name": "accountName"}}`). Zéro code, extensible, testable.

3. **Pipeline avec probability map** (EspoCRM) : Chaque étape du pipeline a une probabilité associée (Prospecting: 10%, Qualification: 20%, Proposal: 50%, Negotiation: 80%). Le montant pondéré `amount * probability` est calculé automatiquement. Permet le forecast de revenus immédiatement.

4. **Merge contacts transactionnel** (Atomic CRM) : Fusion SQL atomique de 2 contacts avec déduplications emails/phones par map, merge tags, réassignation notes/tasks/deals. Indispensable dans tout CRM.

5. **Configuration CRM dynamique** (Atomic CRM) : Singleton JSONB stockant les réglages métier (étapes deals, catégories, secteurs, types tâches, devise), avec Context React et fallback sur les defaults. Modifiable en runtime sans redéploiement.

6. **ConnectedAccount → Channel → Message** (Twenty) : Séparation propre entre le compte connecté (credentials OAuth), le canal de sync (config), et les messages. Permet le multi-boîtes nativement. Le module `match-participant` réconcilie les participants email avec les contacts CRM.

7. **Duplicate detection déclarative** (EspoCRM) : `"duplicateCheckFieldList": ["name", "emailAddress"]` dans le scope de l'entité. Détection automatique des doublons à la création sans code.

8. **Optimistic concurrency control** (EspoCRM) : `"optimisticConcurrencyControl": true` dans entityDefs. Empêche les conflits d'édition en multi-utilisateur. Pattern essentiel pour un SaaS.

### 3.2 Meilleurs patterns d'architecture observés

1. **Schema déclaratif Supabase** (Atomic CRM) : Source de vérité dans `supabase/schemas/` découpé en `01_tables → 07_storage`. Migrations auto-générées par `supabase db diff`. Pattern le plus propre pour gérer un schéma PostgreSQL déclaratif.

2. **Liens génériques entre objets — element_element** (Dolibarr) : Table pivot `(source_type, source_id, target_type, target_id)` avec méthodes `add_object_linked()` / `fetchObjectLinked()`. Permet de lier n'importe quel objet à n'importe quel autre sans couplage fort. Critique pour devis → facture.

3. **Metadata-driven architecture** (Twenty, EspoCRM) : Objets et champs décrits en metadata → schéma DB généré → API générée. Twenty pousse le concept le plus loin (schema-per-tenant, resolver factories). EspoCRM est plus pragmatique (JSON déclaratif, merge hiérarchique core → modules → custom). Pour un CRM PME, l'approche EspoCRM est plus adaptée en complexité.

4. **Auto-populate via triggers SQL** (Atomic CRM) : `set_sales_id_default`, `handle_contact_saved` (gravatar auto), `handle_company_saved` (favicon auto), update `last_seen` sur note. Garantit la cohérence même quand les données sont modifiées hors frontend.

5. **DataProvider étendu avec lifecycle callbacks** (Atomic CRM) : Interception des opérations CRUD pour upload fichiers avant save, transformation full-text search (`q` → `@or` avec `ilike`), redirection vers des vues SQL. Pattern générique applicable avec TanStack Query.

6. **Driver pattern pour intégrations** (Twenty) : Gmail, Microsoft, IMAP, SMTP sont des drivers interchangeables dans `modules/messaging/message-import-manager/drivers/`. Même interface, implémentations spécifiques. Extensible pour de nouveaux providers.

7. **Schema-per-tenant** (Twenty) : Un schema PostgreSQL par workspace. Isolation forte, backup/restore par tenant, performances prévisibles. Alternative robuste au RLS row-level.

8. **Extrafields / champs personnalisés** (Dolibarr, EspoCRM) : Dolibarr utilise des tables `*_extrafields` dédiées. EspoCRM utilise des metadata JSON. Les deux permettent aux utilisateurs d'ajouter des champs sans migration. Pour notre stack : colonne JSONB `custom_fields` + validation Zod.

### 3.3 Meilleurs patterns UI/UX observés

1. **Kanban avec drag & drop optimiste** (Atomic CRM) : État local mis à jour immédiatement (optimistic update), persistance asynchrone. Réorganisation d'index inter-colonnes avec @hello-pangea/dnd.

2. **Layout Show avec aside** (Atomic CRM) : 2 colonnes — contenu principal (notes timeline) à gauche, informations personnelles + tâches à droite. Pattern classique mais bien exécuté.

3. **Record table/board/calendar génériques** (Twenty) : Un seul composant de table/kanban/calendrier pour tous les types d'objets. Configurable via metadata (colonnes, tris, filtres, groupes).

4. **View system complet** (Twenty) : Vues persistées côté serveur avec type (TABLE, KANBAN, CALENDAR), filtres composés (ViewFilterGroup), tris, groupes, champs visibles, agrégations kanban, visibilité (workspace/privée).

5. **Command palette Cmd+K** (Twenty) : Recherche universelle tous objets. Standard UX attendu dans tout SaaS moderne.

6. **Record inline editing** (Twenty) : Édition en place dans les tables via `record-inline-cell/`. Réduit les allers-retours vers les formulaires.

7. **Notes avec infinite scroll et status** (Atomic CRM) : Pagination infinie, création inline, sélection de statut (cold/warm/hot). Pattern naturel pour un historique de notes.

8. **Responsive desktop/mobile avec composants séparés** (Atomic CRM) : Détection mobile → layout différent, resources différentes, offline-first avec Query persistence localStorage.

9. **Layouts déclaratifs JSON** (EspoCRM) : La disposition des champs dans les formulaires est décrite en JSON (rows, panels, colonnes). Le frontend interprète le layout. Permet la personnalisation sans code.

### 3.4 Meilleurs patterns de modularité

1. **Module par feature** (Atomic CRM, Twenty) : Chaque entité CRM a son dossier avec ses composants, hooks, types. Export propre (`{ list, show, edit, create }` chez Atomic CRM, modules NestJS autonomes chez Twenty).

2. **Modules activables/désactivables** (Dolibarr) : Chaque fonctionnalité est un module avec descripteur déclarant permissions, tables SQL, menus, widgets, triggers, constantes. Pattern puissant pour un SaaS multi-plan.

3. **Workflow actions extensibles** (Twenty) : Chaque action (AI Agent, Code, Delay, HTTP Request, Mail Sender, Record CRUD) est un module indépendant dans `workflow-actions/`.

4. **Metadata merge hiérarchique** (EspoCRM) : `core → modules → custom`. Chaque couche peut étendre ou surcharger la précédente. Pattern propre pour la personnalisation par tenant.

5. **Feature flags par workspace** (Twenty) : Rollout progressif de features par tenant. Essentiel pour un SaaS.

6. **Dual data provider** (Atomic CRM) : FakeRest pour dev/demo, Supabase pour prod. Même interface, switch transparent. Pattern utile pour les tests et les démos.

### 3.5 Anti-patterns récurrents

1. **God-class / God-object** : `CommonObject` de Dolibarr (11k lignes), `WorkspaceEntity` de Twenty (350 lignes, 40+ colonnes), `Record\Service` d'EspoCRM (1800 lignes). Chaque CRM mature finit avec une entité de base monolithique. **Solution** : composition, traits/mixins, séparation des concerns dès le départ.

2. **Relations N-M via arrays au lieu de tables de jointure** (Atomic CRM) : `contact_ids bigint[]`, `tags bigint[]`. Simplifie les queries simples mais empêche l'intégrité référentielle et les métadonnées sur la relation. **Solution** : tables de jointure avec FK.

3. **RLS trop permissif ou absent** : Atomic CRM utilise `authenticated using (true)`. EspoCRM et Dolibarr sont single-tenant. **Solution** : RLS multi-tenant avec `tenant_id` dès le jour 1.

4. **ORM/framework maison** (EspoCRM, Twenty, Dolibarr) : Chacun a réinventé son ORM/framework. Le coût de maintenance est disproportionné. **Solution** : utiliser Prisma, Drizzle, TypeORM ou le client Supabase.

5. **Wrapping legacy au lieu de réécriture** (SuiteCRM-Core) : `chdir()`, `BeanFactory`, `LegacyHandler`. Modernisation cosmétique qui double le coût de maintenance. **Leçon** : ne jamais faire ça.

6. **Mélange des couches** (Dolibarr) : SQL inline dans les classes métier, logique d'affichage dans les modèles, contrôleurs procéduraux. **Solution** : séparation stricte Controller → Service → Repository → DB.

7. **Over-engineering metadata** (Twenty) : 60+ metadata modules, 20+ flat-* modules, triple API (GraphQL + REST + MCP). La généricité a un coût en complexité et en lisibilité. **Solution** : commencer simple, abstraire quand le besoin se confirme.

8. **Champs deprecated jamais nettoyés** (Twenty, Dolibarr) : `addressOld`, `$statut` vs `$status`, `$nom` vs `$name`, commentaires "if we are in December 2025 you can remove this" encore présents en 2026. **Solution** : supprimer agressivement le code mort.

### 3.6 Ce que les CRM historiques font mieux que les CRM modernes

1. **Couverture fonctionnelle commerciale** : Dolibarr et SuiteCRM couvrent devis, commandes, factures, produits, stocks, comptabilité. Twenty et Atomic CRM n'ont aucun de ces modules. 20 ans de développement ont produit des règles de gestion exhaustives et éprouvées.

2. **Workflow commercial structuré** : Dolibarr a un workflow devis → commande → facture avec des statuts précis, des transitions configurables, des automations cascadées, et une vérification de cohérence des montants. Les CRM modernes se limitent à un pipeline kanban basique.

3. **Permissions granulaires matures** : EspoCRM (own/team/all par entité + par action CRUD + stream) et Dolibarr (permissions par module avec CRUD + permissions avancées) ont des systèmes affinés par des années d'usage réel. Les CRM modernes commencent à peine à implémenter ce niveau de granularité.

4. **Champs personnalisés** : Dolibarr (extrafields avec tables dédiées + insertion dynamique) et EspoCRM (metadata JSON avec types composites) ont des systèmes matures. Les CRM modernes n'en ont pas (Atomic CRM) ou over-engénièrent (Twenty avec 60+ modules).

5. **Gestion documentaire et génération PDF** : Dolibarr génère des devis/factures PDF via des templates configurables (classes PHP ou ODT). Stockage avec traçabilité (`last_main_doc`). Les CRM modernes se limitent aux attachments.

6. **Lead management complet** : EspoCRM a un cycle Lead → qualification → conversion (Account + Contact + Opportunity) avec mapping de champs déclaratif, probability map, et web-to-lead capture. Les CRM modernes n'ont généralement pas de notion de Lead distincte du Contact.

### 3.7 Ce que les CRM modernes font mieux que les CRM historiques

1. **UX temps réel** : Drag & drop kanban optimiste, inline editing, command palette (Cmd+K), infinite scroll, PWA offline. L'expérience utilisateur est incomparablement meilleure.

2. **Intégration email native** : Twenty synchronise Gmail/Outlook/IMAP bidirectionnellement avec matching automatique des participants aux contacts CRM. Dolibarr fait du polling IMAP basique, EspoCRM est intermédiaire.

3. **Architecture API-first** : Twenty expose GraphQL + REST + MCP depuis une source unique de metadata. Atomic CRM consomme l'API PostgREST auto-générée de Supabase. Les CRM historiques ont des APIs ajoutées après coup et sous-documentées.

4. **Multi-tenant natif** : Twenty a le schema-per-tenant avec isolation forte. Atomic CRM a Supabase Auth avec potentiel RLS. Les CRM historiques sont single-instance (une installation par client).

5. **Intégration IA** : Twenty intègre des agents IA, skills, tools, serveur MCP. Atomic CRM a un endpoint MCP. Les CRM historiques n'ont aucune composante IA.

6. **DevX moderne** : TypeScript strict (pas de `any`), hot reload, tests e2e Playwright, Storybook, monorepo, linting custom. Le cycle de développement est beaucoup plus rapide.

7. **Mobile/offline** : Atomic CRM a une PWA offline-first avec persistence TanStack Query sur localStorage. Les CRM historiques n'ont pas de mode offline (SuiteCRM a une app Angular mais pas offline).

### 3.8 Ce qui manque encore dans la plupart des repos

1. **Devis + factures dans un CRM moderne** : Aucun CRM moderne analysé (Atomic CRM, Twenty) ne gère devis/factures. C'est pourtant essentiel pour un CRM PME. Seuls Dolibarr et SuiteCRM le font (en PHP legacy). C'est notre plus grosse opportunité de différenciation.

2. **Email bidirectionnel complet accessible** : Seul Twenty fait du sync bidirectionnel multi-provider, mais l'architecture est complexe. Atomic CRM se limite à l'inbound webhook Postmark. Aucun CRM open-source n'offre un email bidirectionnel simple à déployer.

3. **Multi-tenant avec isolation forte + simplicité** : Twenty a le schema-per-tenant (puissant mais complexe à opérer). Atomic CRM n'a pas de multi-tenant. Aucun repo n'offre un multi-tenant RLS-based simple et efficace sur Supabase.

4. **Extraction d'information automatique** (IA) : Aucun CRM n'extrait automatiquement des infos structurées depuis les emails, documents ou conversations pour enrichir les fiches contacts/sociétés. Twenty a des agents IA mais pas d'extraction CRM automatisée.

5. **Automatisations accessibles aux non-devs** : Twenty a un workflow engine complet mais orienté développeurs. Dolibarr a le WorkflowManager mais configurable uniquement par admin technique. Aucun CRM n'offre un builder d'automatisations visuel simple pour les utilisateurs PME.

6. **Analytics CRM intégrés** : Aucun repo n'offre des analytics de performance commerciale : taux de conversion par étape, sales velocity, forecast pondéré, temps moyen par étape, win/loss ratio. Dolibarr a des statistiques basiques, Twenty a des dashboards configurables mais vides de contenu CRM.

7. **Signatures électroniques** : Aucun CRM n'intègre la signature électronique des devis/contrats. Dolibarr a un statut "signé" mais pas de workflow de signature intégré.

8. **Catalogue produit/service moderne** : Dolibarr a un module produit complet mais daté. Les CRM modernes n'en ont pas du tout. Un CRM PME a besoin d'un catalogue pour composer les lignes de devis/factures.

---

## 4. Recommended Blueprint Notes

> Ce n'est PAS un PRD. C'est une note d'architecture et de conception pour un CRM SaaS PME TypeScript/React/Next.js/Supabase.

### Briques à reprendre

| Brique | Source | Action |
|--------|--------|--------|
| Schema déclaratif Supabase (`01_tables` → `07_storage`) | Atomic CRM | Copier la structure de fichiers, adapter le contenu |
| Auto-populate triggers SQL (avatar, logo, sales_id, last_seen) | Atomic CRM | Copier et adapter |
| Configuration dynamique (singleton JSONB + Context React) | Atomic CRM | Copier le pattern, étendre pour multi-tenant |
| Merge contacts SQL transactionnel | Atomic CRM | Adapter pour tables de jointure au lieu d'arrays |
| Kanban drag & drop avec optimistic updates | Atomic CRM | Copier le pattern @hello-pangea/dnd |
| Workflow devis → commande → facture (statuts, transitions) | Dolibarr | Réimplémenter en TypeScript/Supabase |
| Pattern `element_element` (liens génériques entre objets) | Dolibarr | Table `entity_links(source_type, source_id, target_type, target_id)` |
| WorkflowManager (automations par événements) | Dolibarr | Supabase database triggers + Edge Functions |
| Pattern `createFromXxx` (conversion devis → facture) | Dolibarr | Service de transformation TypeScript typé |
| Permissions granulaires par module CRUD | Dolibarr | Adapter pour RLS Supabase |
| Modèle Lead avec conversion déclarative | EspoCRM | Field mapping TypeScript/Zod |
| Pipeline probability map (weighted forecast) | EspoCRM | Copier le concept, implémenter en SQL view |
| ACL own/team/all par entité | EspoCRM | Implémenter via RLS policies Supabase |
| Duplicate detection déclarative | EspoCRM | Fonctions SQL + config JSON |
| Champs composites (currency, address) | EspoCRM | Types TypeScript + colonnes JSONB validées Zod |
| Pattern ConnectedAccount → Channel → Message | Twenty | Adapter pour multi-boîtes email |
| Pattern Target polymorphe (TaskTarget, NoteTarget) | Twenty | Table de liaison polymorphe pour notes/tâches |
| Driver pattern pour intégrations email | Twenty | Adapter (Gmail API, Microsoft Graph, IMAP) |
| Workflow actions modulaires | Twenty | Chaque action = module indépendant |
| Command palette (Cmd+K) | Twenty | Implémenter avec cmdk |
| Process pattern pour opérations async | SuiteCRM-Core | Job queue avec status tracking |

### Objets métier minimaux

Entités de base pour un CRM PME viable, synthétisées des 5 analyses :

```
Core CRM :
  Tenant           -- multi-tenancy (id dans JWT, clé de RLS)
  User             -- auth + profil, lié à Tenant via membership
  Team             -- équipe pour scope permissions (EspoCRM pattern)
  Company          -- société cliente (Atomic CRM + Dolibarr modèle)
  Contact          -- personne physique, multi-email, multi-phone (table jointure)
  Lead             -- prospect pré-qualification (EspoCRM modèle)
  Opportunity      -- deal pipeline, étapes + montant + probabilité (EspoCRM)

Gestion commerciale :
  Product          -- catalogue produits/services (Dolibarr modèle)
  Quote            -- devis avec lignes (Dolibarr propal)
  QuoteLine        -- ligne de devis : produit, quantité, prix, TVA, remise
  Invoice          -- facture avec lignes (Dolibarr facture)
  InvoiceLine      -- ligne de facture
  Payment          -- paiement sur facture

Communication :
  ConnectedAccount -- compte email/calendar connecté (Twenty modèle)
  EmailChannel     -- canal de sync email
  Email            -- email synchronisé
  EmailParticipant -- liaison email ↔ contact

Activités :
  Task             -- tâche avec assignee, due date, lien polymorphe (Twenty Target)
  Note             -- note rich text, lien polymorphe
  Activity         -- log d'activité, vue SQL UNION ALL (Atomic CRM)
  Meeting          -- réunion/appel avec participants (EspoCRM modèle)

Transverse :
  Tag              -- tags avec couleur, table de jointure (pas d'arrays)
  Attachment       -- pièce jointe via Supabase Storage
  EntityLink       -- liens génériques entre objets (Dolibarr element_element)
  Configuration    -- singleton JSONB par tenant (Atomic CRM)
  CustomField      -- définition champs personnalisés par tenant (JSONB + Zod)
```

### Workflows minimaux

1. **Lead → Opportunity + Contact + Company** : Conversion de lead avec mapping de champs déclaratif (EspoCRM). Un lead qualifié crée automatiquement les 3 entités liées. Le mapping est configurable par tenant.

2. **Quote → Invoice** : Conversion devis → facture avec copie structurée des lignes, montants, TVA (Dolibarr `createFromXxx`). Statuts : Draft → Validated → Sent → Signed → Invoiced / Refused (Dolibarr). Automation configurable : devis signé → facture auto.

3. **Pipeline Opportunity** : Kanban avec étapes configurables par tenant, probabilité par étape, montant pondéré calculé automatiquement. Drag & drop avec persistence optimiste (Atomic CRM). Forecast = somme des `amount * probability` par période.

4. **Inbound email → Note/Contact** : Email reçu → matching contact par adresse → création note avec contenu (Atomic CRM webhook pattern). Si contact inconnu → création automatique (Twenty `contact-creation-manager`).

5. **Sync email multi-boîtes** : ConnectedAccount → Channel → polling/webhook → import messages → matching participants → timeline (Twenty driver pattern). Support Gmail API, Microsoft Graph, IMAP/SMTP.

6. **Activity log** : Vue SQL UNION ALL des créations/modifications (Atomic CRM pattern) + timeline polymorphe par record (Twenty `TimelineActivity`). Dashboard temps réel via Supabase Realtime.

7. **Onboarding tenant** : Création workspace → seed config par défaut (étapes pipeline, catégories, devise) → guide interactif (Atomic CRM DashboardStepper).

### Patterns de structure à reprendre

```
src/
  app/                     # Next.js App Router (pages, layouts, API routes)
  components/
    ui/                    # shadcn/ui (mutable, Atomic CRM pattern)
    crm/                   # Code métier CRM, module par feature
      contacts/            # { list, show, edit, create } par entité
      companies/
      leads/
      opportunities/
      quotes/
      invoices/
      emails/
      tasks/
      notes/
      activity/
      dashboard/
      settings/
      layout/
  hooks/                   # Custom hooks partagés
  lib/                     # Utilitaires (cn, formatters, validators, logger)
  types/                   # Types métier centraux (Atomic CRM types.ts)
  services/                # Logique métier (conversions, merge, workflows)
  providers/               # Data fetching, auth, i18n, config context

supabase/
  schemas/                 # Source de vérité (Atomic CRM pattern)
    01_tables.sql          # Tables + FK + index + tenant_id
    02_functions.sql       # PL/pgSQL (merge, conversion, is_authorized)
    03_views.sql           # Vues (activity_log, summaries, forecast)
    04_triggers.sql        # Auto-populate, audit trail
    05_policies.sql        # RLS multi-tenant avec tenant_id
    06_grants.sql          # Grants restrictifs (pas de grant all)
    07_storage.sql         # Storage policies par tenant
  functions/               # Edge functions Deno (admin ops, webhooks, email sync)
  migrations/              # Auto-générées par supabase db diff
```

### Patterns à bannir

1. **God-class / BaseEntity monolithique** : Ne pas créer un `CommonObject` de 11k lignes (Dolibarr). Utiliser la composition : `Auditable`, `SoftDeletable`, `Linkable`, `Taggable` comme interfaces/mixins séparés.

2. **Relations N-M via arrays PostgreSQL** : Toujours utiliser des tables de jointure avec FK et contraintes d'intégrité. Les arrays `bigint[]` d'Atomic CRM empêchent l'intégrité référentielle et les métadonnées sur la relation.

3. **RLS permissif** : Jamais `authenticated using (true)`. Toujours `tenant_id = (auth.jwt()->>'tenant_id')::uuid` au minimum sur chaque table.

4. **ORM/framework maison** : Ne pas réinventer un ORM (leçon Twenty, EspoCRM, Dolibarr). Utiliser le client Supabase + PostgREST pour le CRUD, PL/pgSQL pour la logique complexe.

5. **Wrapping legacy** : Ne jamais wrapper un système existant via des bridges. Réécrire proprement (leçon SuiteCRM-Core avec `chdir()` et `LegacyHandler`).

6. **Over-engineering metadata** : Ne pas créer 60+ modules metadata pour un CRM PME (leçon Twenty). Commencer avec des entités définies en code TypeScript + schéma SQL, n'ajouter les champs custom (JSONB + Zod) que quand le besoin se confirme.

7. **Triple API simultanée** : Choisir un protocole principal. Pour notre stack Supabase : API PostgREST auto-générée + Edge Functions pour la logique complexe. Pas besoin de GraphQL + REST + MCP en parallèle.

8. **`console.log` en production** : Logger structuré (pino ou wrapper dédié) dès le jour 1. Pas de `console.error` direct dans le code métier.

9. **Mélange français/anglais dans le code** : Anglais pour tout le code (variables, fonctions, tables, colonnes, commentaires techniques). Français uniquement pour les labels UI via i18n.

10. **Flat entities / cache par duplication de modèles** : Ne pas créer des `flat-*` versions de chaque entité (leçon Twenty, 20+ modules de cache). Utiliser Redis ou un cache en mémoire structuré.

### Choix d'architecture recommandés

| Décision | Recommandation | Justification |
|----------|---------------|---------------|
| **Frontend** | Next.js App Router + React 19 + shadcn/ui + Tailwind v4 | Atomic CRM valide React + shadcn + Tailwind. Next.js ajoute SSR/ISR pour pages publiques (devis partagés, portail client). |
| **State management** | TanStack Query (données serveur) + Zustand (état UI) | TanStack Query est utilisé par Atomic CRM (via ra-core). Plus simple que Jotai AtomFamily (Twenty). |
| **Backend/API** | Supabase PostgREST (CRUD) + Edge Functions Deno (logique métier) + Next.js API routes (BFF) | Atomic CRM valide PostgREST + Edge Functions. Next.js API routes pour agrégation et webhooks entrants. |
| **Base de données** | PostgreSQL via Supabase | Vues SQL pour agrégations (Atomic CRM). PL/pgSQL pour logique critique (merge, conversion). Triggers pour auto-populate. |
| **Multi-tenant** | RLS row-level avec `tenant_id` sur toutes les tables | Plus simple que schema-per-tenant (Twenty). Suffisant pour PME. `tenant_id` injecté via `auth.jwt()` dans les policies RLS. |
| **Authentification** | Supabase Auth (email/password + OAuth Google/Microsoft) | Validé par Atomic CRM. SSO SAML/OIDC en extension future (Twenty et SuiteCRM supportent). |
| **Permissions** | RBAC 3 niveaux : rôle → permissions par entité (CRUD) → scope (own/team/all) | Synthèse EspoCRM (own/team/all) + Dolibarr (CRUD par module). Via RLS policies + helper SQL `is_authorized()`. |
| **Emails** | Driver pattern (Gmail API, Microsoft Graph, IMAP/SMTP) + queue async | Twenty valide l'architecture ConnectedAccount → Channel → Message. Edge Functions pour webhooks, pg_cron pour polling. |
| **Fichiers/Documents** | Supabase Storage avec policies par tenant + génération PDF | Atomic CRM valide le pattern Storage. Ajouter react-pdf ou @react-pdf/renderer pour devis/factures PDF. |
| **Schema management** | Schema déclaratif `supabase/schemas/` + migrations auto-générées | Atomic CRM valide ce pattern. Source de vérité = schémas déclaratifs, jamais les migrations. |
| **Formulaires** | react-hook-form + Zod | Validé par Atomic CRM. Zod pour validation côté client ET côté serveur (Edge Functions). Schemas partagés. |
| **i18n** | next-intl (FR/EN minimum) | Standard pour Next.js App Router. Atomic CRM utilise ra-i18n-polyglot, Twenty utilise Lingui. |
| **Tests** | Vitest (unit) + Playwright (e2e) + Storybook (composants) | Stack validée par Atomic CRM et Twenty. |
| **Config tenant** | Table `configuration` singleton JSONB par tenant + ConfigContext React | Atomic CRM valide ce pattern. Étapes pipeline, catégories, devise, logos, types tâches. |
| **Champs personnalisés** | Colonne JSONB `custom_fields` par entité + validation Zod runtime | Plus simple que extrafields Dolibarr (tables dédiées) et metadata Twenty (60+ modules). Suffisant pour V1. |
| **Recherche** | Supabase full-text search (tsvector) + pg_trgm (recherche floue) | Twenty utilise searchVector sur chaque entité. Pattern validé à grande échelle. |
| **Temps réel** | Supabase Realtime (subscriptions PostgreSQL) | Notifications pour modifications pipeline, nouveaux emails, tâches assignées. Atomic CRM utilise React Query polling, Supabase Realtime est supérieur. |
| **Offline/PWA** | TanStack Query persistence + service worker | Atomic CRM valide le pattern de persistence localStorage pour mobile. |
