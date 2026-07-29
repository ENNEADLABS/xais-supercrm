"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useUpdateContentPiece,
  useUnblockPiece,
  useValidatePiece,
} from "@/lib/hooks/useContentPieces";
import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
  PRIORITY_LABELS,
  formatShortDate,
} from "@/lib/utils/contentLabels";
import type { ContentPiece, ContentStatus } from "@/types/database";
import { BlockPieceDialog } from "./BlockPieceDialog";

/**
 * En-tête de la fiche contenu : meta, blocage/validation, sélecteur de statut.
 */
export function ContentDetailHeader({ piece }: { piece: ContentPiece }) {
  const router = useRouter();
  const updatePiece = useUpdateContentPiece();
  const unblockPiece = useUnblockPiece();
  const validatePiece = useValidatePiece();
  const [blockOpen, setBlockOpen] = useState(false);
  const pieceId = piece.id;

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => router.push("/studio/board")}>
        <ArrowLeft className="size-4" />
        Board
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{piece.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="secondary">{CONTENT_FORMAT_LABELS[piece.format]}</Badge>
            <Badge variant="outline">{PRIORITY_LABELS[piece.priority]}</Badge>
            {piece.scheduled_date && (
              <span className="text-muted-foreground">
                📅 {formatShortDate(piece.scheduled_date)}
              </span>
            )}
            {piece.is_blocked && (
              <Badge
                variant="destructive"
                className="gap-1"
                title={piece.blocked_reason ?? undefined}
              >
                <Lock className="size-3" />
                Bloqué
              </Badge>
            )}
            {piece.validated_at && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                <CheckCircle2 className="size-3" />
                Validé
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {piece.status === "review" && !piece.validated_at && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => validatePiece.mutate(pieceId)}
              disabled={validatePiece.isPending}
            >
              <CheckCircle2 className="size-4" />
              Valider
            </Button>
          )}
          {piece.is_blocked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unblockPiece.mutate(pieceId)}
              disabled={unblockPiece.isPending}
            >
              <Lock className="size-4" />
              Débloquer
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setBlockOpen(true)}>
              <ShieldAlert className="size-4" />
              Bloquer
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Statut</span>
          <select
            value={piece.status}
            onChange={(e) =>
              updatePiece.mutate({ pieceId, input: { status: e.target.value as ContentStatus } })
            }
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {CONTENT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CONTENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {piece.summary && <p className="max-w-2xl text-sm text-muted-foreground">{piece.summary}</p>}

      <BlockPieceDialog pieceId={pieceId} open={blockOpen} onOpenChange={setBlockOpen} />
    </div>
  );
}
