"use client";

import { Loader2 } from "lucide-react";

import { ActivityTimeline } from "@/components/crm";
import { useActivities } from "@/lib/hooks/useActivities";

interface DealActivitiesTabProps {
  dealId: string;
}

/**
 * Onglet Activité : timeline des événements du deal.
 */
export function DealActivitiesTab({ dealId }: DealActivitiesTabProps) {
  const { data: activities, isLoading } = useActivities("deal", dealId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ActivityTimeline activities={activities ?? []} />;
}
