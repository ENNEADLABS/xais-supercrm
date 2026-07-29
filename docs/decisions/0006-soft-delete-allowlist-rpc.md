# 0006 — Soft-delete générique par allowlist + RPC

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-04)
- **Décideurs** : mainteneur du projet

## Contexte

Les utilisateurs doivent pouvoir supprimer puis **restaurer** (corbeille), et
certaines entités (factures validées) ne doivent **jamais** être supprimées
définitivement (obligation légale FR). Il faut un mécanisme uniforme et sûr.

## Options considérées

- **A — Hard delete partout** + confirmation UI. Irréversible, incompatible avec
  l'obligation légale sur les factures.
- **B — Soft-delete générique** : colonne `deleted_at` sur les tables concernées,
  filtrée par défaut ; corbeille admin ; restauration et purge via RPC.

## Décision

**Option B.** Une **allowlist** explicite des tables soft-deletables
(`contacts, companies, deals, products, quotes, invoices, notes`) définie à la
fois en TS (`lib/supabase/softDelete.ts`) et en SQL (fonctions `soft_delete` /
`restore_soft_deleted`, SECURITY DEFINER). Les policies RLS exposent les lignes
soft-deleted **aux admins uniquement** (corbeille). Le hard delete des factures
est bloqué par policy (statut `draft` non-avoir uniquement). La restauration est
réservée aux admins.

## Conséquences

- Positives : corbeille + restauration uniformes ; conformité légale FR sur les
  factures ; purge contrôlée (admin, ligne déjà en corbeille).
- Négatives / dette acceptée : l'allowlist est **dupliquée** TS/SQL — à garder
  synchronisée à la main. Toutes les requêtes de lecture doivent penser à filtrer
  `deleted_at IS NULL` (la RLS aide mais le code re-filtre).
- À revisiter si : besoin d'une rétention/purge automatique (RGPD) ou d'un
  soft-delete sur d'autres entités.
