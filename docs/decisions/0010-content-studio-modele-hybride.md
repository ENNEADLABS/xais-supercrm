# 0010 — Content Studio : modèle d'intégration hybride CRM + éditorial

- **Statut** : Accepté
- **Date** : 2026-06-15
- **Décideurs** : mainteneur du projet

## Contexte

Ajout au CRM d'un module **Content Studio** : centre de production éditoriale
(idées → contenus → scripts → assets → livrables dérivés → publication), pour un
créateur/agence. La question structurante : **comment l'intégrer au CRM existant**
sans dupliquer l'infrastructure transverse (tâches, documents, activités, notes)
déjà polymorphe via `(entity_type, entity_id)`, tout en gardant un métier
éditorial propre (statuts de production, scripts, assets versionnés, matrice de
repurposing, checklists) ?

Contraintes : multi-tenant jour 0 (RLS par `organization_id` sur chaque table,
cf. ADR-0005/0006), enum PostgreSQL pour les états de cycle, migrations source de
vérité (ADR-0009).

## Options considérées

- **A — Silo séparé.** Le studio ré-implémente ses propres tâches/documents/
  activités éditoriaux. Indépendant mais duplication massive de l'infra
  polymorphe et de l'UI (TaskList, DocumentList, ActivityTimeline).
- **B — Tout fondu dans le CRM générique.** Forcer les contenus dans les entités
  existantes (deal/contact). Aucune table neuve mais sémantique tordue, états de
  production inexprimables.
- **C — Hybride.** Étendre l'enum partagé `entity_type` (`content_idea`,
  `content_piece`, `deliverable`) pour brancher `tasks`/`documents`/`activities`/
  `notes` **sans toucher leur schéma** ; faire vivre le métier purement éditorial
  dans des **tables dédiées** (`content_pieces`, `content_scripts`, `deliverables`,
  `content_assets`, `content_checklist_items`, `content_ideas`) avec leur propre
  enum `content_status`.

## Décision

**Option C (hybride).**

- **Enum partagé étendu** : `alter type entity_type add value` pour
  `content_idea`, `content_piece`, `deliverable` — isolé en tête de migration
  (l'`ADD VALUE` ne peut être utilisé dans la même transaction que son usage).
- **Réutilisation directe** : `EntityTasksTab`, `EntityDocumentsTab`,
  `ActivityTimeline` (et leurs hooks) consomment `entity_type="content_piece"`
  tels quels. Zéro duplication.
- **Tables dédiées** au métier éditorial, RLS identique au reste (grille
  admin/member/viewer, soft-delete admin-only sur les tables à `deleted_at`).
- **Avancement carte kanban** = agrégat checklist calculé en une requête
  (`getBoardPieces`, type `BoardPiece`) — pas de N+1.
- **Périmètre V1** : noyau + production. Hors périmètre (V2) : templates,
  campagnes, publications multi-plateformes structurées, dashboard studio, liens
  contenu ↔ CRM (deal/contact), automations (n8n).

## Conséquences

- Positives : réutilisation totale de l'infra polymorphe et de l'UI transverse ;
  pattern RLS/multi-tenant homogène ; pas de silo ni de double maintenance ;
  livraison rapide (Phases A→E).
- Négatives / dette acceptée :
  - **Couplage de l'enum `entity_type`** : toute nouvelle entité éditoriale =
    migration `ADD VALUE` (ordre à isoler). On s'arrête volontairement à 3 valeurs.
  - `content_status` figé en enum → un nouveau statut = migration.
  - Carte kanban : « tâches ouvertes » et « assets manquants » non affichés en V1
    (agrégats non câblés) ; owner non résolu côté carte (`fetchMembers` est
    admin-only). Couverts si besoin V2.
  - Revert-on-error du kanban non testé unitairement (artefact react-query +
    vitest) — cf. `docs/content-studio.md`.
- À revisiter si : on veut lier structurellement contenus ↔ CRM (deals/contacts),
  ou si l'enum `entity_type` devient trop large (envisager une table de typage).
