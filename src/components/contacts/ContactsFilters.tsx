"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { useTags } from "@/lib/hooks/useTags";
import type { EntityStatus } from "@/types/database";

interface ContactsFiltersProps {
  status: EntityStatus | undefined;
  onStatusChange: (status: EntityStatus | undefined) => void;
  selectedTagIds: string[];
  onTagsChange: (ids: string[]) => void;
}

/**
 * Filtres pour la liste des contacts : statut et tags.
 */
export function ContactsFilters({
  status,
  onStatusChange,
  selectedTagIds,
  onTagsChange,
}: ContactsFiltersProps) {
  const { data: tags } = useTags("contact");
  const contactTags = tags ?? [];

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Filtre par statut */}
      <div className="flex items-center gap-1 rounded-lg border p-0.5">
        <Button
          variant={status === undefined ? "secondary" : "ghost"}
          size="xs"
          onClick={() => onStatusChange(undefined)}
        >
          Tous
        </Button>
        <Button
          variant={status === "active" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => onStatusChange("active")}
        >
          Actifs
        </Button>
        <Button
          variant={status === "archived" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => onStatusChange("archived")}
        >
          Archivés
        </Button>
      </div>

      {/* Filtre par tags */}
      {contactTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Filter className="size-3.5" />
                Tags
                {selectedTagIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {selectedTagIds.length}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent>
            {contactTags.map((tag) => (
              <DropdownMenuItem key={tag.id} onClick={() => toggleTag(tag.id)}>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1">{tag.name}</span>
                {selectedTagIds.includes(tag.id) && <span className="text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
            {selectedTagIds.length > 0 && (
              <DropdownMenuItem onClick={() => onTagsChange([])}>
                Effacer les filtres
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
