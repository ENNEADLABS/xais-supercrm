# Contribuer

Merci de vouloir améliorer ce snapshot pédagogique. Le dépôt n'est pas un produit
activement exploité et aucune disponibilité de support n'est garantie, mais les
contributions ciblées et documentées sont bienvenues.

## Avant de commencer

1. Suis le démarrage rapide du [`README.md`](README.md).
2. Crée une branche courte depuis `main` ; les pushes directs sur `main` sont bloqués.
3. Garde chaque changement focalisé et ajoute un test lorsqu'il modifie un comportement.

## Vérifications locales

```bash
pnpm run check
```

Ajoute les vérifications adaptées au périmètre :

```bash
pnpm run test:coverage     # rendre les zones non testées visibles
pnpm run test:integration  # obligatoire pour Supabase, migrations, RLS et triggers
pnpm run build             # obligatoire pour les changements Next.js ou de configuration
```

## Pull requests

Une pull request vers `main` doit expliquer le problème, la solution et les commandes
de vérification exécutées. GitHub exige les checks `Secret scan`, `build` et
`integration`, ainsi que la résolution des conversations avant fusion.

Ne committe jamais de `.env.local`, clé API, donnée personnelle ou contenu provenant
d'un environnement privé. Pour une vulnérabilité, utilise la procédure privée décrite
dans [`.github/SECURITY.md`](.github/SECURITY.md), pas une issue publique.

## Sources de vérité

- comportement et structure actuels : code, tests et [`docs/layout.md`](docs/layout.md) ;
- décisions durables : [`docs/decisions/`](docs/decisions/) ;
- schéma de base de données : `supabase/migrations/` ;
- `blueprint/` et `analysis/` : recherches historiques, non contractuelles.
