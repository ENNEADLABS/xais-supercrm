"use client";

import { Loader2 } from "lucide-react";

import { ActivityTimeline } from "@/components/crm";
import { useActivities } from "@/lib/hooks/useActivities";

interface QuoteActivitiesTabProps {
  quoteId: string;
}

/**
 * Onglet Activité : timeline des événements du devis.
 */
export function QuoteActivitiesTab({ quoteId }: QuoteActivitiesTabProps) {
  const { data: activities, isLoading } = useActivities("quote", quoteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ActivityTimeline activities={activities ?? []} />;
}
