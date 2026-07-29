import Link from "next/link";
import {
  User,
  Building2,
  Handshake,
  FileText,
  Receipt,
  Edit2,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/components/crm/utils/format-date";

interface ActivityItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

/** Icône par type d'entité */
const ENTITY_ICONS: Record<string, LucideIcon> = {
  contact: User,
  company: Building2,
  deal: Handshake,
  quote: FileText,
  invoice: Receipt,
};

/** Labels d'action en français */
const ACTION_LABELS: Record<string, string> = {
  created: "Créé",
  updated: "Modifié",
  archived: "Archivé",
  status_changed: "Statut modifié",
  note_added: "Note ajoutée",
};

/** Construit l'URL vers l'entité */
function entityUrl(type: string, id: string): string {
  const routes: Record<string, string> = {
    contact: "contacts",
    company: "companies",
    deal: "deals",
    quote: "quotes",
    invoice: "invoices",
  };
  return `/${routes[type] ?? type}/${id}`;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
        ) : (
          <div className="relative space-y-0">
            {activities.map((activity, index) => {
              const Icon = ENTITY_ICONS[activity.entity_type] ?? Edit2;
              const label = ACTION_LABELS[activity.action] ?? activity.action;
              const isLast = index === activities.length - 1;

              return (
                <div key={activity.id} className="relative flex gap-3 pb-5">
                  {!isLast && <div className="absolute left-[11px] top-6 h-full w-px bg-border" />}
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <Link
                      href={entityUrl(activity.entity_type, activity.entity_id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {label} ({activity.entity_type})
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
