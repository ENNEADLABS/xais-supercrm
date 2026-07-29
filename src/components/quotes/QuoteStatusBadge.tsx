import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/types/database";

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

/** Configuration couleur et label par statut de devis */
const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  draft: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  validated: {
    label: "Valid\u00e9",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sent: {
    label: "Envoy\u00e9",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  signed: {
    label: "Sign\u00e9",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  refused: {
    label: "Refus\u00e9",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Annul\u00e9",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-500",
  },
  invoiced: {
    label: "Factur\u00e9",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
};

/**
 * Badge coloré pour le statut d'un devis.
 */
export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return <Badge className={config.className}>{config.label}</Badge>;
}
