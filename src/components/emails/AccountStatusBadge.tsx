import { Badge } from "@/components/ui/badge";
import type { EmailAccountStatus } from "@/types/email";

interface AccountStatusBadgeProps {
  status: EmailAccountStatus;
}

const statusConfig: Record<EmailAccountStatus, { label: string; className: string }> = {
  connected: { label: "Connecte", className: "bg-green-100 text-green-700" },
  disconnected: { label: "Deconnecte", className: "bg-gray-100 text-gray-600" },
  error: { label: "Erreur", className: "bg-red-100 text-red-700" },
};

/** Badge de statut pour un compte email connecte */
export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
