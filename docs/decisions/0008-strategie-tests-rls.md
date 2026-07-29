# 0008 — Stratégie de tests RLS / isolation multi-tenant

- **Statut** : Accepté
- **Date** : 2026-06-13
- **Décideurs** : mainteneur du projet

## Contexte

L'isolation par `organization_id` est la garantie #1 du produit (multi-tenant jour 0).
Elle repose sur la RLS Supabase : ~133 policies sur 30+ tables, articulées autour des
helpers SQL `get_user_org_id()` et `get_user_role()` (cf. `supabase/rls.sql`,
`supabase/schema.sql`). L'ADR-0005 ajoute une defense in depth applicative, mais
constatait que **la RLS elle-même n'est couverte par aucun test automatisé** : une
seule policy manquante, un `WITH CHECK` oublié ou un rôle mal restreint exposerait des
données cross-tenant, et seule la relecture humaine l'attraperait.

Tester une policy RLS, c'est tester un comportement de la base réelle (le moteur
Postgres évalue `auth.uid()` → `get_user_org_id()` → `USING/WITH CHECK`). Ce n'est pas
réplicable par un test unitaire : il faut une vraie DB et un vrai contexte
d'authentification. Les tests existants (`tests/services/*.test.ts`) sont aujourd'hui
des **répliques** de la logique métier (jsdom, sans DB) — utiles pour la logique pure,
inopérants pour l'isolation.

## Options considérées

- **A — pgTAP (SQL natif).** Tests dans `supabase/tests/*.sql`, le tenant est simulé
  via `set local role authenticated; set local request.jwt.claims = '{"sub":...}'`.
  Teste les policies au plus près, tourne dans la DB. Coût : nouvelle extension +
  runner pgTAP, langage SQL à maintenir, et l'on simule le claim JWT au lieu de
  traverser la vraie chaîne d'auth.

- **B — Vitest-integration + sessions GoTrue réelles.** Un projet Vitest dédié (env
  `node`) qui parle à la DB Supabase locale. Un client `service_role` provisionne
  users/orgs hors RLS (`auth.admin.createUser`) ; un `signInWithPassword` produit des
  clients `anon` authentifiés en tant que tel user/role. Teste la chaîne complète
  JWT → `auth.uid()` → `get_user_org_id()` → policy. Réutilise l'écosystème de test
  existant.

- **C — Les deux.** pgTAP pour les policies pures + Vitest pour la defense-in-depth
  applicative. Couverture maximale, mais double outillage et double pipeline CI.

## Décision

**Option B — Vitest-integration + sessions GoTrue réelles.** Arguments décisifs :

1. **Un seul écosystème.** Équipe solo TypeScript : un runner et un langage à
   maintenir, pas un second outil SQL.
2. **Le vrai vecteur multi-tenant.** Le risque réel est le JWT mal interprété par les
   policies ; B exerce le JWT authentique plutôt qu'un `set request.jwt.claims` simulé.
3. **Harness réutilisable.** La même infra servira à tester la defense-in-depth
   applicative (services qui re-filtrent par `organization_id`) et les triggers SQL
   (calculs de totaux, statut de paiement), pas seulement les policies.

pgTAP reste plus « pur » (policies isolées, exécution intra-DB), mais ce gain ne
justifie pas le coût outillage + langage pour notre contexte.

### Forme retenue

- Projet Vitest `integration` séparé (env `node`, pointe sur `127.0.0.1:54321`).
  `pnpm test` reste rapide (unit/jsdom, sans DB) ; `pnpm test:integration` requiert la
  DB locale.
- Helpers de test (`tests/integration/helpers/`) : client `service_role` (seed hors
  RLS via `auth.admin.createUser`), `authClientFor(user)` → client `anon` authentifié
  par `signInWithPassword`, factory `createTestContext()` (`createTenant`, `addMember`,
  `cleanup`). Mécanisme choisi : **vraies sessions GoTrue** plutôt que des JWT signés à
  la main — aucun couplage au secret/format de clés local (robuste au passage de
  Supabase aux clés asymétriques) et plus réaliste.
- Job CI séparé : `supabase start` → `pnpm db:reset` → `pnpm test:integration`, sans
  ralentir le job unit/build. (Le bootstrap DB local a dû être réparé au passage : voir
  `scripts/db-reset.sh` — schema/rls/storage/seed appliqués via psql, le mode
  déclaratif `schema_paths` n'appliquant que partiellement notre schema.sql.)
- Premier périmètre livré : isolation cross-org + `WITH CHECK`, `viewer` sans insert,
  `member` autorisé (`tests/integration/rls/contacts.test.ts`). À étendre : delete/
  soft-delete admin, cas spéciaux (notes `author_id`, facture delete `draft` only),
  autres tables.

## Conséquences

- Positives : ferme le risque ouvert majeur de l'ADR-0005 ; les fuites cross-tenant
  deviennent détectables en CI ; harness extensible aux triggers et à la
  defense-in-depth.
- Négatives / dette acceptée : la CI doit provisionner la stack Supabase complète via
  `supabase start` (GoTrue requis pour créer les users de test → plus lourd qu'un
  simple service Postgres). Les tests d'intégration sont plus lents et plus fragiles
  que les tests unitaires ; l'isolation repose sur des orgs dédiées par test +
  `cleanup()` en fin de suite (pas de wipe global de la DB).
- À revisiter si : besoin de tester des policies purement SQL sans couche app (pgTAP
  redeviendrait pertinent en complément), ou si la DB locale en CI devient un goulot.
