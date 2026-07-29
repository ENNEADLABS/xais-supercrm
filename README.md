# ENNEAD Studio Creator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SaaS pour créateurs et PME françaises : un **CRM complet** + un **Content Studio**
de production éditoriale, sous un cockpit dirigeant — **multi-tenant dès le jour 0**.

- **CRM** : contacts, sociétés, opportunités (pipeline kanban), devis, factures,
  paiements, emails multi-boîtes, documents (GED), tâches et activité.
- **Content Studio** : idées, contenus, scripts, assets, livrables, calendrier ;
  **cockpit quotidien** (à produire cette semaine / à valider / bloqués / en retard),
  **templates** réutilisables, **signaux de blocage** + validation, **publications**
  par canal.

> **Statut** : CRM + Content Studio (V1 & V1.5) livrés sous forme de prototype
> hors ligne ; aucun trafic réel.

---

## Stack

| Couche       | Techno                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Frontend     | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind v4 |
| Design system| shadcn/ui style `base-nova` sur [`@base-ui/react`](https://base-ui.com) (pas Radix) |
| State        | TanStack Query v5 (serveur) + Zustand v5 (UI)                          |
| Formulaires  | React Hook Form + Zod 4 (schémas partagés client/serveur)             |
| Backend      | Next.js Server Actions + API Routes (pas de serveur séparé)           |
| Base         | Supabase (PostgreSQL 17, RLS, Storage, Auth JWT)                       |
| PDF          | `@react-pdf/renderer` (devis / factures)                              |
| Tests        | Vitest + React Testing Library                                        |
| Monitoring   | Intégration Sentry optionnelle                                        |
| Déploiement  | Non déployé ; compatible Vercel (front + API) et Supabase (DB)         |

---

## Démarrage rapide

### Prérequis

- Node.js 22+
- **pnpm 10.14.0** (le repo est standardisé sur pnpm — `corepack enable` recommandé)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase`) + Docker pour la DB locale

### Installation

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les valeurs (voir ci-dessous)
```

### Base de données locale

```bash
npx supabase start                # démarre Postgres + services Supabase locaux
pnpm run db:reset                 # rejoue supabase/migrations/ + seed.sql
pnpm run db:dump                  # régénère supabase/schema.sql (dump lecture seule)
pnpm run db:types                 # régénère src/types/database.generated.ts depuis le schéma
```

> Les types DB vivent dans deux fichiers : `src/types/database.generated.ts` (sortie
> brute de `supabase gen types`, régénérée par `db:types`, ne pas éditer) et
> `src/types/database.ts` (point d'entrée `@/types/database` : ré-exporte le généré +
> alias de domaine maintenus à la main).

> La source de vérité du schéma est `supabase/migrations/` (ADR-0009). Un nouveau
> changement = `npx supabase migration new <nom>`, puis `pnpm db:reset`.
>
> ⚠️ Le seed rattache l'org de démo au premier user auth existant (sinon il l'ignore
> proprement). Crée un user via le dashboard local puis relance `db:reset` au besoin.

### Lancer l'app

```bash
pnpm run dev                      # http://localhost:3000
```

---

## Variables d'environnement

Voir `.env.example` pour la liste complète. Les principales :

| Variable                          | Rôle                                              |
| --------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | URL du projet Supabase                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Clé anon publique                                 |
| `EMAIL_ENCRYPTION_KEY`            | Clé hex AES-256 (chiffrement des tokens email)    |
| `GOOGLE_CLIENT_ID` / `_SECRET`    | OAuth Gmail (sync + envoi)                         |
| `GOOGLE_OAUTH_REDIRECT_URI`       | Callback OAuth Gmail                              |
| `NEXT_PUBLIC_SENTRY_DSN`          | Monitoring (optionnel en dev)                     |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limiting prod (in-memory en fallback)      |

> **Jamais** committer `.env.local` ni de secret en clair. `.env*` est gitignoré.

---

## Scripts

