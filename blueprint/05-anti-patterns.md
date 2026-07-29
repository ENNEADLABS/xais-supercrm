# 05 — Anti-patterns a eviter

> Chaque anti-pattern est documente avec sa source, pourquoi il est dangereux, et l'alternative recommandee.

---

## 1. Anti-patterns herites des CRM historiques

### AP-01 — God-class / entite de base monolithique

**Source** : Dolibarr `CommonObject` (11 884 lignes), Twenty `WorkspaceEntity` (350 lignes, 40+ colonnes), EspoCRM `Record\Service` (1 800 lignes).

**Description** : Une classe mere unique qui concentre persistance, validation, generation de documents, gestion des extrafields, liens entre objets, triggers, notes, contacts associes, statuts. Chaque CRM mature finit avec ce pattern.

**Pourquoi c'est dangereux** : Impossible a tester unitairement. Impossible a composer. Tout changement dans la classe de base impacte toutes les entites. Le `CommonObject` de Dolibarr fait du CRUD, du SQL inline, de la generation PDF, de la gestion de droits et de l'affichage — dans le meme fichier. Le `WorkspaceEntity` de Twenty est devenu un God Object avec des relations vers presque tous les modules du systeme.

**Quoi faire a la place** : Composition via interfaces/types TypeScript. Definir des concerns separes (`Auditable`, `SoftDeletable`, `Linkable`, `Taggable`) et les composer par entite. Une interface `BaseEntity` avec uniquement `id`, `tenant_id`, `created_at`, `updated_at` — rien de plus.

---

### AP-02 — SQL inline dans la logique metier

**Source** : Dolibarr (toutes les classes metier : `$this->db->query("SELECT ...")` dans chaque methode).

**Description** : Les requetes SQL sont ecrites directement dans les classes metier, melangees avec la logique de validation, de calcul de montants, de gestion de statuts.

**Pourquoi c'est dangereux** : Pas de separation des couches. Impossible de changer de base de donnees, de tester la logique metier sans base, de refactorer les requetes sans toucher au metier. Chaque methode fait 200+ lignes melangeant SQL, validation et side effects.

**Quoi faire a la place** : La logique critique (calculs, transitions, integrite) dans des fonctions PL/pgSQL. Le CRUD standard via le client Supabase (PostgREST). La logique applicative dans des services TypeScript qui appellent le client Supabase. Pas d'ORM custom (lecon Twenty et EspoCRM).

---

### AP-03 — Nommage bilingue dans le code

**Source** : Dolibarr — tables `llx_societe`, `llx_propal`, champs `fk_soc`, `datec`, `datep`, `fin_validite`, `fk_pays`. Variables `$nom` coexistant avec `$name`, `$statut` avec `$status`.

**Description** : Melange de francais et d'anglais dans les noms de tables, colonnes, variables, classes. Les champs deprecated (en francais) ne sont jamais supprimes, ils coexistent avec les nouveaux (en anglais).

**Pourquoi c'est dangereux** : Confusion permanente pour les developpeurs. Documentation implicitement fausse. Autocompletion IDE degradee. Impossible pour un contributeur non francophone de comprendre le schema.

**Quoi faire a la place** : Anglais pour tout le code technique (tables, colonnes, variables, fonctions, commentaires techniques). Francais uniquement dans les fichiers i18n pour l'UI. Regle non negociable.

---

### AP-04 — Permissions verifiees uniquement cote frontend

**Source** : Atomic CRM — toutes les RLS policies sont `authenticated using (true)`. La seule protection est le `canAccess` frontend qui cache les boutons aux non-admins.

**Description** : Les regles de securite sont implementees comme de la visibilite UI (cacher un bouton, ne pas afficher un menu) sans enforcement cote serveur/base de donnees.

**Pourquoi c'est dangereux** : N'importe quel utilisateur authentifie peut tout lire et tout modifier via l'API PostgREST. Il suffit d'un `curl` pour contourner toutes les "protections". Inacceptable pour un SaaS multi-tenant.

**Quoi faire a la place** : RLS PostgreSQL avec `tenant_id = (auth.jwt()->>'tenant_id')::uuid` sur chaque table. Verification supplementaire de scope (own/team/all) via une fonction SQL `is_authorized(user_id, entity_type, action)`. Le frontend cache les boutons en complement, jamais en remplacement.

---

### AP-05 — Wrapping legacy au lieu de reecriture

**Source** : SuiteCRM-Core — `chdir()` pour changer de repertoire vers le code legacy, `BeanFactory` pour instancier les anciens objets, `LegacyHandler` pour ponter le nouveau et l'ancien.

