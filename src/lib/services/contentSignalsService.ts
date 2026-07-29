import type { ContentPiece, ContentAsset, ContentChecklistItem, Task } from "@/types/database";

// Signaux opérationnels « computés » (spec 022) : dérivés, zéro schéma.
// Service PUR (aucune I/O) → testable par table de cas, comme un agrégateur.
// Seuils figés en dur, documentés dans la spec (section « Signaux opérationnels »).

export const CHECKLIST_STALL_DAYS = 7;
export const REVIEW_MAX_DAYS = 3;

const DAY_MS = 86_400_000;

export type ContentSignalType =
  | "content_overdue"
  | "task_overdue"
  | "checklist_stalled"
  | "review_too_long"
  | "missing_final_asset";

export interface ContentSignal {
  type: ContentSignalType;
  label: string;
  severity: "warning" | "danger";
}

export interface SignalInputs {
  assets: ContentAsset[];
  checklistItems: ContentChecklistItem[];
  tasks: Task[];
  now: Date;
}

function isOlderThan(iso: string, now: Date, days: number): boolean {
  return now.getTime() - new Date(iso).getTime() > days * DAY_MS;
}

/**
 * Calcule les signaux d'une pièce à partir d'un instantané de ses données.
 * `now` est injecté pour rester pur (pas d'appel à Date.now() interne).
 */
export function computeSignals(piece: ContentPiece, inputs: SignalInputs): ContentSignal[] {
  const { assets, checklistItems, tasks, now } = inputs;
  const signals: ContentSignal[] = [];
  const status = piece.status;
  const terminal = status === "published" || status === "archived";
  const today = now.toISOString().slice(0, 10);

  // En retard : date de publication dépassée et contenu non terminé.
  if (!terminal && piece.scheduled_date && piece.scheduled_date < today) {
    signals.push({ type: "content_overdue", label: "En retard", severity: "danger" });
  }

  // Tâche liée en retard (échéance passée, ni faite ni annulée).
  const hasOverdueTask = tasks.some(
    (t) =>
      t.due_date != null &&
      new Date(t.due_date).getTime() < now.getTime() &&
      t.status !== "done" &&
      t.status !== "cancelled",
  );
  if (!terminal && hasOverdueTask) {
    signals.push({ type: "task_overdue", label: "Tâche en retard", severity: "warning" });
  }

  // Checklist au point mort : items incomplets, aucune progression depuis 7 j.
  if (!terminal && checklistItems.length > 0 && !checklistItems.every((i) => i.is_done)) {
    const lastTouch = Math.max(
      ...checklistItems.map((i) => new Date(i.done_at ?? i.updated_at).getTime()),
    );
    if (now.getTime() - lastTouch > CHECKLIST_STALL_DAYS * DAY_MS) {
      signals.push({
        type: "checklist_stalled",
        label: "Checklist au point mort",
        severity: "warning",
      });
    }
  }

  // En relecture trop longue : statut review, non validé, > 3 j.
  // Proxy de l'entrée en review : updated_at (faute d'historique de statut).
  if (
    status === "review" &&
    !piece.validated_at &&
    isOlderThan(piece.updated_at, now, REVIEW_MAX_DAYS)
  ) {
    signals.push({
      type: "review_too_long",
      label: "En relecture depuis plus de 3 jours",
      severity: "warning",
    });
  }

  // Asset final attendu manquant (à partir de review uniquement, jamais en editing).
  const hasFinal = (role: ContentAsset["role"]) =>
    assets.some((a) => a.is_final && a.role === role);
  if (status === "review" && !hasFinal("final_video")) {
    signals.push({
      type: "missing_final_asset",
      label: "Vidéo finale manquante",
      severity: "warning",
    });
  } else if (status === "scheduled" && !hasFinal("thumbnail")) {
    signals.push({
      type: "missing_final_asset",
      label: "Miniature finale manquante",
      severity: "warning",
    });
  } else if (status === "published" && !piece.published_url) {
    signals.push({
      type: "missing_final_asset",
      label: "URL de publication manquante",
      severity: "warning",
    });
  }

  return signals;
}

/**
 * Sous-ensemble de signaux dérivable des seuls champs de la pièce (board/cockpit,
 * sans charger assets/checklist/tasks). Exclut content_overdue (affiché via la
 * date / la section) et missing_final_asset hors `published` (dépend des assets).
 */
export function boardSignals(piece: ContentPiece, now: Date): ContentSignal[] {
  return computeSignals(piece, { assets: [], checklistItems: [], tasks: [], now }).filter(
    (s) =>
      s.type !== "content_overdue" &&
      (s.type !== "missing_final_asset" || piece.status === "published"),
  );
}
