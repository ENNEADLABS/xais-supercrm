"use client";

import { Loader2 } from "lucide-react";

import { ActivityTimeline } from "@/components/crm";
import { useActivities } from "@/lib/hooks/useActivities";

interface InvoiceActivitiesTabProps {
  invoiceId: string;
}

/**
 * Onglet Activit\u00e9 : timeline des \u00e9v\u00e9nements de la facture.
 */
export function InvoiceActivitiesTab({ invoiceId }: InvoiceActivitiesTabProps) {
  const { data: activities, isLoading } = useActivities("invoice", invoiceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ActivityTimeline activities={activities ?? []} />;
}