**Description** : Une couche "moderne" (API Platform, GraphQL) qui delegue en realite 90% du travail au code legacy via des bridges.

**Pourquoi c'est dangereux** : Double source de verite. Double cout de maintenance. Bugs de compatibilite entre les deux couches. Le code legacy n'est jamais supprime, la dette ne fait que croitre. Le `LegacyHandler` de SuiteCRM-Core utilise `chdir()` (changement de repertoire courant) comme mecanisme de bridge — c'est un anti-pattern systeme.

**Quoi faire a la place** : Ne jamais faire ca. Reecrire proprement module par module. Mieux vaut un produit avec 30% des fonctionnalites proprement implementees qu'un produit avec 100% des fonctionnalites via un bridge fragile.

---

## 2. Erreurs de conception frequentes

### AP-06 — Relations N-M via arrays PostgreSQL

**Source** : Atomic CRM — `deals.contact_ids bigint[]`, `contacts.tags bigint[]`.

**Description** : Utiliser des colonnes array PostgreSQL (`bigint[]`) pour modeliser des relations many-to-many au lieu de tables de jointure.

**Pourquoi c'est dangereux** : Pas d'integrite referentielle sur les elements du tableau (un ID supprime reste dans l'array). Pas de metadonnees sur la relation (role du contact dans le deal, date d'ajout du tag). Queries avec `@>` au lieu de JOINs standards. Incompatible avec les foreign keys. Impossible de construire un index sur les elements individuels. Le jour ou on a besoin de savoir "quel contact a le role Decision Maker dans ce deal", il faut tout migrer.

**Quoi faire a la place** : Tables de jointure avec FK, `ON DELETE CASCADE`, et possibilite d'ajouter des colonnes de metadonnees (`role`, `created_at`, `position`).

---

### AP-07 — ORM / framework maison

**Source** : Twenty (`twenty-orm` avec workspace-schema-manager, entity-manager, repository, query-runner), EspoCRM (ORM custom dans `Core/ORM/`), Dolibarr (pseudo-ORM via `CommonObject` avec SQL inline).

**Description** : Chaque CRM reinvente son propre ORM ou framework de persistance au lieu d'utiliser un outil existant.

**Pourquoi c'est dangereux** : Cout de maintenance disproportionne. Courbe d'apprentissage pour les nouveaux developpeurs. Bugs subtils non couverts par une communaute large. Twenty justifie son ORM custom par le multi-tenant dynamique (schema-per-tenant), mais le resultat est une couche d'abstraction complexe avec son propre schema manager, entity manager, repository et query runner — qui reimplemente ce que TypeORM fait deja.

**Quoi faire a la place** : Client Supabase (PostgREST) pour le CRUD. Fonctions PL/pgSQL pour la logique complexe (merge, conversion, calculs). Edge Functions Deno pour les operations admin. Pas d'ORM du tout — le client Supabase + les types TypeScript generes par `supabase gen types` suffisent.

---

### AP-08 — Record Service generique unique

**Source** : EspoCRM — `Core/Record/Service.php` (1 800 lignes). Un seul service pour toutes les operations CRUD sur toutes les entites, specialise via metadata.

**Description** : Un service generique unique gere create/read/update/delete pour toutes les entites. La specialisation se fait par des metadata et des hooks.

**Pourquoi c'est dangereux** : Le fichier grandit inexorablement (1 800 lignes chez EspoCRM). Chaque cas particulier ajoute un `if` ou un hook. La logique metier specifique a une entite est diluee dans un service generique. Difficile a deboguer — le stacktrace traverse des couches d'indirection.

**Quoi faire a la place** : Un service par entite (ou par domaine) qui importe des utilitaires partages. `QuoteService`, `InvoiceService`, `ContactService`. Les patterns communs (audit, soft delete, validation) sont des fonctions utilitaires, pas une classe de base.

---

### AP-09 — Champs deprecated jamais supprimes

**Source** : Twenty — `addressOld` sur Company, `phone` sur Person (remplace par `phones`), `avatarUrl` sur Person (remplace par `avatar`), `probability` sur Opportunity (remplace par `probabilityV2`). Commentaire dans le code : "if we are in December 2025 you can remove this" — toujours present en mars 2026. Dolibarr — `$statut` et `$status` en parallele, `$nom` et `$name` en parallele.

**Description** : Les anciens champs/variables sont marques deprecated mais jamais supprimes. Les nouveaux coexistent avec les anciens. Le schema accumule du poids mort.

