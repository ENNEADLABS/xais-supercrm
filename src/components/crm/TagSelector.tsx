"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EntityType, Tag } from "@/types/database";

import { TagBadge } from "./TagBadge";

interface TagSelectorProps {
  entityType: EntityType;
  assignedTagIds: string[];
  availableTags: Tag[];
  onAssign: (tagId: string) => void;
  onRemove: (tagId: string) => void;
}

/**
 * Sélecteur de tags : affiche les tags assignés avec suppression
 * et un dropdown pour en ajouter de nouveaux.
 */
export function TagSelector({
  entityType,
  assignedTagIds,
  availableTags,
  onAssign,
  onRemove,
}: TagSelectorProps) {
  // Filtrer les tags par type d'entité
  const entityTags = availableTags.filter((tag) => tag.entity_type === entityType);
  const assignedTags = entityTags.filter((tag) => assignedTagIds.includes(tag.id));
  const unassignedTags = entityTags.filter((tag) => !assignedTagIds.includes(tag.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assignedTags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} onRemove={onRemove} />
      ))}

      {unassignedTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 rounded-full p-0"
                aria-label="Ajouter un tag"
              />
            }
          >
            <Plus className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {unassignedTags.map((tag) => (
              <DropdownMenuItem key={tag.id} onClick={() => onAssign(tag.id)}>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
