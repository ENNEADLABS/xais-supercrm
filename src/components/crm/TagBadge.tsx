"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/types/database";

interface TagBadgeProps {
  tag: Tag;
  onRemove?: (tagId: string) => void;
}

/**
 * Affiche un tag sous forme de badge coloré.
 * Si onRemove est fourni, un bouton de suppression apparaît.
 */
export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <Badge
      className="gap-1 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(tag.id)}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
          aria-label={`Retirer le tag ${tag.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </Badge>
  );
}
