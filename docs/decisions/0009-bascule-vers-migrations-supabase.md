# 0009 — Bascule vers `supabase/migrations/` (source de vérité)

- **Statut** : Accepté
- **Date** : 2026-06-13
- **Décideurs** : mainteneur du projet
- **Met à jour** : ADR-0001 (schéma unique sans migrations)

## Contexte

L'ADR-0001 a choisi, en pré-production, un `schema.sql` unique rejoué via
`db reset` — itération maximale, zéro dette de migration, au prix d'une « falaise
connue » : aucun chemin de migration pour de la donnée prod. Sa condition de
réouverture était explicite : « avant la première mise en production avec données
réelles — basculer vers `supabase/migrations/` ».

On y est : on prépare le déploiement. Trois constats ont déclenché la bascule :

1. **Aucun chemin schema → prod n'existe** (pas de projet hébergé lié, pas d'étape
   DB en CI). `db reset` est destructeur dès qu'il y a des données.
2. Le mode déclaratif `schema_paths` (migra/diff) **applique mal** notre `schema.sql`
   monolithique écrit à la main (réordonnancement → application partielle). On avait
   dû contourner par un script psql ad hoc (`scripts/db-reset.sh`).
3. Les migrations versionnées **règlent les deux** : la CLI les applique dans
   l'ordre, sans diff, et fournit un historique rejouable sur une DB avec données
   (`supabase db push`).

## Options considérées

- **A — Garder `schema.sql` + script psql.** Statu quo. Ne résout pas la prod.
- **B — Mode déclaratif `schema_paths` + `db diff`.** Génère des migrations par
  diff. Fragile sur notre schéma (cf. constat 2).
- **C — Migrations versionnées, schéma figé en baseline.** Une migration baseline =
  schéma actuel complet ; puis migrations incrémentales hand-written. `schema.sql`
  devient un dump régénéré (lecture seule). Push prod via `supabase db push`.

## Décision

**Option C.**

- **Source de vérité** : `supabase/migrations/`. Baseline
  `20260301000000_baseline.sql` = `schema.sql` + `rls.sql` + `storage.sql`
  concaténés dans l'ordre. Toute évolution future = nouvelle migration
  (`supabase migration new <nom>`), jamais d'édition rétroactive.
- **`schema.sql`** : dump régénéré du schéma `public` via `pnpm db:dump`
  (`supabase db dump --local --schema public`). Lecture seule, jamais édité à la
  main. Conserve le « un seul fichier à lire » d'ADR-0001 sans dérive.
- **`rls.sql` / `storage.sql`** : supprimés (repliés dans la baseline ; les policies
  publiques réapparaissent dans le dump `schema.sql`).
- **Local** : `pnpm db:reset` = `supabase db reset` (rejoue migrations + seed,
  nativement). Le hack psql et `[db.seed] enabled=false` sont retirés.
- **Prod** : `supabase db push` applique les migrations en attente. **Périmètre de
  cette itération** : structure + workflow local + doc. Le lien du projet prod
  hébergé et l'automatisation CI (`db push` avec secrets) restent une étape externe
  (compte Supabase + secrets GitHub), à faire ensuite.

## Conséquences

- Positives : chemin de migration prod-safe ; historique rejouable ; fin du
  contournement psql ; le dump garde un schéma lisible d'un coup d'œil.
- Négatives / dette acceptée :
  - `schema.sql` devient un dump pg_dump (identifiants quotés, sans les commentaires
    français curés). C'est un artefact, pas la source.
  - `pnpm db:types` écrase `src/types/database.ts` via `>` et **supprime les alias
    ajoutés manuellement en fin de fichier** (`QuoteStatus`, `Tag`, `PipelineStage`…).
    Footgun préexistant, non corrigé ici → suivi : déplacer ces alias dans un fichier
    séparé pour que la régénération soit sûre.
  - L'automatisation CI du `db push` et le lien prod restent à faire (hors périmètre).
- À revisiter si : on lie le projet prod (câbler le job CI `db push` + secrets), ou
  si l'on veut revenir à un schéma déclaratif quand l'outillage Supabase le gérera.

## Amendement 2026-07-31 — régénération des types rendue sûre

Le footgun décrit ci-dessus est résolu : `pnpm db:types` écrit désormais dans
`src/types/database.generated.ts`. Le fichier manuel `src/types/database.ts`
réexporte le généré et conserve les alias de domaine ; il n'est plus écrasé par
la régénération.
