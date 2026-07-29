import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/types/database";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "À faire", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  done: { label: "Terminée", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-500 line-through" },
};

/**
 * Badge de statut de tache avec couleur contextuelle.
 */
export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
