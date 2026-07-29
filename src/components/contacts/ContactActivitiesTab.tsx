"use client";

import { Loader2 } from "lucide-react";

import { ActivityTimeline } from "@/components/crm";
import { useActivities } from "@/lib/hooks/useActivities";

interface ContactActivitiesTabProps {
  contactId: string;
}

/**
 * Onglet Activité : timeline des événements du contact.
 */
export function ContactActivitiesTab({ contactId }: ContactActivitiesTabProps) {
  const { data: activities, isLoading } = useActivities("contact", contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ActivityTimeline activities={activities ?? []} />;
}
