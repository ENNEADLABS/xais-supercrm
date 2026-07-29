# 0002 — Montants en centimes (integer), TVA en basis points

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03)
- **Décideurs** : mainteneur du projet

## Contexte

Application financière (devis, factures, paiements, avoirs) avec obligations
légales FR. Les arrondis flottants sur l'argent sont une source classique de bugs
de centimes et d'écarts comptables.

## Options considérées

- **A — `numeric`/`decimal` en base, `number` flottant côté app.** Lisible mais
  expose aux erreurs de flottants et complique les arrondis déterministes.
- **B — Entiers : montants en centimes, taux de TVA en basis points** (2000 = 20 %,
  550 = 5,5 %). Arithmétique exacte, arrondis maîtrisés.

## Décision

**Option B.** Tous les montants sont des `integer` en centimes ; les taux (TVA,
remise) sont en basis points sur 10000. Les **totaux sont calculés par triggers
SQL** (`calculate_*_line_totals`, `recalculate_*_totals`) avec cast `bigint` pour
éviter l'overflow. La conversion €↔centimes ne se fait **que** dans les
formulaires UI (ex. `ProductForm`, `DealForm`, `InvoicePaymentDialog`).

## Conséquences

- Positives : zéro erreur de flottant ; totaux cohérents entre UI, PDF et DB car
  une seule source de calcul (le trigger).
- Négatives / dette acceptée : chaque écran de saisie doit convertir (×100 / ÷100),
  d'où quelques bugs possibles aux frontières (un champ a déjà confondu centimes et
  euros — vigilance requise sur les forms). La logique de calcul vit en SQL, donc
  testée par des **répliques** TS (`tests/services/quoteCalculations.test.ts`) plutôt
  que directement.
- À revisiter si : besoin de devises à 3 décimales (dinar…) — le modèle « centimes »
  devrait être généralisé en « plus petite unité ».
