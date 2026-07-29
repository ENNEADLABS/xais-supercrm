import { useMemo } from "react";
import { useBoardPieces } from "./useContentPieces";
import type { BoardPiece } from "@/types/database";

// Données opérationnelles du cockpit, dérivées d'une SEULE lecture (le board).
// Listes simples filtrées par champ de pièce — pas de dashboard à graphes.

export interface CockpitGroups {
  thisWeek: BoardPiece[]; // à produire cette semaine (par scheduled_date)
  toValidate: BoardPiece[]; // status = review
  blocked: BoardPiece[]; // flag manuel
  overdue: BoardPiece[]; // scheduled_date passée, non terminé
  isLoading: boolean;
}

const isTerminal = (p: BoardPiece) => p.status === "published" || p.status === "archived";

// Bornes ISO (lundi → dimanche) de la semaine contenant `now`, en YYYY-MM-DD.
function weekBounds(now: Date): [string, string] {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // 0 = lundi
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - offset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

export function useContentSignals(): CockpitGroups {
  const { data, isLoading } = useBoardPieces();

  return useMemo(() => {
    const pieces = data ?? [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const [, weekEnd] = weekBounds(now);

    return {
      isLoading,
      // À produire cette semaine : exclut le passé (déjà couvert par « en retard »).
      thisWeek: pieces.filter(
        (p) =>
          p.scheduled_date != null &&
          p.scheduled_date >= today &&
          p.scheduled_date <= weekEnd &&
          !isTerminal(p),
      ),
      toValidate: pieces.filter((p) => p.status === "review"),
      blocked: pieces.filter((p) => p.is_blocked),
      overdue: pieces.filter(
        (p) => p.scheduled_date != null && p.scheduled_date < today && !isTerminal(p),
      ),
    };
  }, [data, isLoading]);
}
