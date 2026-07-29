# 0001 — Schéma SQL unique, sans migrations incrémentales (V1)

- **Statut** : **Remplacé par [ADR-0009](0009-bascule-vers-migrations-supabase.md)** (bascule vers `supabase/migrations/` comme source de vérité)
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03)
- **Décideurs** : mainteneur du projet

## Contexte

En pré-production, le schéma évolue vite et souvent en rupture. Maintenir des
migrations incrémentales à ce stade ralentit l'itération et produit des fichiers
de migration vite obsolètes, pour zéro donnée de production à protéger.

## Options considérées

- **A — Migrations versionnées dès le départ** (`supabase/migrations/`). Sûr pour
  la prod, mais lourd tant que le schéma n'est pas stabilisé.
- **B — Schéma unique « source de vérité » + `db reset`.** `schema.sql` + `rls.sql`
  + `seed.sql` rejoués à volonté. Itération maximale, zéro dette de migration.

## Décision

**Option B.** `supabase/schema.sql` est la source de vérité unique ; on applique
via `pnpm run db:reset`. Les types TS sont régénérés depuis ce schéma
(`pnpm run db:types`). Documenté dans `.claude/rules/database-supabase.md`.

## Conséquences

- Positives : itération très rapide, un seul endroit à lire pour comprendre la DB.
- Négatives / dette acceptée : **aucun chemin de migration pour de la donnée prod**.
  Le jour où un environnement contient des données réelles, `db reset` devient
  destructeur et tout changement de schéma redevient manuel/risqué.
- À revisiter si : **avant la première mise en production avec données réelles** —
  basculer vers `supabase/migrations/` (cf. roadmap). C'est une falaise connue, pas
  un oubli.
