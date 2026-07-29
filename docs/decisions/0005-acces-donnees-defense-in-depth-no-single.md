# 0005 — Accès données : defense in depth + pas de `.single()`

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03)
- **Décideurs** : mainteneur du projet

## Contexte

Produit multi-tenant : l'isolation par `organization_id` est la garantie #1. La
RLS Supabase la fournit côté base, mais une seule policy manquante ou un client mal
configuré exposerait des données cross-tenant. Par ailleurs, `.single()` lève une
erreur opaque (PGRST116) sur 0 ou >1 ligne, polluant la gestion d'erreurs.

## Options considérées

- **A — Faire confiance à la RLS seule** + utiliser `.single()` partout.
- **B — Defense in depth** : RLS **et** filtre `organization_id` explicite dans
  chaque requête service ; **interdiction de `.single()`** au profit de
  `select()` → vérification explicite de `data.length`.

## Décision

**Option B.** Chaque service prend `organizationId` en paramètre (issu de
`getAuthContext`) et l'ajoute à toutes les requêtes, en plus de la RLS. Aucune
requête n'utilise `.single()` : on récupère un tableau et on vérifie `length`,
retournant `null` ou levant une erreur métier claire. Documenté dans
`.claude/rules/backend-nextjs.md` et `database-supabase.md`.

## Conséquences

- Positives : double barrière contre les fuites cross-tenant ; messages d'erreur
  métier explicites ; comportement déterministe sur 0/N lignes.
- Négatives / dette acceptée : un peu de verbosité (filtre répété, `if (!data ||
  !data.length)`). **Surtout** : la RLS elle-même n'est aujourd'hui couverte par
  **aucun test automatisé** — la garantie #1 du produit repose sur la relecture
  humaine. C'est le risque ouvert majeur (cf. roadmap : suite de tests RLS).
- À revisiter si : introduction de rôles plus fins ou de partage cross-tenant.
