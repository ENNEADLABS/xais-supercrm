# Guide des améliorations restantes

Ce document décrit **comment** traiter les limites connues du snapshot public. Ce
n'est ni une promesse de maintenance ni une roadmap datée. Avant de commencer,
reproduis les mesures : les versions, alertes et pourcentages ci-dessous reflètent
l'état observé le 31 juillet 2026.

## Ordre conseillé

| Priorité | Axe | Pourquoi |
| --- | --- | --- |
| P1 | Parcours E2E | Les principaux enchaînements utilisateur ne sont pas vérifiés dans un navigateur |
| P1 | Dépendances transitives | Certaines alertes attendent une version compatible des paquets parents |
| P2 | Couverture ciblée | La mesure globale existe, mais de nombreuses frontières métier restent non testées |

Traite un axe par pull request. Chaque PR doit annoncer sa mesure de départ, le gain
obtenu et les commandes exécutées. Ne baisse jamais un seuil ou une exigence CI pour
faire passer une modification.

## 1. Ajouter des parcours E2E

### Méthode

1. Choisir un outil de navigateur maintenu et compatible avec Node 22. Playwright est
   le candidat déjà envisagé dans le blueprint historique, mais sa version et son
   coût doivent être réévalués au moment de l'implémentation.
2. Faire tourner les tests contre la stack Supabase locale réinitialisée, jamais
   contre un environnement partagé. Créer les comptes et organisations de test de
   façon déterministe, puis nettoyer leur état.
3. Ajouter d'abord un seul parcours vertical stable, puis étendre la suite :
   - connexion/onboarding ;
   - contact + société → devis avec produit → signature → facture ;
   - idée Content Studio → contenu → planification/publication.
4. Sélectionner les éléments par rôle et libellé accessibles. Réserver les
   `data-testid` aux éléments impossibles à cibler autrement et bannir les attentes
   temporelles fixes.
5. Conserver trace, capture et vidéo uniquement en cas d'échec. Ajouter ensuite le
   job E2E à la CI avec cache navigateur et délai maximal explicite.

### Critères d'acceptation

- la suite passe localement après `pnpm run db:reset` et sur une machine CI vierge ;
- aucun secret ou identifiant d'environnement privé n'est nécessaire ;
- un échec produit un diagnostic exploitable et ne dépend pas de l'ordre des tests ;
- le README et `CONTRIBUTING.md` documentent la nouvelle commande.

## 2. Augmenter la couverture utile

La référence actuelle est produite par `pnpm run test:coverage` sur tout `src/` :
7,29 % des instructions et 7,70 % des lignes. Le but n'est pas de maximiser un nombre
en testant des détails d'implémentation, mais de protéger les comportements risqués.

### Méthode

1. Générer le rapport et classer les fichiers non couverts par risque :
   authentification/autorisation, transitions métier, calculs financiers, routes API,
   import de fichiers et synchronisation email avant les composants de présentation.
2. Pour chaque comportement, choisir le niveau le moins coûteux qui prouve réellement
   le contrat : test unitaire pour une fonction pure, intégration Supabase pour RLS,
   triggers et RPC, E2E seulement pour un enchaînement navigateur.
3. Ajouter les cas nominal, limite et erreur. Un test doit échouer si le comportement
   protégé régresse ; les snapshots de gros objets ne remplacent pas des assertions
   métier.
4. Une fois un premier lot significatif couvert, ajouter des seuils Vitest modestes
   au niveau global ou par zone critique. Les relever progressivement et ne jamais les
   diminuer pour faire passer une PR.
5. Publier éventuellement le rapport comme artefact CI ; ne pas committer `coverage/`.

### Critères d'acceptation

- chaque nouvelle logique métier arrive avec son test de régression ;
- les frontières critiques ont des tests d'erreur et d'isolation tenant ;
- `pnpm run check`, `pnpm run test:coverage` et, si nécessaire,
  `pnpm run test:integration` passent ;
- le pourcentage global ne régresse pas, sans exclusions artificielles.

## 3. Résorber les alertes transitives

Au 31 juillet 2026, `pnpm audit` remonte sept avis transitifs : Sharp et PostCSS via
Next.js, `brace-expansion` via ESLint, puis `qs` et `body-parser` via le CLI de
développement shadcn. GitHub peut afficher un total différent, car Dependabot et
`pnpm audit` ne regroupent pas toujours les chemins et dépendances de développement
de la même façon.

### Méthode

1. Reproduire l'état avec `pnpm outdated` et `pnpm audit --audit-level low`.
2. Pour chaque avis, identifier le chemin avec `pnpm why <paquet>` et préciser s'il
   touche le runtime, le build ou uniquement un outil de développement.
3. Chercher d'abord une version stable corrigée du **paquet parent** (`next`,
   `eslint`, `shadcn`, etc.) compatible avec Node 22 et ses pairs.
4. Lire les notes de version et mettre à jour un parent à la fois. Éviter les
   `overrides` qui forcent une version hors de la plage déclarée ; n'en utiliser un
   que si le parent confirme explicitement la compatibilité et documenter ce choix.
5. Après chaque mise à jour, exécuter :

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
pnpm run test:integration
pnpm audit --audit-level low
```

6. Vérifier aussi les alertes Dependabot et fermer uniquement celles que le nouveau
   lockfile résout réellement. Si aucun parent compatible n'existe, laisser l'alerte
   visible et consigner l'analyse dans la PR plutôt que de masquer l'avis.

### Critères d'acceptation

- aucune régression fonctionnelle ou de build ;
- le nombre ou la sévérité des alertes diminue réellement ;
- aucune montée de version majeure opportuniste n'est mélangée au correctif ;
- tout risque résiduel mentionne le paquet parent et la raison du report.

## Format d'une contribution

La description de PR peut reprendre ce canevas :

```markdown
## Mesure de départ

## Périmètre traité

## Choix et compromis

## Vérifications exécutées

## Risques ou travaux encore ouverts
```

Consulte également [`CONTRIBUTING.md`](../CONTRIBUTING.md) pour les règles générales
et [`.github/SECURITY.md`](../.github/SECURITY.md) pour signaler une vulnérabilité.
