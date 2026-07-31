# ENNEAD Studio Creator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Snapshot pédagogique d'un CRM + Content Studio pour créateurs et PME françaises,
construit comme un SaaS **multi-tenant dès le jour 0**. Le code provient d'un
prototype auparavant utilisé dans un dépôt privé ; ce dépôt public sert avant tout
de support d'apprentissage et d'exploration.

- **CRM** : contacts, sociétés, opportunités (pipeline kanban), devis, factures,
  paiements, emails Gmail multi-boîtes, documents (GED), tâches et activité.
- **Content Studio** : idées, contenus, scripts, assets, livrables, calendrier ;
  **cockpit quotidien** (à produire cette semaine / à valider / bloqués / en retard),
  **templates** réutilisables, **signaux de blocage** + validation, **publications**
  par canal.

> **Statut** : snapshot éducatif non déployé et sans maintenance active garantie.
> Gmail est implémenté ; Microsoft et IMAP/SMTP restent des stubs. Le projet n'est
> pas présenté comme prêt pour la production : réévalue les dépendances, la sécurité,
> les sauvegardes et l'exploitation avant tout déploiement réel.

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

- Node.js 22.16+ (`nvm use` lit le fichier `.nvmrc`)
- **pnpm 10.14.0** (le repo est standardisé sur pnpm — `corepack enable` recommandé)
- [Docker](https://docs.docker.com/get-docker/) démarré pour la base locale
- Supabase CLI **2.98.2**, invoquée via `npx` par les commandes ci-dessous

### Installation

```bash
git clone https://github.com/ENNEADLABS/xais-supercrm.git
cd xais-supercrm
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Le nom du dépôt est historique ; l'application et le package s'appellent désormais
**ENNEAD Studio Creator**.

### Base de données locale

```bash
npx supabase@2.98.2 start          # démarre Postgres + services Supabase locaux
npx supabase@2.98.2 status -o env  # affiche URL et clés de la stack locale
pnpm run db:reset                  # rejoue migrations/ + seed.sql
```

Reporte `API_URL` et `ANON_KEY` affichés par `status -o env` dans
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` de `.env.local`.

### Premier compte local

1. Ouvre Supabase Studio à l'URL affichée par `supabase start` (habituellement
   `http://127.0.0.1:54323`).
2. Dans **Authentication → Users**, crée un utilisateur avec un email et un mot
   de passe, puis marque-le comme confirmé.
3. Lance `pnpm run dev`, ouvre `http://localhost:3000`, connecte-toi et termine
   l'assistant d'onboarding.

Le trigger `handle_new_user()` crée automatiquement l'organisation et le rôle
administrateur du nouveau compte. Attention : `pnpm run db:reset` détruit la base
locale, comptes Auth compris ; crée donc le compte **après le dernier reset**.

> Les types DB vivent dans deux fichiers : `src/types/database.generated.ts` (sortie
> brute de `supabase gen types`, régénérée par `db:types`, ne pas éditer) et
> `src/types/database.ts` (point d'entrée `@/types/database` : ré-exporte le généré +
> alias de domaine maintenus à la main).

> La source de vérité du schéma est `supabase/migrations/` (ADR-0009). Un nouveau
> changement = `npx supabase@2.98.2 migration new <nom>`, puis `pnpm db:reset`.
> La CLI reste volontairement épinglée : une montée de version doit être validée
> avec les tests d'intégration RLS avant de modifier ce numéro et la CI.

### Lancer l'app

```bash
pnpm run dev                      # http://localhost:3000
```

---

## Variables d'environnement

Voir `.env.example` pour la liste complète. Les principales :

