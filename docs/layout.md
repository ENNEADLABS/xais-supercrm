# Carte du repo (layout)

Index de navigation : où vit quoi, et comment les couches s'enchaînent. À lire
avant de toucher au code. Pour le *pourquoi* des choix → [`decisions/`](decisions/).

---

## 1. Le flux de données (canonique)

Tout passe par la même chaîne, du haut vers le bas. Aucune couche ne saute une étape.

```
app/(app)/<domaine>/page.tsx          RSC mince : await params → rend un composant
        │
components/<domaine>/<X>Page|Detail|Form.tsx   "use client" : UI + état local
        │
lib/hooks/use<X>.ts                   useQuery/useMutation + toast + invalidation
        │
lib/actions/<domaine>.ts              "use server" : auth → Zod.parse → revalidatePath
        │
lib/services/<domaine>Service.ts      logique métier, filtre organization_id
        │
lib/supabase/server.ts → Postgres     RLS (get_user_org_id) + triggers SQL
```

**Règle de lecture** : pour comprendre une feature, lis dans cet ordre — page →
composant → hook → action → service → (schema SQL si besoin).

---

## 2. Matrice domaine × couche

Chaque domaine métier suit le même gabarit. Colonnes = couches, lignes = domaines.

| Domaine     | Page route                 | Composants                          | Hook                  | Action                | Service                                  |
| ----------- | -------------------------- | ----------------------------------- | --------------------- | --------------------- | ---------------------------------------- |
| Contacts    | `app/(app)/contacts/`      | `components/contacts/`              | `useContacts`         | `actions/contact`     | `contactService`, `contactChannelService`, `duplicateDetectionService` |
| Sociétés    | `app/(app)/companies/`     | `components/companies/`            | `useCompanies`        | `actions/company`     | `companyService`                         |
| Deals       | `app/(app)/deals/`, `/pipeline/` | `components/deals/`, `components/pipeline/` | `useDeals`     | `actions/deal`        | `dealService`, `dealLifecycleService`    |
| Devis       | `app/(app)/quotes/`        | `components/quotes/`              | `useQuotes`, `useQuoteLines` | `actions/quote` | `quoteService`, `quoteLifecycleService`, `quoteLineService` |
| Factures    | `app/(app)/invoices/`      | `components/invoices/`            | `useInvoices`, `useInvoiceLines`, `usePayments` | `actions/invoice`, `actions/payment` | `invoiceService`, `invoiceLifecycleService`, `invoiceLineService`, `paymentService`, `quoteToInvoiceService` |
| Produits    | `app/(app)/products/`      | `components/products/`            | `useProducts`         | `actions/product`     | `productService`                         |
| Emails      | `app/(app)/emails/`        | `components/emails/`              | `useEmails`, `useConnectedAccounts` | `actions/email` | `emailService`, `emailSendService`, `emailMatchingService`, `connectedAccountService`, `email-sync/*` |
| Tâches      | `app/(app)/tasks/`         | `components/tasks/`              | `useTasks`            | `actions/task`        | `taskService`                            |
| Documents   | `app/(app)/documents/`     | `components/documents/`, `crm/DocumentList` | `useDocuments` | `actions/document`    | `documentService`                        |
| Dashboard   | `app/(app)/dashboard/`     | `components/dashboard/`          | `useDashboard`        | `actions/dashboard`   | `dashboardService`, `dashboard/*`        |
| Content Studio | `app/(app)/studio/`     | `components/studio/`             | `useContent*`, `useDeliverables` | `actions/content` | `content*Service`, `deliverableService` |
| Settings    | `app/(app)/settings/`      | `components/settings/`           | `useTenantConfig`, `useMembers`, `useOrganization`, `useTrash` | `actions/settings`, `actions/tenantConfig`, `actions/trash` | `tenantConfigService`, `memberService`, `organizationService`, `trashService` |
| Onboarding  | `app/(onboarding)/onboarding/` | `components/onboarding/`      | —                     | `actions/settings`    | `tenantConfigService`                    |
| Recherche   | (palette globale)          | `components/search/CommandPalette`  | `useGlobalSearch`     | `actions/search`      | `searchService`                          |
| CSV         | (dialogs intégrés)         | `components/csv/`                | —                     | `actions/csv` + `app/api/import` | `csvService`                    |

