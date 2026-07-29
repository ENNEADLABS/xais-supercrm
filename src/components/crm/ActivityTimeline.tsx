import {
  Plus,
  Edit2,
  Archive,
  MessageSquare,
  Trash2,
  RefreshCw,
  Tag,
  type LucideIcon,
} from "lucide-react";

import type { Activity } from "@/types/database";

import { formatRelativeDate } from "./utils/format-date";

interface ActivityTimelineProps {
  activities: Activity[];
}

/** Traduction des actions en labels français */
const ACTION_LABELS: Record<string, string> = {
  created: "Créé",
  updated: "Modifié",
  archived: "Archivé",
  note_added: "Note ajoutée",
  note_deleted: "Note supprimée",
  status_changed: "Statut modifié",
  tag_added: "Tag ajouté",
  tag_removed: "Tag retiré",
};

/** Icône par type d'action */
const ACTION_ICONS: Record<string, LucideIcon> = {
  created: Plus,
  updated: Edit2,
  archived: Archive,
  note_added: MessageSquare,
  note_deleted: Trash2,
  status_changed: RefreshCw,
  tag_added: Tag,
  tag_removed: Tag,
};

/**
 * Timeline verticale d'activités, triée chronologiquement.
 * Chaque entrée affiche une icône, le label d'action, la date relative
 * et l'acteur (tronqué).
 */
export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune activité.</p>;
  }

  return (
    <div className="relative space-y-0">
      {activities.map((activity, index) => {
        const Icon = ACTION_ICONS[activity.action] ?? Edit2;
        const label = ACTION_LABELS[activity.action] ?? activity.action;
        const isLast = index === activities.length - 1;
        const metadata = activity.metadata as Record<string, string>;

        return (
          <div key={activity.id} className="relative flex gap-3 pb-6">
            {/* Ligne verticale */}
            {!isLast && <div className="absolute left-[11px] top-6 h-full w-px bg-border" />}

            {/* Point + icône */}
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3 text-muted-foreground" />
            </div>

            {/* Contenu */}
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium">{label}</p>

              {/* Détail des métadonnées (ex: changement de statut) */}
              {metadata?.from && metadata?.to && (
                <p className="text-xs text-muted-foreground">
                  {metadata.from} → {metadata.to}
                </p>
              )}

              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRelativeDate(activity.created_at)}
                {activity.actor_id && <> &middot; {activity.actor_id.slice(0, 8)}</>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