**Pourquoi c'est dangereux** : Double source de verite. Confusion sur quel champ utiliser. Bugs de synchronisation entre ancien et nouveau. Augmentation de la surface de test. Le schema de base de donnees devient un musee des decisions passees.

**Quoi faire a la place** : Migration avec suppression effective. Quand un champ est remplace, creer une migration qui copie les donnees, met a jour les references, et supprime l'ancien champ. Maximum 1 release de coexistence.

---

## 3. Sur-ingenierie a eviter

### AP-10 — Metadata engine trop generique

**Source** : Twenty — 60+ metadata modules (`object-metadata`, `field-metadata`, `view`, `view-field`, `view-filter`, `view-filter-group`, `view-sort`, `view-group`, `view-field-group`, plus les permissions field-level et row-level).

**Description** : Un systeme ou tout est dynamique : les objets, les champs, les vues, les filtres, les tris, les groupements, les permissions par champ, les permissions par ligne. Le schema est genere a partir des metadata, l'API est generee, l'UI est generee.

**Pourquoi c'est dangereux** : La complexite explose. 60+ modules rien que pour les metadata. Le debugging traverse 5 couches d'abstraction. La performance depend de caches complexes (d'ou les 20+ modules `flat-*` de Twenty). Le cout de comprehension pour un nouveau developpeur est enorme. Pour un CRM PME avec 10 entites fixes, c'est un canon pour tuer une mouche.

**Quoi faire a la place** : Entites definies en code TypeScript + schema SQL. Configurabilite via le singleton JSONB par tenant (etapes, categories, types). Champs custom via colonne JSONB + validation Zod. Objets custom eventuellement en V3+, jamais en V1.

---

### AP-11 — Triple API simultanee

**Source** : Twenty — GraphQL (principal) + REST (ajout tardif) + MCP (pour l'IA). Trois protocoles maintenus en parallele pour les memes operations CRUD.

**Description** : Exposer les memes donnees via plusieurs protocoles API simultanement.

**Pourquoi c'est dangereux** : Triple surface de maintenance. Triple surface de bugs. Triple documentation. Les parseurs d'input divergent entre les protocoles. Le REST de Twenty "semble etre un ajout tardif" selon l'analyse — preuve que la deuxieme API est toujours moins bien maintenue.

**Quoi faire a la place** : Un seul protocole principal. Pour notre stack Supabase : API PostgREST auto-generee (CRUD standard) + Edge Functions (logique metier complexe) + API routes Next.js (BFF, webhooks entrants). Pas de GraphQL. Pas de MCP en V1.

---

### AP-12 — Cache par duplication de modeles (flat entities)

**Source** : Twenty — `flat-object-metadata`, `flat-field-metadata`, `flat-view`, `flat-view-field`, `flat-view-filter`, `flat-role`, etc. Environ 20 modules `flat-*` qui sont des versions denormalisees des entites pour le cache/performance.

**Description** : Creer des copies aplaties de chaque entite pour accelerer les lectures, au lieu d'utiliser un cache applicatif.

**Pourquoi c'est dangereux** : Double source de verite entre l'entite et sa version flat. Synchronisation a maintenir. 20+ modules supplementaires dans la codebase. Bugs de desynchronisation subtils.

**Quoi faire a la place** : Vues SQL materialisees pour les aggregations lourdes. Cache Redis pour les donnees chaudes (metadata par tenant). `stale-while-revalidate` cote frontend (TanStack Query). Pas de duplication de modeles.

---

### AP-13 — Schema-per-tenant pour un produit PME

**Source** : Twenty — un schema PostgreSQL par workspace (`workspace_{uuid}`), avec un workspace-schema-manager, des migrations dynamiques, un ORM custom pour le routing de schema.

**Description** : Creer un schema PostgreSQL complet par tenant pour l'isolation des donnees.

**Pourquoi c'est dangereux** : Les migrations doivent etre executees N fois (une par tenant). Le provisioning d'un nouveau tenant est lent (creation de schema + tables + indexes). Les queries cross-tenant sont impossibles sans `SET search_path`. L'outillage standard (Prisma, Supabase dashboard) ne gere pas bien les schemas dynamiques. Twenty a du construire un ORM custom pour gerer ca — preuve du cout.

**Quoi faire a la place** : RLS row-level avec `tenant_id` sur chaque table. Une seule migration pour tous les tenants. Performance suffisante pour des PME (dizaines de milliers de lignes par tenant, pas des millions). Si l'isolation stricte est requise (reglementaire), envisager des databases separees, pas des schemas.

---

## 4. Complexite produit a eviter trop tot

### AP-14 — Systeme de vues complet avant d'avoir des utilisateurs

**Source** : Twenty — ViewEntity avec type (TABLE, KANBAN, CALENDAR), ViewField, ViewFilter, ViewFilterGroup, ViewSort, ViewGroup, ViewFieldGroup. Vues persistees cote serveur, visibilite workspace/privee, aggregations kanban.

**Description** : Implementer un systeme complet de vues personnalisables (filtres composes, tris multiples, groupements, visibilite) avant d'avoir des utilisateurs reels qui expriment ce besoin.

**Quoi faire a la place** : V1 — une vue par entite (liste + kanban pour pipeline). Filtres basiques cote frontend (TanStack Table). V2 — vues sauvegardees. V3 — vues partagees avec permissions.

---

### AP-15 — Permissions field-level et row-level avant d'avoir des equipes

**Source** : Twenty — `FieldPermissionEntity` (par role + par champ metadata) + `RowLevelPermissionPredicateEntity` (predicats sur les lignes). EspoCRM — ACL avec scope own/team/all par entite et par action CRUD + stream.

**Description** : Implementer un systeme de permissions granulaire au niveau des champs individuels et des lignes de donnees avant d'avoir des clients avec des equipes structurees.

**Quoi faire a la place** : V1 — 3 roles (admin, manager, user) + RLS tenant_id + permissions CRUD par entite. V2 — scope own/team/all (pattern EspoCRM). V3 — permissions par champ si demandees.

---

### AP-16 — Multi-provider email complet en V1

**Source** : Twenty — drivers Gmail, Microsoft, IMAP, SMTP, avec sync bidirectionnelle, message-import-manager, message-export-manager, contact-creation-manager, match-participant.

**Description** : Supporter Gmail API + Microsoft Graph + IMAP/SMTP + sync bidirectionnelle des le lancement.

**Quoi faire a la place** : V1 — webhook inbound (pattern Atomic CRM via Postmark/SendGrid) + envoi SMTP basique. V1.5 — integration Gmail API (OAuth2, sync unidirectionnelle). V2 — Microsoft Graph + IMAP. La sync bidirectionnelle est un projet a elle seule.

---

## 5. Patterns de dette qui risquent de ralentir le produit

### AP-17 — Modules activables sans isolation reelle

**Source** : Dolibarr — chaque fonctionnalite est un module activable/desactivable. Le descripteur declare permissions, tables SQL, menus, widgets. Mais les modules partagent des classes de base (`CommonObject`), du SQL, des hooks. Desactiver un module ne desactive pas ses effets de bord.

**Pourquoi c'est dangereux** : L'illusion de modularite. Les modules sont couples par la classe de base, par les triggers, par les hooks. Desactiver le module "facture" ne supprime pas les references aux factures dans le workflow devis -> facture. La surface de test est proportionnelle au nombre de combinaisons de modules actifs.

**Quoi faire a la place** : Pas de modules activables en V1. Toutes les fonctionnalites du noyau sont toujours presentes. La modularite se fait par les plans tarifaires (features visibles par plan), pas par l'activation/desactivation de code.

---

### AP-18 — Dependance monolithique a un framework headless

**Source** : Atomic CRM — dependance a `ra-core` (react-admin headless) pour le data fetching, le routing, l'auth, le store, l'i18n, les patterns CRUD. ~180 concepts dans une seule dependance.

**Pourquoi c'est dangereux** : Verrouillage technologique. Impossible de changer le data fetching sans changer l'auth. Impossible d'optimiser le routing sans comprendre ra-core. Les mises a jour de ra-core impactent tout le produit. L'API de react-admin impose des conventions (resources, dataProvider, authProvider) qui peuvent ne pas correspondre aux besoins futurs.

**Quoi faire a la place** : Assembler des librairies independantes. TanStack Query (data fetching) + Supabase Auth (auth) + Next.js App Router (routing) + next-intl (i18n) + Zustand (state UI). Chaque brique est remplacable independamment.

---

## 6. Ce qu'il ne faut pas copier aveuglement

### AP-19 — Le kanban comme vue par defaut

**Source** : Atomic CRM — le pipeline kanban est la vue principale des deals. Twenty — le record-board (kanban) est un des modes de vue principaux.

**Observation** : Le kanban est seduisant en demo mais peu pratique quand on a plus de 20 deals actifs. Les colonnes debordent, le scroll horizontal est penible, les cartes se ressemblent. Un dirigeant de PME veut des chiffres (forecast, CA pipeline, top deals), pas un mur de cartes.

**Quoi faire a la place** : Le kanban est un mode de vue du pipeline, pas la vue par defaut. La vue par defaut du pipeline est un tableau avec colonnes triables, montant total par etape, et forecast pondere. Le kanban est accessible via un toggle.

---

### AP-20 — L'architecture "tout declaratif" d'EspoCRM

**Source** : EspoCRM — metadata JSON pour tout (entityDefs, scopes, clientDefs, fields, recordDefs, aclDefs, selectDefs, layouts). Merge hierarchique core -> modules -> custom.

**Observation** : Elegant en theorie, mais le debugging est un cauchemar. Pour comprendre pourquoi un champ se comporte d'une certaine facon, il faut traverser 3 couches de merge JSON + les hooks + les formules. La source de verite est dispersee. L'autocompletion IDE ne fonctionne pas sur des fichiers JSON.

**Quoi faire a la place** : TypeScript pour les definitions d'entites (autocompletion, type safety, refactoring). JSON/JSONB uniquement pour la configuration par tenant (valeurs, pas structure). Les layouts de formulaires sont des composants React, pas des fichiers JSON interpretes.

---

### AP-21 — Les extrafields via tables dediees

**Source** : Dolibarr — tables `llx_*_extrafields` separees pour chaque entite. `fetch_optionals()` et `insertExtraFields()` dans `CommonObject`.

**Observation** : Chaque entite a sa propre table d'extrafields avec des JOINs systematiques. Le schema SQL double en nombre de tables. La validation est faite a la main dans PHP.

**Quoi faire a la place** : Colonne JSONB `custom_fields` sur chaque entite + definition des champs dans la table `configuration` par tenant + validation Zod au runtime. Un seul mecanisme, pas de tables supplementaires, performances correctes grace aux index GIN sur JSONB.

---

### AP-22 — Le systeme de generation PDF via classes PHP

**Source** : Dolibarr — classes `pdf_azur.modules.php`, `pdf_crabe.modules.php`, etc. Generation pixel par pixel avec FPDF/TCPDF.

**Observation** : Le code de generation PDF est intimement lie au modele de donnees. Chaque template est une classe PHP de 1000+ lignes. Ajouter un champ au devis necessite de modifier chaque template PDF.

**Quoi faire a la place** : Templates HTML/React renderises en PDF via `@react-pdf/renderer` ou Puppeteer. Le template est un composant React qui recoit les donnees en props. Ajouter un champ = ajouter un `<Text>` dans le composant.

---

## Resume — Checklist anti-patterns

| # | Anti-pattern | Gravite | Source principale |
|---|---|---|---|
| AP-01 | God-class / entite de base monolithique | CRITIQUE | Dolibarr, Twenty, EspoCRM |
| AP-02 | SQL inline dans la logique metier | HAUTE | Dolibarr |
| AP-03 | Nommage bilingue dans le code | MOYENNE | Dolibarr |
| AP-04 | Permissions frontend-only | CRITIQUE | Atomic CRM |
| AP-05 | Wrapping legacy | CRITIQUE | SuiteCRM-Core |
| AP-06 | Relations N-M via arrays | HAUTE | Atomic CRM |
| AP-07 | ORM / framework maison | HAUTE | Twenty, EspoCRM, Dolibarr |
| AP-08 | Record Service generique unique | MOYENNE | EspoCRM |
| AP-09 | Champs deprecated jamais supprimes | MOYENNE | Twenty, Dolibarr |
| AP-10 | Metadata engine trop generique | HAUTE | Twenty |
| AP-11 | Triple API simultanee | MOYENNE | Twenty |
| AP-12 | Cache par duplication de modeles | HAUTE | Twenty |
| AP-13 | Schema-per-tenant pour PME | MOYENNE | Twenty |
| AP-14 | Systeme de vues complet premature | BASSE | Twenty |
| AP-15 | Permissions field/row-level prematurees | BASSE | Twenty, EspoCRM |
| AP-16 | Multi-provider email complet en V1 | MOYENNE | Twenty |
| AP-17 | Modules activables sans isolation | MOYENNE | Dolibarr |
| AP-18 | Dependance monolithique framework | MOYENNE | Atomic CRM |
| AP-19 | Kanban comme vue par defaut | BASSE | Atomic CRM, Twenty |
| AP-20 | Tout declaratif JSON | MOYENNE | EspoCRM |
| AP-21 | Extrafields via tables dediees | BASSE | Dolibarr |
| AP-22 | Generation PDF via classes PHP | BASSE | Dolibarr |
