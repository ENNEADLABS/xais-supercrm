import Link from "next/link";
import { Building2, Edit2, MoreHorizontal, Trophy, XCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "./utils";

interface DealDetailHeaderProps {
  deal: {
    name: string;
    stage: string;
    deal_status: string;
    probability: number | null;
    amount: number | null;
  };
  currentStage?: { color: string; label: string };
  company?: { id: string; name: string };
  isOpen: boolean;
  onEdit: () => void;
  onWin: () => void;
  onLose: () => void;
  onReopen: () => void;
}

/** En-tete de la fiche deal : titre, badges, societe, montant et menu d'actions. */
export function DealDetailHeader({
  deal,
  currentStage,
  company,
  isOpen,
  onEdit,
  onWin,
  onLose,
  onReopen,
}: DealDetailHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{deal.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge style={{ backgroundColor: currentStage?.color ?? "#6b7280", color: "#fff" }}>
            {currentStage?.label ?? deal.stage}
          </Badge>
          <DealStatusBadge status={deal.deal_status} />
          {deal.probability != null && <Badge variant="outline">{deal.probability}%</Badge>}
        </div>
        {company && (
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Building2 className="size-3.5" />
            {company.name}
          </Link>
        )}
        {deal.amount != null && (
          <p className="text-lg font-semibold">{formatCurrency(deal.amount)}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="size-4" />
            Modifier
          </DropdownMenuItem>
          {isOpen && (
            <DropdownMenuItem onClick={onWin}>
              <Trophy className="size-4" />
              Gagné
            </DropdownMenuItem>
          )}
          {isOpen && (
            <DropdownMenuItem onClick={onLose}>
              <XCircle className="size-4" />
              Perdu
            </DropdownMenuItem>
          )}
          {!isOpen && (
            <DropdownMenuItem onClick={onReopen}>
              <RotateCcw className="size-4" />
              Réouvrir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Badge de statut open/won/lost */
function DealStatusBadge({ status }: { status: string }) {
  if (status === "won") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Gagné
      </Badge>
    );
  }
  if (status === "lost") {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Perdu</Badge>
    );
  }
  return <Badge variant="secondary">Ouvert</Badge>;
}
