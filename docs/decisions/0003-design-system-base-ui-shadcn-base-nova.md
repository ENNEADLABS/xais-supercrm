# 0003 — Design system : shadcn `base-nova` sur `@base-ui/react`

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03)
- **Décideurs** : mainteneur du projet

## Contexte

Besoin d'un design system cohérent, accessible, possédé dans le repo (composants
copiés, pas une dépendance opaque), avec Tailwind v4 et React 19.

## Options considérées

- **A — shadcn/ui « classique » sur Radix UI.** L'écosystème le plus répandu.
- **B — shadcn style `base-nova` sur [`@base-ui/react`](https://base-ui.com)**, la
  nouvelle base headless des auteurs de Radix/MUI. Primitives via prop `render`,
  `data-slot`, `useRender`/`mergeProps`.

## Décision

**Option B.** `components.json` fixe `"style": "base-nova"`. Les primitives
`components/ui/*` sont bâties sur `@base-ui/react` (Dialog, Menu, Select, Tabs,
Tooltip, Avatar…) avec le pattern `render={<Button .../>}` pour la composition.

## Conséquences

- Positives : API de composition moderne (`render` plutôt que `asChild`), aligné
  avec la direction long terme de l'écosystème.
- Négatives / dette acceptée : la **majorité des exemples/snippets en ligne ciblent
  Radix** — l'adaptation des patterns (`asChild` → `render`, props de positioner)
  est manuelle. Moins de StackOverflow disponible. Tout contributeur doit connaître
  les conventions `@base-ui/react`.
- À revisiter si : `@base-ui/react` stagne ou diverge trop de shadcn upstream.
