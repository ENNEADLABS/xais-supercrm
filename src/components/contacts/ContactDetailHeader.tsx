import { Archive, Edit2, Merge, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityStatusBadge } from "@/components/crm";
import type { EntityStatus } from "@/types/database";

interface ContactDetailHeaderProps {
  contact: {
    first_name: string;
    last_name: string;
    job_title: string | null;
    avatar_url: string | null;
    status: EntityStatus;
  };
  onEdit: () => void;
  onArchive: () => void;
  onMerge: () => void;
}

/** En-tete de la fiche contact : avatar, nom, statut et menu d'actions. */
export function ContactDetailHeader({
  contact,
  onEdit,
  onArchive,
  onMerge,
}: ContactDetailHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage src={contact.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">
            {contact.first_name[0]}
            {contact.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {contact.first_name} {contact.last_name}
          </h1>
          {contact.job_title && <p className="text-muted-foreground">{contact.job_title}</p>}
          <div className="mt-1 flex items-center gap-2">
            <EntityStatusBadge status={contact.status} />
          </div>
        </div>
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
          <DropdownMenuItem onClick={onArchive} disabled={contact.status === "archived"}>
            <Archive className="size-4" />
            Archiver
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMerge}>
            <Merge className="size-4" />
            Fusionner avec...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
