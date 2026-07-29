# ENNEAD Studio Creator — Instructions Claude Code

## Projet

SaaS pour createurs et PME francaises : CRM complet + Content Studio de production
editoriale, sous un cockpit dirigeant.
Contacts, societes, opportunites, emails multi-boites, devis, factures, produits, documents, taches, activite.
Module Content Studio : production editoriale (idees, contenus, scripts, assets, livrables, calendrier),
cockpit quotidien (a produire / a valider / bloques / en retard), templates reutilisables,
signaux de blocage + validation, publications par canal.

## Stack

- **Frontend** : Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4, shadcn/ui
- **State** : TanStack Query (serveur) + Zustand (UI)
- **Formulaires** : React Hook Form + Zod
- **Backend** : Next.js API Routes + Server Actions (pas de serveur separe)
- **Database** : Supabase (PostgreSQL 17, pgvector, RLS, Realtime, Storage)
- **Auth** : Supabase Auth (JWT)
- **Tests** : Vitest + React Testing Library (frontend), Vitest (backend/services)
- **Deploiement** : Vercel (frontend + API) + Supabase (DB)
- **Monitoring** : Sentry

## Architecture

```
xais-supercrm/
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   │   ├── (auth)/             # Pages publiques (login, signup)
│   │   ├── (app)/              # Pages authentifiees
│   │   │   ├── dashboard/      # Cockpit dirigeant
│   │   │   ├── contacts/       # Contacts + societes
│   │   │   ├── pipeline/       # Opportunites kanban
│   │   │   ├── quotes/         # Devis
│   │   │   ├── products/       # Catalogue produits
│   │   │   ├── invoices/       # Factures
│   │   │   ├── emails/         # Emails multi-boites
│   │   │   ├── studio/         # Content Studio (cockpit, board, idees, calendrier, templates, publications, fiche contenu)
│   │   │   ├── documents/      # GED
│   │   │   ├── tasks/          # Taches
│   │   │   └── settings/       # Config organisation
│   │   └── api/                # API Routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   └── [domain]/           # Composants par domaine
│   ├── lib/
│   │   ├── supabase/           # Client Supabase (browser + server)
│   │   ├── hooks/              # Custom hooks (TanStack Query)
│   │   ├── services/           # Logique metier
│   │   ├── schemas/            # Schemas Zod (partages client/serveur)
│   │   └── utils/              # Utilitaires
│   ├── stores/                 # Zustand stores
│   └── types/                  # Types TypeScript
├── supabase/
│   ├── migrations/             # Source de verite (baseline + incrementales, ADR-0009)
│   ├── schema.sql              # Dump regenere du schema public (lecture seule)
│   └── seed.sql                # Donnees de demo
├── tests/                      # Tests
├── analysis/                   # Analyses CRM de reference (lecture seule)
├── blueprint/                  # Blueprint architecture (lecture seule)
├── reference-crm/              # Repos CRM clones (lecture seule, pas dans git)
└── specs/                      # Gestion de session
    ├── handoffs/               # Sauvegardes de session
    ├── todo/                   # Specs en attente
    └── done/                   # Specs terminees
```

## Commandes

```bash
# Dev
npm run dev                     # Next.js dev server
npm run build                   # Build production
npm run lint                    # ESLint + Prettier check
npm run format                  # Prettier fix
npm run typecheck               # tsc --noEmit

# Tests
npm run test                    # Vitest run
npm run test:watch              # Vitest watch
npm run test:coverage           # Vitest avec couverture

# Supabase (ADR-0009 : migrations = source de verite)
npx supabase start              # DB locale
pnpm db:reset                   # Rejoue migrations/ + seed.sql
pnpm db:dump                    # Regenere supabase/schema.sql (dump lecture seule)
pnpm db:types                   # Regenere src/types/database.generated.ts (database.ts = entree + alias maintenus main)
# Nouveau changement de schema :
npx supabase migration new <nom>   # cree supabase/migrations/<ts>_<nom>.sql
```

## Regles absolues

1. **Multi-tenant jour 0** : RLS active sur CHAQUE table, filtre par `organization_id`
2. **Defense in depth** : le code filtre AUSSI par `organization_id` dans chaque requete
3. **Montants en centimes** : TOUJOURS integer (jamais de float pour l'argent)
4. **FK strictes** : relations N:M via tables de jointure (JAMAIS d'arrays bigint[])
5. **Liens polymorphes** : `(entity_type, entity_id)` pour notes, taches, documents, activites
6. **Etats de cycle de vie** : enum PostgreSQL pour les statuts (draft, validated, sent, signed, etc.)
7. **Config dynamique** : singleton JSONB `tenant_config` pour pipeline stages, tags, prefixes
8. **Pas de .single()** : utiliser `.execute()` + verification explicite (pattern Vault)
9. **Secrets dans .env** : JAMAIS en dur dans le code
10. **Taille max** : 200 lignes par fichier service, 150 lignes par composant React. Cible, pas dogme : tolerance ~+20% quand decouper fragmenterait une unite coherente (driver d'integration, machine a etats). Decouper d'abord les vraies coutures (lectures/mutations, sous-domaines), pas pour le simple compte de lignes.

## Conventions

- **Tables** : plural snake_case (`contacts`, `deal_notes`)
- **Colonnes** : snake_case (`first_name`, `organization_id`)
- **Types TS** : PascalCase (`Contact`, `DealStatus`)
- **Composants** : PascalCase (`ContactCard.tsx`)
- **Hooks** : camelCase avec prefix `use` (`useContacts`)
- **Services** : camelCase (`contactService.ts`)
- **Schemas Zod** : camelCase avec suffix `Schema` (`contactSchema`)
- **Commits** : conventionnels (`feat(crm):`, `fix(quotes):`, `refactor(pipeline):`)
- **Code** : anglais partout (pas de melange FR/EN)
- **Commentaires** : francais

## Documentation architecture

Les fichiers `blueprint/` contiennent les decisions d'architecture :

- `01-product-core.md` — positionnement, noyau, principes
- `02-domain-model.md` — entites, relations, etats, evenements
- `03-workflows.md` — workflows V1, automations, validations
- `04-architecture.md` — stack, couches, modules, strategies
- `05-anti-patterns.md` — erreurs a eviter
- `06-reading-notes.md` — quand relire les repos de reference

Les fichiers `analysis/` contiennent les analyses des CRM open-source de reference.

## Deploy

- **Frontend + API** : Vercel (auto-deploy depuis main)
- **Database** : Supabase (managed)
- Workflow : `/validate` → `/review` → commit conventionnel + push → Vercel auto-deploy

## Workflow de session

```
/spec        → Specifier avant de coder (specs/todo/)
/planning    → Decouper en taches verifiables
/build       → Implementer incrementalement
/validate    → Lint + typecheck + tests
/test-suite  → Tests avec couverture
/db-status   → Etat de la base Supabase et migrations
/review      → Revue de code 5 axes
/ship        → Checklist pre-lancement
```

> Commandes : `db-status`, `test-suite`, `validate` (projet, `.claude/commands/`) ;
> `build`, `code-simplify`, `planning`, `review`, `ship`, `spec`, `test`, `webperf`
> (globales, `~/.claude/commands/`). Commit/push restent manuels (pas de commande dediee).
