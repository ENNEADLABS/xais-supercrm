"use client";

import { Loader2 } from "lucide-react";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { useActivities } from "@/lib/hooks/useActivities";

interface ContentActivityProps {
  contentPieceId: string;
}

/**
 * Onglet activite d'un contenu : journal des mutations.
 */
export function ContentActivity({ contentPieceId }: ContentActivityProps) {
  const { data: activities, isLoading } = useActivities("content_piece", contentPieceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ActivityTimeline activities={activities ?? []} />;
}
