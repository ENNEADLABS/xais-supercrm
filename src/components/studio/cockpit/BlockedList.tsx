"use client";

import { Lock } from "lucide-react";
import type { BoardPiece } from "@/types/database";
import { CockpitSection } from "./CockpitSection";

/** Contenus marqués comme bloqués (flag manuel). */
export function BlockedList({ items }: { items: BoardPiece[] }) {
  return (
    <CockpitSection
      title="Bloqués"
      icon={Lock}
      items={items}
      emptyLabel="Aucun contenu bloqué."
      renderMeta={(p) =>
        p.blocked_reason ? <span className="italic">« {p.blocked_reason} »</span> : null
      }
    />
  );
}
