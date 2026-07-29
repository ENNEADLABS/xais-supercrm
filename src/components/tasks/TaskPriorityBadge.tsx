import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/types/database";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-gray-100 text-gray-600" },
  medium: { label: "Moyenne", className: "bg-yellow-100 text-yellow-700" },
  high: { label: "Haute", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

/**
 * Badge de priorite de tache avec couleur contextuelle.
 */
export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority];
  return <Badge className={config.className}>{config.label}</Badge>;
}
