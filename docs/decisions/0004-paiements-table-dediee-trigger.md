# 0004 — Paiements : table dédiée + recalcul par trigger

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03)
- **Décideurs** : mainteneur du projet

## Contexte

Une facture peut être réglée en plusieurs fois (acompte, solde), par différents
moyens. Il faut tracer chaque paiement individuellement **et** maintenir un état
agrégé fiable (`paid_amount`, statut `partial`/`paid`) sans dérive possible entre
les deux.

## Options considérées

- **A — Champs `paid_amount`/`paid_at` mis à jour applicativement** à chaque
  paiement. Simple mais fragile : tout chemin oubliant la mise à jour désynchronise.
- **B — Table `payments` dédiée + trigger SQL** qui recalcule `paid_amount` et le
  statut de la facture à chaque insert/update/delete de paiement.

## Décision

**Option B.** Une table `payments` (montant, date, méthode, référence, notes) et
le trigger `recalculate_invoice_paid` (SECURITY DEFINER) qui, à chaque mutation,
recalcule `SUM(payments.amount)` → `invoices.paid_amount` et fait transitionner le
statut (`sent`/`partial`/`overdue` → `partial`/`paid`). L'ancienne fonction
applicative `recordPayment()` a été supprimée au profit de ce mécanisme.

## Conséquences

- Positives : impossible de désynchroniser le montant payé et l'historique ;
  suppression d'un paiement recalcule automatiquement ; historique complet pour
  l'audit et le DSO. Le service vérifie en amont que le montant ne dépasse pas le
  reste à payer.
- Négatives / dette acceptée : logique métier en SQL (moins visible, testée par
  réplique TS `tests/services/invoicePaymentLogic.test.ts`). Le trigger ne fait pas
  *redescendre* un statut `paid` si on supprime un paiement (choix conservateur).
- À revisiter si : besoin de paiements multi-factures (lettrage) ou de devises
  multiples sur une même facture.
