"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/crm";
import { formatRelativeDate } from "@/components/crm/utils/format-date";
import { useEntityEmails } from "@/lib/hooks/useEmails";
import type { EmailWithParticipants } from "@/types/email";

interface EmailTimelineProps {
  entityType: "contact";
  entityId: string;
}

/** Timeline d'emails pour les pages detail contact/societe */
export function EmailTimeline({ entityType, entityId }: EmailTimelineProps) {
  const { data: result, isLoading } = useEntityEmails(entityType, entityId);
  const emails = result?.data;

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <EmptyState icon={Mail} title="Aucun email" description="Aucun email lie a cet element." />
    );
  }

  return (
    <div className="divide-y">
      {emails.map((email: EmailWithParticipants) => {
        const sender = email.participants.find((p) => p.role === "from");
        const senderName = sender?.display_name || sender?.email_address || "Inconnu";

        return (
          <Link
            key={email.id}
            href={`/emails?id=${email.id}`}
            className="flex flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{senderName}</span>
              <div className="flex items-center gap-1.5">
                {!email.is_read && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">Non lu</Badge>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeDate(email.received_at)}
                </span>
              </div>
            </div>
            <span className="truncate text-sm">{email.subject || "(sans sujet)"}</span>
            {email.snippet && (
              <span className="truncate text-xs text-muted-foreground">{email.snippet}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