Transverses (sans page propre) : `notes`, `tags`, `activities` → `noteService`,
`tagService`, `activityService` (liens polymorphes `(entity_type, entity_id)`).

---

## 3. Fichiers transverses clés

| Fichier                                  | Rôle                                                           |
| ---------------------------------------- | ------------------------------------------------------------- |
| `src/proxy.ts`                           | Middleware Next 16 : auth (redirect) + rate limiting          |
| `src/lib/actions/helpers.ts`             | `getAuthContext` / `requireMember` / `requireAdmin`           |
| `src/lib/supabase/{server,client,middleware}.ts` | Clients Supabase (SSR / browser / middleware)        |
| `src/lib/supabase/softDelete.ts`         | Helper soft-delete + allowlist des tables soft-deletables     |
| `src/lib/services/activityService.ts`    | Journal d'activité appelé par les mutations métier principales |
| `src/lib/services/tenantConfigService.ts`| Config JSONB par tenant (pipeline, prefixes, TVA, devise)     |
| `src/lib/utils/{format,encryption,rate-limit,sanitize,csv}.ts` | Utilitaires transverses                  |
| `src/types/database.generated.ts`        | Sortie générée par `db:types` — ne pas éditer à la main       |
| `src/types/database.ts`                  | Point d'entrée manuel : ré-export du généré + alias de domaine |
| `src/components/crm/`                    | Briques UI réutilisées par tous les domaines (NoteList, ActivityTimeline, TagSelector, EmptyState, DocumentList…) |
| `src/components/ui/`                     | Primitives shadcn/ui (`base-nova` / `@base-ui/react`)         |

---

## 4. Base de données (`supabase/`)

- `migrations/` — **source de vérité** (baseline + incrémentales, ADR-0009).
  Appliquées dans l'ordre par `pnpm db:reset` (= `supabase db reset`).
- `schema.sql` — dump régénéré du schéma `public` (`pnpm db:dump`), **lecture seule**
  (tables, enums, triggers, RPC, policies RLS). Ne jamais éditer à la main.
- `seed.sql` — données de démo (org « Demo SARL »).
- `templates/` — emails Supabase Auth (confirmation, reset, invite…).

**Logique critique vivant en SQL** (pas en TS) :
- Triggers de calcul des totaux lignes/devis/factures.
- Trigger de recalcul `paid_amount` + statut facture sur insert/delete de paiement.
- RPC transactionnelles : `convert_quote_to_invoice`, `cancel_invoice_with_credit_note`,
  `merge_contacts`, `soft_delete` / `restore_soft_deleted`.
- Séquences sans trou : `generate_quote_reference`, `generate_invoice_reference`.

---

## 5. Sous-systèmes notables

- **Email sync** (`lib/services/email-sync/`) : pattern Strategy par provider.
  `gmail-driver` complet ; `microsoft-driver` et `imap-driver` sont des **stubs V2**
  (lèvent `ProviderNotAvailableError`). `syncOrchestrator` pilote le fetch + dédup
  par `message_id`. Credentials chiffrés AES-256-GCM (`utils/encryption`).
- **PDF** (`lib/pdf/` + `services/pdfService`) : composants `@react-pdf/renderer`
  assemblés dans `PdfDocument`, rendus en buffer via les routes `app/api/*/pdf`.
- **Dashboard** (`lib/services/dashboard/`) : `dashboardService` (stats temps réel)
  + `trendQueries` (séries temporelles par période) + helpers de dates.
- **API bot** (`app/api/v1/` + `lib/utils/apiAuth`) : surface expérimentale
  authentifiée par clé, isolée par tenant. Contrat et exemples dans
  [`api-v1.md`](api-v1.md).

---

## 6. Méta / outillage

| Dossier            | Contenu                                                        |
| ------------------ | ------------------------------------------------------------- |
| `blueprint/`       | Intentions et recherches historiques — non canoniques        |
| `docs/decisions/`  | ADR (MADR) — le *pourquoi* daté                              |
| `analysis/`        | Analyses historiques de CRM open source — non canoniques     |
| `reference-crm/`   | Repos CRM clonés (gitignoré, hors repo)                      |
