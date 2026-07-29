import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/types/database";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

/** Configuration couleur et label par statut de facture */
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  validated: {
    label: "Validée",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sent: {
    label: "Envoyée",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  paid: {
    label: "Payée",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  partial: {
    label: "Partielle",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  overdue: {
    label: "En retard",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Annulée",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-500",
  },
};

/**
 * Badge coloré pour le statut d'une facture.
 */
export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return <Badge className={config.className}>{config.label}</Badge>;
}