```bash
pnpm run dev              # serveur de dev (Turbopack)
pnpm run build            # build production
pnpm run lint             # ESLint + Prettier check
pnpm run format           # Prettier --write
pnpm run typecheck        # tsc --noEmit
pnpm run test             # Vitest run
pnpm run test:watch       # Vitest watch
pnpm run test:coverage    # Vitest + couverture
pnpm run db:reset         # reset DB locale (rejoue migrations/ + seed.sql)
pnpm run db:types         # régénère src/types/database.generated.ts
pnpm run test:integration # tests d'intégration RLS (stack Supabase locale)
```

---

## Architecture

Flux unidirectionnel strict, du haut vers le bas :

```
Page (RSC mince)  →  Composant "use client"  →  hook useX (TanStack Query)
   →  Server Action xAction (auth + Zod + revalidate)
      →  Service xService (logique métier, filtre organization_id)
         →  Supabase (RLS + triggers SQL)
```

- **Multi-tenant jour 0** : RLS active sur chaque table (`get_user_org_id()`), et
  le code re-filtre par `organization_id` (defense in depth).
- **Montants en centimes** (integer), **TVA en basis points** (2000 = 20 %).
  Totaux calculés par **triggers SQL** — la conversion €↔centimes ne se fait
  qu'au niveau des formulaires UI.
- **États de cycle de vie** : machines à états dans les `*LifecycleService`
  (devis : draft→validated→sent→signed→invoiced ; factures : draft→…→paid).
- **Pas de `.single()`** : toujours array + vérification de `length`.

📂 Carte détaillée du repo : [`docs/layout.md`](docs/layout.md)
🏛️ Décisions d'architecture (le *pourquoi*) : [`docs/decisions/`](docs/decisions/)
📐 Vision produit & domaine (le *quoi*) : [`blueprint/`](blueprint/)

---

## Tests

```bash
pnpm run test              # tests unitaires (jsdom, sans DB)
pnpm run test:integration  # tests d'intégration RLS (stack Supabase locale)
```

Priorité : schémas Zod → services métier → API routes → composants → hooks.
Pattern AAA, factories plutôt que fixtures.

- **Unitaires** (`tests/`, Vitest + RTL) : schémas, services, utils, composants, hooks.
- **Intégration** (`tests/integration/`, ADR-0008) : isolation multi-tenant (grille
  RLS admin/member/viewer, cross-org) et fonctions transactionnelles PostgreSQL
  contre une vraie DB locale, via `vitest.integration.config.ts`.

> **Lacunes connues** : pas encore d'E2E. Quelques tests de transitions valident
> une copie locale de la logique plutôt que le service réel — à migrer vers
> l'intégration.

---

## Déploiement

Le snapshot public n’est pas déployé. Il reste compatible avec Vercel pour le
front et les routes API, ainsi qu’avec Supabase pour la base de données.

CI (`.github/workflows/ci.yml`) : lint + typecheck + test + build sur chaque PR.

---

## Structure du repo

```
src/
  app/            # App Router : pages (RSC) + API routes
  components/     # ui/ (shadcn) + un dossier par domaine
  lib/
    actions/      # Server Actions (auth + Zod + revalidate)
    services/     # logique métier (≤200 lignes/fichier)
    hooks/        # wrappers TanStack Query
    schemas/      # schémas Zod partagés
    supabase/     # clients browser/server + soft-delete
    pdf/          # génération PDF devis/factures
    utils/        # format, csv, encryption, rate-limit, sanitize
  stores/         # Zustand (UI)
  types/          # database.generated.ts (généré) + database.ts (entrée + alias)
supabase/         # migrations/ (source de vérité), schema.sql (dump), seed.sql
tests/            # Vitest : unitaires + integration/ (RLS multi-tenant)
blueprint/        # vision produit & décisions d'architecture (lecture)
docs/             # layout.md + decisions/ (ADR)
```

## Conventions

En bref : tables `plural_snake_case`, colonnes `snake_case`, types TS `PascalCase`,
code en anglais, commentaires en français, commits conventionnels
(`feat(crm):`, `fix(quotes):`…).

## Licence

[MIT](LICENSE) © 2026 ENNEAD LABS.
