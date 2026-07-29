# Architecture Decision Records (ADR)

Décisions d'architecture durables, au format [MADR](https://adr.github.io/madr/)
allégé : **Contexte / Options considérées / Décision / Conséquences**.

Ces ADR capturent le *pourquoi daté* des choix structurants. Le *quoi* (vision
produit, modèle de domaine) vit dans [`../../blueprint/`](../../blueprint/) ; la
*carte du code* dans [`../layout.md`](../layout.md).

> Les ADR 0001–0007 ont été **documentés rétroactivement le 2026-06-13** : les
> décisions ont été prises pendant la construction initiale (mars–avril 2026) et
> sont reconstituées à partir du code et des handoffs.

## Index

| #    | Titre                                                          | Statut   |
| ---- | -------------------------------------------------------------- | -------- |
| 0001 | Schéma SQL unique, sans migrations incrémentales (V1)          | Remplacé (0009) |
| 0002 | Montants en centimes, TVA en basis points                     | Accepté  |
| 0003 | Design system : shadcn `base-nova` sur `@base-ui/react`        | Accepté  |
| 0004 | Paiements : table dédiée + recalcul par trigger               | Accepté  |
| 0005 | Accès données : defense in depth + pas de `.single()`         | Accepté  |
| 0006 | Soft-delete générique par allowlist + RPC                     | Accepté  |
| 0007 | Emails : drivers Strategy, Gmail d'abord, Microsoft/IMAP stubs| Accepté  |
| 0008 | Stratégie de tests RLS / isolation multi-tenant (Vitest+JWT)   | Accepté  |
| 0009 | Bascule vers `supabase/migrations/` (source de vérité)         | Accepté  |
| 0010 | Content Studio : modèle d'intégration hybride CRM + éditorial  | Accepté  |

## Créer un nouvel ADR

Copier [`_template.md`](_template.md) → `NNNN-titre-en-kebab.md`, incrémenter le
numéro, remplir, et ajouter une ligne à l'index ci-dessus.

Une décision structurante (archi, process, outillage, choix techno difficilement
réversible) **doit** donner lieu à un ADR avant d'être considérée comme actée.