| Variable | Requise pour | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Application | URL Supabase locale ou distante |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Application | Clé anon/publishable utilisée par les clients |
| `SUPABASE_SERVICE_ROLE_KEY` | API bot | Provisionnement des comptes robot ; serveur uniquement |
| `SUPABASE_JWT_SECRET` | API bot | Signature des JWT robot legacy ; serveur uniquement |
| `ALLOWED_EMAILS` | Optionnel | Allowlist d'accès séparée par des virgules ; vide = désactivée |
| `EMAIL_ENCRYPTION_KEY` | Synchronisation email | Clé hex AES-256 pour les tokens email |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Gmail | OAuth Gmail (sync + envoi) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Gmail | Callback OAuth Gmail |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Production | Rate limiting partagé ; mémoire locale en fallback |
| `NEXT_PUBLIC_SENTRY_DSN` | Optionnel | Collecte Sentry |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Build Sentry | Upload des source maps |

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
pnpm run check            # lint + typecheck + tests unitaires
pnpm run test:watch       # Vitest watch
pnpm run test:coverage    # Vitest + couverture
pnpm run db:reset         # reset DB locale (rejoue migrations/ + seed.sql)
pnpm run db:dump          # régénère le dump de lecture supabase/schema.sql
pnpm run db:types         # régénère src/types/database.generated.ts
pnpm run test:integration # tests d'intégration RLS (stack Supabase locale)
```

### Dépannage rapide

- `supabase start` échoue : vérifie que Docker est démarré et dispose d'assez de mémoire.
- L'application redirige vers `/login` : vérifie les deux variables Supabase et recrée
  le compte si un `db:reset` a été exécuté.
- Une fonctionnalité email, bot, Upstash ou Sentry échoue : complète uniquement le
  groupe optionnel correspondant dans `.env.local`.
- Avant une PR, lance `pnpm run check`; ajoute `pnpm run test:integration` si tu touches
  aux migrations, à Supabase ou aux règles RLS.

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
📐 Intentions produit historiques : [`blueprint/`](blueprint/)
🤖 Contrat de l'API bot expérimentale : [`docs/api-v1.md`](docs/api-v1.md)

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

> **Lacunes connues** : pas encore d'E2E. La couverture porte sur tout `src/` mais
> aucun seuil bloquant n'est imposé : le rapport sert à rendre les zones non testées
> visibles. La méthode proposée pour traiter ces limites et les alertes transitives
> est détaillée dans [`docs/improvement-guide.md`](docs/improvement-guide.md).

---

## Déploiement

Le snapshot public n’est pas déployé. Il reste compatible avec Vercel pour le
front et les routes API, ainsi qu’avec Supabase pour la base de données.

CI (`.github/workflows/ci.yml`) : scan de secrets, lint, typecheck, tests unitaires,
build et tests d'intégration Supabase/RLS sur chaque PR.

---

## Structure du repo

```
src/
  app/            # App Router : pages (RSC) + API routes
  components/     # ui/ (shadcn) + un dossier par domaine
  lib/
    actions/      # Server Actions (auth + Zod + revalidate)
    services/     # logique métier et accès Supabase par domaine
    hooks/        # wrappers TanStack Query
    schemas/      # schémas Zod partagés
    supabase/     # clients browser/server + soft-delete
    pdf/          # génération PDF devis/factures
    utils/        # format, csv, encryption, rate-limit, sanitize
  stores/         # Zustand (UI)
  types/          # database.generated.ts (généré) + database.ts (entrée + alias)
supabase/         # migrations/ (source de vérité), schema.sql (dump), seed.sql
tests/            # Vitest : unitaires + integration/ (RLS multi-tenant)
blueprint/        # recherches et intentions historiques (pas une source canonique)
analysis/         # analyses historiques de CRM open source
docs/             # layout.md + decisions/ (ADR)
```

## Conventions

En bref : tables `plural_snake_case`, colonnes `snake_case`, types TS `PascalCase`,
code en anglais, commentaires en français, commits conventionnels
(`feat(crm):`, `fix(quotes):`…).

## Support et contribution

Ce dépôt est fourni **tel quel**, pour apprendre. Les issues et pull requests sont
bienvenues, mais leur traitement n'est soumis à aucun délai. Consulte
[`CONTRIBUTING.md`](CONTRIBUTING.md) avant de proposer un changement et
[`.github/SECURITY.md`](.github/SECURITY.md) pour signaler une vulnérabilité sans
l'exposer publiquement.

## Licence

[MIT](LICENSE) © 2026 ENNEAD LABS.
