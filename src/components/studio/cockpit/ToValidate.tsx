"use client";

import { CheckCircle2 } from "lucide-react";
import type { BoardPiece } from "@/types/database";
import { CockpitSection } from "./CockpitSection";

/** Contenus en relecture, en attente de validation. */
export function ToValidate({ items }: { items: BoardPiece[] }) {
  return (
    <CockpitSection
      title="À valider"
      icon={CheckCircle2}
      items={items}
      emptyLabel="Rien à valider."
    />
  );
}
