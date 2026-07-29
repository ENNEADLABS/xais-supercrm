import { Badge } from "@/components/ui/badge";

interface EntityStatusBadgeProps {
  status: "active" | "archived";
}

/**
 * Badge de statut actif/archivé avec couleur contextuelle.
 */
export function EntityStatusBadge({ status }: EntityStatusBadgeProps) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Actif
      </Badge>
    );
  }

  return <Badge variant="secondary">Archivé</Badge>;
}
