"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CONTENT_FORMAT_LABELS } from "@/lib/utils/contentLabels";
import { boardSignals } from "@/lib/services/contentSignalsService";
import type { BoardPiece } from "@/types/database";

interface CockpitSectionProps {
  title: string;
  icon: LucideIcon;
  items: BoardPiece[];
  emptyLabel: string;
  renderMeta?: (piece: BoardPiece) => ReactNode;
}

/**
 * Section générique du cockpit : en-tête (icône + titre + compteur) et liste
 * simple de pièces (lien fiche, format, méta contextuelle, badges signaux).
 */
export function CockpitSection({
  title,
  icon: Icon,
  items,
  emptyLabel,
  renderMeta,
}: CockpitSectionProps) {
  const now = new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((piece) => (
            <div key={piece.id} className="rounded-md border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/studio/content/${piece.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {piece.title}
                </Link>
                {piece.is_blocked && (
                  <Badge
                    variant="destructive"
                    className="shrink-0 gap-1 text-[10px]"
                    title={piece.blocked_reason ?? undefined}
                  >
                    <Lock className="size-3" />
                    Bloqué
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{CONTENT_FORMAT_LABELS[piece.format]}</span>
                {renderMeta?.(piece)}
                {boardSignals(piece, now).map((s) => (
                  <span
                    key={s.type}
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    <AlertTriangle className="size-3" />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
