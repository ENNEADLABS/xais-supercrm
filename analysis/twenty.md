# Analyse architecturale de Twenty CRM

## 1. Vue d'ensemble

**Positionnement** : Alternative open-source moderne a Salesforce, orientee developpeurs et startups/PME tech-savvy. Se distingue par un systeme de metadata dynamique qui permet de creer des objets custom sans migration -- c'est un CRM-as-a-platform plutot qu'un simple CRM.

**Cible utilisateur** : Equipes tech, startups, PME qui veulent un CRM auto-heberge et extensible. Pas oriente PME traditionnelle (pas de devis/factures).

**Niveau de maturite** : Tres avance. Le code est bien structure, les conventions strictes (fichiers < 300 lignes, named exports only, pas de `any`). L'architecture metadata/workspace est sophistiquee et aboutie. Le systeme de permissions (RBAC + row-level) est complet. L'IA (agents, skills, tools) est integree nativement.

**Impression generale** : Un projet ambitieux et bien execute architecturalement. Over-engineered sur certains aspects (metadata engine tres complexe pour le cas d'usage CRM), mais les patterns sont de qualite production. Le monorepo est propre et bien organise.

---

## 2. Cartographie metier

### Objets metier principaux (32 workspace entities)

| Objet | Description | Relations cles |
|-------|-------------|----------------|
| `Company` | Societe/compte | people, opportunities, tasks, notes, attachments |
| `Person` | Contact | company, messageParticipants, calendarEventParticipants |
| `Opportunity` | Pipeline commercial | company, pointOfContact, stage (enum string) |
| `Task` | Tache assignable | assignee (WorkspaceMember), taskTargets (polymorphe) |
| `Note` | Note texte riche | noteTargets (polymorphe) |
| `Message` | Email synchronise | messageThread, messageParticipants, messageChannel |
| `MessageChannel` | Canal email (Gmail/IMAP/SMTP/Microsoft) | connectedAccount, messageFolders |
| `CalendarEvent` | Evenement calendrier | calendarEventParticipants |
| `Workflow` | Automatisation | versions, runs, automatedTriggers |
| `WorkflowVersion` | Version de workflow | steps, trigger |
| `WorkflowRun` | Execution de workflow | status, output |
| `Attachment` | Piece jointe | polymorphe via objectMetadata |
| `ConnectedAccount` | Compte connecte (Google, Microsoft) | messageChannels, calendarChannels |
| `Dashboard` | Tableau de bord | widgets |
| `Favorite` | Favori utilisateur | polymorphe |
| `TimelineActivity` | Historique activites | polymorphe |
| `WorkspaceMember` | Membre workspace | user, role |
| `Blocklist` | Blocage email | emails/domaines bloques |

### Relations et flux metier

- **Pipeline** : Company -> Opportunity (stages) -> Person (pointOfContact). Pas de produits/lignes de devis.
- **Communication** : ConnectedAccount -> MessageChannel -> Message -> MessageParticipant -> Person. Sync bidirectionnelle Gmail/Microsoft/IMAP.
- **Activites** : Task et Note utilisent un pattern `*Target` (TaskTarget, NoteTarget) pour un lien polymorphe vers Company, Person, Opportunity, ou tout objet custom.
- **Timeline** : TimelineActivity agrege toutes les actions sur un record (polymorphe).
- **Workflows** : Workflow -> WorkflowVersion -> Steps (actions). Triggers automatises. Actions : AI Agent, Code, Delay, Filter, Form, HTTP Request, If/Else, Iterator, Mail Sender, Record CRUD, Logic Function.

### Couverture CRM -- Presence/Absence

| Fonctionnalite | Statut | Detail |
|----------------|--------|--------|
| Contacts/Societes | PRESENT | Company + Person, relations riches |
| Opportunites/Pipeline | PRESENT | Opportunity avec stages, amount (Currency) |
| Emails | PRESENT | Sync multi-provider (Gmail, Microsoft, IMAP/SMTP), messageFolders |
| Calendrier | PRESENT | Sync Google/Microsoft Calendar |
| Taches | PRESENT | Task avec assignee, status, dueAt |
| Notes | PRESENT | Note avec rich text (bodyV2) |
| Activites/Timeline | PRESENT | TimelineActivity polymorphe |
| Workflows/Automatisation | PRESENT | Moteur complet avec triggers, actions, conditions |
| Roles/Permissions | PRESENT | RBAC complet + row-level permissions + field-level permissions |
| Documents | PARTIEL | Attachments uniquement, pas de GED |
| **Devis** | ABSENT | Pas de systeme de devis |
| **Factures** | ABSENT | Pas de facturation |
| **Produits/Catalogue** | ABSENT | Pas de gestion de produits |

---

## 3. Architecture

### Stack technique

- **Frontend** : React 18, TypeScript, Jotai (state), Linaria (CSS-in-JS zero-runtime), Apollo Client (GraphQL), Vite
- **Backend** : NestJS, TypeORM, PostgreSQL, Redis, BullMQ (queues), GraphQL Yoga
- **Monorepo** : Nx workspace, Yarn 4
- **Analytics** : ClickHouse (optionnel)
- **Emails** : React Email (templates)
- **Tests** : Jest (unit), Playwright (e2e), Storybook (composants)

### Structure monorepo (packages/)

```
twenty-front/          # App React principale
twenty-server/         # API NestJS
twenty-ui/             # Lib composants UI partagee (inputs, layout, navigation, display, feedback)
twenty-shared/         # Types, constantes, utils partages (FieldMetadataType, etc.)
twenty-emails/         # Templates email React Email
twenty-docs/           # Site documentation Next.js
twenty-website/        # Site marketing
twenty-zapier/         # Integration Zapier
twenty-e2e-testing/    # Tests Playwright
twenty-cli/            # CLI
twenty-sdk/            # SDK client
twenty-client-sdk/     # SDK client (autre version)
twenty-apps/           # Apps tierces
twenty-companion/      # Extension companion
twenty-docker/         # Docker configs
twenty-oxlint-rules/   # Regles de lint custom
twenty-utils/          # Utilitaires dev (setup-dev-env.sh)
```

### Backend -- Architecture moteur (le coeur)

Le backend est organise en 3 couches dans `packages/twenty-server/src/` :

#### `engine/` -- Moteur generique (metadata-driven)

C'est le coeur architectural de Twenty. Il est **independant du domaine CRM**.

- **`engine/api/`** -- Couche API
  - `graphql/` : Schema GraphQL genere dynamiquement a partir des metadata objets
    - `workspace-schema-builder/` : Genere le schema GraphQL par workspace
    - `workspace-resolver-builder/` : Genere les resolvers CRUD automatiquement (FindMany, FindOne, CreateOne, UpdateOne, DeleteOne, DestroyOne, RestoreOne, MergeMany, GroupBy, FindDuplicates -- 16 factories)
    - `workspace-query-builder/` + `workspace-query-runner/` : Construction et execution de requetes
    - `graphql-query-runner/` : Runner direct des queries
  - `rest/` : API REST auto-generee a partir des memes metadata
  - `mcp/` : Serveur MCP (Model Context Protocol) pour integration IA

- **`engine/metadata-modules/`** -- Systeme de metadata (60+ modules)
  - `object-metadata/` : Definition des objets (ObjectMetadataEntity)
  - `field-metadata/` : Definition des champs (FieldMetadataEntity) -- 30+ types de champs
  - `view/`, `view-field/`, `view-filter/`, `view-sort/`, `view-group/`, `view-filter-group/`, `view-field-group/` : Systeme de vues complet
  - `role/`, `object-permission/`, `field-permission/`, `permission-flag/`, `row-level-permission-predicate/` : Permissions granulaires
  - `ai/` : Agents IA, skills, tools, models, chat, billing AI
  - `webhook/` : Webhooks sortants
  - `connected-account/`, `message-channel/`, `message-folder/`, `calendar-channel/` : Metadata pour integrations
  - `data-source/` : Gestion des datasources par workspace
  - `logic-function/` : Fonctions logiques custom
  - `skill/`, `front-component/`, `page-layout/`, `navigation-menu-item/`, `command-menu-item/` : Customisation UI
  - `route-trigger/` : Triggers sur routes

- **`engine/twenty-orm/`** -- ORM custom
  - `workspace-schema-manager/` : Gestion dynamique du schema DB par workspace (tables, colonnes, index, enums, foreign keys)
  - `entity-manager/` : Entity manager adapte aux workspaces
  - `repository/` : Repositories workspace-scoped
  - `query-runner/` : Execution de queries scopees au workspace
  - `base.workspace-entity.ts` : Classe de base (id, createdAt, updatedAt, deletedAt)
  - `custom.workspace-entity.ts` : Entite de base pour objets custom

- **`engine/workspace-manager/`** -- Gestion du cycle de vie workspace
  - `workspace-migration/` : Migrations dynamiques par workspace (workspace-migration-builder + workspace-migration-runner)
  - `twenty-standard-application/` : Definition des objets standard (company, person, etc.) et prefill data
  - `workspace-cleaner/` : Nettoyage de workspaces
  - `dev-seeder/` : Seeding de donnees de dev

- **`engine/core-modules/`** -- Modules systeme (50+ modules)
  - `auth/` : Authentification (strategies, guards, token, SSO, 2FA, impersonation)
  - `workspace/` : Gestion workspace (entity, resolver, service)
  - `billing/` : Facturation SaaS (Stripe)
  - `messaging/` : Timeline messaging
  - `calendar/` : Integrations calendrier
  - `email/` : Envoi d'emails (drivers)
  - `imap-smtp-caldav-connection/` : Connexions email/calendrier
  - `record-crud/` : CRUD generique sur records
  - `search/` : Recherche full-text (searchVector)
  - `workflow/` : Moteur de workflow
  - `file/`, `file-storage/` : Gestion de fichiers
  - `feature-flag/` : Feature flags par workspace
  - `twenty-config/` : Configuration centralisee
  - `audit/`, `event-logs/` : Audit trail
  - `admin-panel/` : Panel admin
  - `sso/` : SSO (SAML, OIDC)
  - `code-interpreter/` : Execution de code
  - `tool/`, `tool-generator/`, `tool-provider/` : Outils IA
  - `cloudflare/`, `dns-manager/` : Gestion domaines custom
  - `redis-client/`, `cache-storage/`, `session-storage/` : Caching

#### `modules/` -- Modules metier CRM

Logique metier specifique au CRM, organisee par domaine :

- `company/`, `person/`, `opportunity/` : Entites CRM core
- `messaging/` : Import/export emails (drivers Gmail, IMAP, Microsoft, SMTP), gestion participants, nettoyage
- `calendar/` : Sync calendrier
- `task/`, `note/` : Taches et notes
- `workflow/` : Executor, builder, runner, tools, triggers, status
- `contact-creation-manager/` : Auto-creation de contacts depuis emails
- `match-participant/` : Matching participants emails/contacts
- `attachment/`, `favorite/`, `favorite-folder/` : Attachments et favoris
- `timeline/` : Activites timeline
- `dashboard/`, `dashboard-sync/` : Dashboards
- `workspace-member/`, `connected-account/`, `blocklist/` : Gestion membres et comptes

### Frontend -- Architecture

#### State management : Jotai (atoms + families)

Pattern central : `atomFamily` pour stocker les records par ID.

```
recordStoreFamilyState = createAtomFamilyState<ObjectRecord | null, string>
```

- Atoms pour l'etat global (currentWorkspace, currentUser, views, filters)
- AtomFamily pour les collections dynamiques (records, fields)
- Apollo Client pour le cache GraphQL
- Selectors derives (recordStoreIdentifierFamilySelector, recordStoreFieldValueSelector)

Fichier cle : `packages/twenty-front/src/modules/object-record/record-store/states/recordStoreFamilyState.ts`

#### Modules frontend (40+ modules)

- `object-record/` : Coeur -- record-table, record-board (kanban), record-card, record-calendar, record-field, record-filter, record-sort, record-group, record-index, record-show, record-inline-cell, record-merge, record-picker, spreadsheet-import
- `object-metadata/` : Gestion des metadonnees cote client (hooks, graphql, states)
- `views/` : Composants de vues (filtres avances, tri, groupement, view-picker)
- `companies/`, `people/` : Composants specifiques
- `workflow/` : UI de workflow
- `settings/` : Pages de configuration
- `command-menu/` : Commande palette (Cmd+K)
- `activities/` : Timeline d'activites
- `ai/` : Integration IA
- `auth/` : Authentification
- `navigation/` : Navigation et menus
- `layout-customization/` : Customisation des layouts
- `dashboards/` : Tableaux de bord
- `side-panel/` : Panneau lateral

### Metadata system / Schema dynamique

**C'est le pattern le plus remarquable de Twenty.**

Architecture en 3 niveaux :

1. **Metadata layer** (schema `core`) : `ObjectMetadataEntity` et `FieldMetadataEntity` decrivent la structure des objets. Stockes dans PostgreSQL, schema `core`. Chaque workspace a ses propres metadata.

2. **Workspace schema** (schema `workspace_{uuid}`) : Chaque workspace a son propre schema PostgreSQL. Les tables sont creees/modifiees dynamiquement via le `WorkspaceSchemaManagerService` (table, column, index, enum, foreign key managers).

3. **API generation** : Le schema GraphQL et les resolvers sont generes automatiquement a partir des metadata. Le `WorkspaceGraphQLSchemaGenerator` lit les `ObjectMetadataEntity` et genere queries/mutations/types GraphQL. Meme chose pour l'API REST.

**Flux de creation d'un objet custom** :
1. L'utilisateur cree un `ObjectMetadataEntity` via l'API metadata
2. Le systeme cree la table dans le schema workspace via `WorkspaceSchemaManagerService`
3. Le schema GraphQL est regenere (version metadata incrementee)
4. L'API CRUD est immediatement disponible pour le nouvel objet
5. Les vues, filtres, tris sont configurables

**Types de champs** (`FieldMetadataType` dans `twenty-shared`) : TEXT, NUMBER, BOOLEAN, DATE, DATE_TIME, EMAIL, PHONE, LINK, LINKS, CURRENCY, FULL_NAME, ADDRESS, RATING, SELECT, MULTI_SELECT, RELATION, MORPH_RELATION, RICH_TEXT, PHONES, EMAILS, FILE, UUID, POSITION, RAW_JSON, et plus.

Fichiers cles :
- `engine/metadata-modules/object-metadata/object-metadata.entity.ts`
- `engine/metadata-modules/field-metadata/field-metadata.entity.ts`
- `engine/twenty-orm/workspace-schema-manager/workspace-schema-manager.service.ts`
- `engine/api/graphql/workspace-schema-builder/workspace-graphql-schema.factory.ts`

### API (GraphQL + REST + MCP)

- **GraphQL** (principal) : Schema genere par workspace. Operations CRUD auto-generees pour chaque objet (findMany, findOne, createOne, createMany, updateOne, updateMany, deleteOne, deleteMany, destroyOne, destroyMany, restoreOne, restoreMany, mergeMany, groupBy, findDuplicates). API metadata separee pour gerer les objets/champs.
- **REST** : API REST auto-generee a partir des memes metadata. Parseurs d'input requests.
- **MCP** : Serveur Model Context Protocol pour integration avec des LLMs. Expose les memes operations CRUD.
- **GraphQL Yoga** comme driver (pas Apollo Server).

### Persistance

- **TypeORM** pour le mapping objet-relationnel
- **PostgreSQL** : Database principale. Multi-schema (core + workspace_{id} par tenant)
- **Redis** : Cache, sessions, queues BullMQ
- **ClickHouse** : Analytics (optionnel)
- **Migrations** : Double systeme -- migrations TypeORM classiques pour le schema core, + migrations dynamiques workspace (`workspace-migration-builder` + `workspace-migration-runner`) pour les schemas tenant

### Multi-tenant / Workspaces

Architecture **schema-per-tenant** :

- Schema `core` : Users, Workspaces, AppTokens, ApiKeys, FeatureFlags, Auth, Billing
- Schema `metadata` (partage) : ObjectMetadata, FieldMetadata, ViewEntity -- scope par `workspaceId`
- Schema `workspace_{uuid}` : Tables des objets metier (company, person, etc.) -- un schema par workspace

Le `WorkspaceDataSourceService` gere la creation/suppression de schemas. Le `WorkspaceCacheService` met en cache les metadata par workspace (invalidation via `metadataVersion`).

Chaque workspace a :
- Son propre `subdomain` (unique)
- Un `customDomain` optionnel
- Des `featureFlags` independants
- Des configurations d'auth separees (Google, Microsoft, Password, SSO)
- Un `defaultRoleId` pour les nouveaux membres
- Des modeles IA configures (fastModel, smartModel)
- Des `applications` (systeme d'apps)

Fichier cle : `engine/core-modules/workspace/workspace.entity.ts`

### Permissions (RBAC + ABAC)

Systeme a 4 niveaux :

1. **Roles** (`RoleEntity`) : Label, permissions globales (canReadAllObjectRecords, canUpdateAllSettings, canAccessAllTools, canSoftDeleteAllObjectRecords, canDestroyAllObjectRecords)
2. **Object Permissions** (`ObjectPermissionEntity`) : Par role + par objet metadata (canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords, canDestroyObjectRecords)
3. **Field Permissions** (`FieldPermissionEntity`) : Par role + par champ metadata
4. **Row-Level Permissions** (`RowLevelPermissionPredicateEntity` + `RowLevelPermissionPredicateGroupEntity`) : Predicats sur les lignes de donnees, par role

Le `PermissionsService` resout les permissions en combinant role du user, permissions globales, permissions objet, permission flags, et permissions par application.

### Config, Tests, CI/CD

- **Config** : Module `twenty-config/` centralise. Feature flags par workspace.
- **Tests** : 487 tests backend, 771 tests frontend, 239 stories Storybook, e2e Playwright. `jest.preset.js` a la racine.
- **CI/CD** : Nx pour le build orchestration. `npx nx build twenty-shared` doit etre fait en premier.
- **Linting** : oxlint (regles custom dans `twenty-oxlint-rules`), lint diff-with-main pour la vitesse.
- **i18n** : Lingui pour l'internationalisation (backend et frontend).

---

## 4. Patterns remarquables

### Patterns metier reutilisables

1. **Pattern Target polymorphe** (TaskTarget, NoteTarget) : Permet de lier une tache/note a n'importe quel objet (Company, Person, Opportunity, Custom). Evite les relations N-N complexes. Chaque objet a ses `taskTargets` et `noteTargets`.

2. **Pattern ConnectedAccount -> Channel -> Message** : Separation propre entre le compte connecte (credentials), le canal (config de sync), et les messages. Permet multi-boites facilement.

3. **Pattern Timeline polymorphe** : `TimelineActivity` agrege toutes les actions sur un record via le systeme de metadata, pas de table pivot par objet.

4. **Pattern Participant** : `MessageParticipant` et `CalendarEventParticipant` relient les emails/events aux `Person` par matching d'email. Le `match-participant` module gere la reconciliation.

5. **Pattern Workflow versionnne** : Workflow -> WorkflowVersion -> Steps. Permet de versionner les automatisations sans casser les runs en cours.

### Patterns d'architecture reutilisables

1. **Metadata-driven architecture** : Le pattern le plus puissant. Objets et champs decrits en metadata -> schema DB genere -> API generee -> UI generee. Permet l'extensibilite sans code.
   - Fichiers : `engine/metadata-modules/object-metadata/`, `engine/twenty-orm/workspace-schema-manager/`

2. **Schema-per-tenant** : Chaque workspace a son propre schema PostgreSQL. Isolation forte, performances previsibles, facilite le backup/restore par tenant.
   - Fichier : `engine/workspace-datasource/workspace-datasource.service.ts`

3. **Resolver factory pattern** : 16 factories generent les resolvers CRUD automatiquement pour chaque objet. Un seul code pour toutes les operations CRUD sur tous les objets.
   - Fichier : `engine/api/graphql/workspace-resolver-builder/workspace-resolver.factory.ts`

4. **Workspace cache + metadata version** : Le cache des metadata est invalide par un compteur de version atomique (`metadataVersion`). Simple et efficace.
   - Fichier : `engine/workspace-cache/`

5. **Standard objects prefill** : Les objets standard (company, person, etc.) sont definis en code mais geres comme des metadata au runtime. Le `twenty-standard-application` les "prefill" dans les metadata a la creation du workspace.
   - Fichier : `engine/workspace-manager/twenty-standard-application/`

6. **Event emitter workspace-scoped** : Les events sont emis dans le contexte d'un workspace specifique.
   - Fichier : `engine/workspace-event-emitter/`

7. **Triple API (GraphQL + REST + MCP)** a partir d'une source unique de metadata. Le code CRUD est ecrit une fois, expose via 3 protocoles.

### Patterns UI/UX reutilisables

1. **Record table/board/calendar generiques** : Un seul composant de table/kanban/calendrier pour tous les types d'objets. Configurable via les metadata (colonnes, tris, filtres, groupes).
   - Fichiers : `twenty-front/src/modules/object-record/record-table/`, `record-board/`, `record-calendar/`

2. **View system complet** : Views avec type (TABLE, KANBAN, CALENDAR), filtres composes (ViewFilterGroup), tris, groupes, champs visibles, aggregations kanban, visibilite (workspace/private). Persistees cote serveur.
   - Fichiers : `engine/metadata-modules/view/`, `twenty-front/src/modules/views/`

3. **Command palette** (Cmd+K) : Module `command-menu/` avec recherche universelle.

4. **Record inline editing** : `record-inline-cell/` pour l'edition en place dans les tables.

5. **AtomFamily pour le store de records** : Pattern Jotai efficace pour gerer des milliers de records par ID sans re-render global.

### Patterns de modularite/extensibilite

1. **NestJS modules autonomes** : Chaque feature est un module NestJS avec son entity, service, resolver, module. Tres facile a ajouter/supprimer une feature.

2. **Driver pattern pour les integrations** : Gmail, Microsoft, IMAP, SMTP sont des "drivers" interchangeables pour le messaging et le calendrier.
   - Fichiers : `modules/messaging/message-import-manager/drivers/`

3. **Workflow actions extensibles** : Chaque action de workflow (ai-agent, code, delay, http-request, mail-sender, record-crud, etc.) est un module independant.
   - Fichier : `modules/workflow/workflow-executor/workflow-actions/`

4. **Feature flags par workspace** : Permet le rollout progressif de features par tenant.

5. **Custom objects** : `CustomWorkspaceEntity` definit la base de tout objet custom (name, position, createdBy, noteTargets, taskTargets, favorites, attachments, timelineActivities, searchVector). Un objet custom herite automatiquement de ces capacites.

---

## 5. Faiblesses

### Dette technique

- **Champs deprecated non nettoyes** : `addressOld` sur Company, `phone` sur Person, `avatarUrl` sur Person, `probability` sur Opportunity, `routerModel` sur Workspace (commentaire "if we are in December 2025 you can remove this"). La migration est incomplete.
- **`targetTableName` deprecated** sur ObjectMetadataEntity mais toujours `@Column({ nullable: false })`.
- **Commentaires TODO** dans le code de production (ex: "Is this really nullable?" sur FieldMetadataEntity).
- **`executeRawQuery` desactive** : `WorkspaceDataSourceService.executeRawQuery` lance une exception systematique. Code mort ou migration en cours.

### Couplage

- **Couplage fort entre metadata engine et modules metier** : Les workspace entities importent directement les types de `twenty-shared/types` et des decorators de l'engine. Un changement dans le systeme de metadata impacte tous les modules.
- **`WorkspaceEntity` (workspace.entity.ts) est massive** : 350 lignes, 40+ colonnes, relations vers presque tous les modules. C'est un God Object.
- **Le frontend depend fortement des metadata serveur** : Si le schema metadata change, tout le frontend record-store/record-table doit s'adapter.

### Complexite / Over-engineering

- **Systeme de metadata trop generique pour un CRM** : ObjectMetadata + FieldMetadata + ViewEntity + ViewField + ViewFilter + ViewFilterGroup + ViewSort + ViewGroup + ViewFieldGroup... c'est 60+ metadata modules pour un CRM. La complexite de comprehension est elevee.
- **Duplication "flat" entities** : `flat-object-metadata`, `flat-field-metadata`, `flat-view`, `flat-view-field`, `flat-view-filter`, `flat-role`, etc. -- environ 20 modules "flat-*" qui semblent etre des versions denormalisees pour le cache/performance. Augmente la surface de code a maintenir.
- **Triple API (GraphQL + REST + MCP)** : Maintenir 3 protocoles en parallele est couteux. Le REST semble etre un ajout tardif.
- **ORM custom (twenty-orm)** au lieu d'utiliser TypeORM directement : Ajoute une couche d'abstraction avec son propre schema manager, entity manager, repository, query runner. Justifie par le multi-tenant dynamique, mais complexifie le debugging.

### Elements a eviter

- **Le pattern "flat entity"** pour le cache : Mieux vaut un cache Redis bien structure qu'une duplication de modeles.
- **La taille du WorkspaceEntity** : A decomposer en modules de configuration.
- **Le double systeme de migration** : Source de bugs potentiels entre les migrations core et workspace.

---

## 6. Reutilisation concrete

### Copier tel quel

- **Pattern Target polymorphe** (TaskTarget, NoteTarget) pour lier taches/notes a n'importe quel objet. Simple, efficace, extensible. Score : **9/10**
- **Pattern ConnectedAccount -> Channel -> Message** pour l'integration multi-boites email. Architecture propre. Score : **8/10**
- **BaseWorkspaceEntity** (id, createdAt, updatedAt, deletedAt). Standard et minimal. Score : **9/10**
- **Driver pattern** pour les integrations email (Gmail, IMAP, Microsoft, SMTP). Score : **8/10**
- **AtomFamily Jotai** pour le store de records cote frontend. Score : **8/10**
- **Workflow actions pattern** : Actions modulaires, chacune independante. Score : **8/10**

### Adapter

- **Systeme de Views** (table, kanban, calendar avec filtres/tris/groupes) : Excellent concept mais simplifier la hierarchie d'entites (ViewFilterGroup, ViewFieldGroup sont overkill pour une V1). Score : **7/10**
- **Systeme de permissions RBAC** : Le modele Role -> ObjectPermission -> FieldPermission -> RowLevelPermission est complet mais trop granulaire pour une PME. Garder Role + ObjectPermission pour commencer. Score : **7/10**
- **Metadata-driven schema** : Le concept est puissant mais trop complexe a reimplementer. Pour notre CRM, definir les objets en code TypeScript et n'offrir que l'ajout de champs custom (pas d'objets custom entiers) simplifierait enormement. Score : **6/10**
- **Schema-per-tenant** : Bon pour l'isolation mais complexifie les migrations. Evaluer si le Row-Level Security (RLS) PostgreSQL ne suffirait pas pour notre cas PME. Score : **6/10**
- **Auto-generation de resolvers CRUD** : Le pattern factory est bon mais 16 factories est trop. Un generateur CRUD generique couvrant findMany, findOne, create, update, delete suffit. Score : **7/10**

### Ne pas reproduire

- **ORM custom (twenty-orm)** : Utiliser Prisma ou TypeORM directement. Le cout de maintenance d'un ORM custom est disproportionne. Score : **3/10**
- **Modules "flat-*" (20+ modules)** : Cache denormalise via duplication de modeles. Utiliser Redis ou un cache en memoire standard. Score : **2/10**
- **Triple API (GraphQL + REST + MCP)** : Choisir un protocole principal (GraphQL) et n'ajouter les autres que si necessaire. Score : **4/10**
- **60+ metadata modules** : Complexite excessive. Regrouper en 5-10 modules max. Score : **3/10**
- **God Object WorkspaceEntity** (350 lignes, 40+ colonnes) : Decomposer. Score : **2/10**

### Scores globaux

| Dimension | Score |
|-----------|-------|
| Architecture globale | 8/10 |
| Qualite du code | 8/10 |
| Systeme de metadata | 7/10 (puissant mais over-engineere) |
| Multi-tenant | 7/10 (isolation forte, complexite elevee) |
| Permissions | 8/10 |
| Emails/Messaging | 8/10 |
| Workflows | 8/10 |
| Frontend/UI | 7/10 |
| Reutilisabilite pour notre projet | 6/10 (trop generique, a simplifier) |

---

## 7. Lecture recommandee

Par ordre de priorite pour notre projet :

1. **Modele de donnees CRM** : `packages/twenty-server/src/modules/*/standard-objects/*.workspace-entity.ts` -- Tous les 30 workspace entities pour comprendre le schema CRM
2. **Systeme de metadata** : `packages/twenty-server/src/engine/metadata-modules/object-metadata/object-metadata.entity.ts` et `field-metadata/field-metadata.entity.ts` -- Comprendre comment les objets sont decrits
3. **Multi-tenant** : `packages/twenty-server/src/engine/workspace-datasource/workspace-datasource.service.ts` et `engine/core-modules/workspace/workspace.entity.ts`
4. **Permissions** : `packages/twenty-server/src/engine/metadata-modules/role/role.entity.ts`, `object-permission/object-permission.entity.ts`, `permissions/permissions.service.ts`
5. **Views** : `packages/twenty-server/src/engine/metadata-modules/view/entities/view.entity.ts` -- Pattern complet de vues configurables
6. **Messaging** : `packages/twenty-server/src/modules/messaging/` -- Architecture d'integration email multi-provider
7. **Workflow** : `packages/twenty-server/src/modules/workflow/` -- Moteur de workflow avec actions modulaires
8. **Frontend record store** : `packages/twenty-front/src/modules/object-record/record-store/states/recordStoreFamilyState.ts` -- Pattern Jotai atomFamily
9. **Resolver factory** : `packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/workspace-resolver.factory.ts` -- Auto-generation CRUD
10. **UI library** : `packages/twenty-ui/src/` -- Composants reutilisables (input, layout, navigation, display)
