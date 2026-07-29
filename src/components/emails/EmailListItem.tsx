"use client";

import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/components/crm/utils/format-date";
import { useEmailStore } from "@/stores/emailStore";
import { useMarkEmailsRead } from "@/lib/hooks/useEmails";
import type { EmailWithParticipants } from "@/types/email";

interface EmailListItemProps {
  email: EmailWithParticipants;
}

/** Element de la liste d'emails : expediteur, sujet, apercu, date */
export function EmailListItem({ email }: EmailListItemProps) {
  const { selectedEmailId, setSelectedEmailId } = useEmailStore();
  const markRead = useMarkEmailsRead();
  const isSelected = selectedEmailId === email.id;

  // Trouver l'expediteur
  const sender = email.participants.find((p) => p.role === "from");
  const senderName = sender?.display_name || sender?.email_address || "Inconnu";

  function handleClick() {
    setSelectedEmailId(email.id);
    if (!email.is_read) {
      markRead.mutate({ emailIds: [email.id], isRead: true });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-blue-50",
        !email.is_read && "bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          {!email.is_read && <span className="size-2 shrink-0 rounded-full bg-blue-500" />}
          <span className={cn("truncate text-sm", !email.is_read && "font-semibold")}>
            {senderName}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(email.received_at)}
        </span>
      </div>
      <span className={cn("truncate text-sm", !email.is_read ? "font-medium" : "text-foreground")}>
        {email.subject || "(sans sujet)"}
      </span>
      {email.snippet && (
        <span className="truncate text-xs text-muted-foreground">{email.snippet}</span>
      )}
    </button>
  );
}
