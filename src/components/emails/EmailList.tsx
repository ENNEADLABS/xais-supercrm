"use client";

import { Mail } from "lucide-react";
import { SearchInput, EmptyState } from "@/components/crm";
import { useEmailStore } from "@/stores/emailStore";
import { useEmails } from "@/lib/hooks/useEmails";
import { EmailListItem } from "./EmailListItem";
import type { EmailWithParticipants } from "@/types/email";

/** Colonne centrale : recherche + liste d'emails */
export function EmailList() {
  const { activeFolder, searchQuery, setSearchQuery } = useEmailStore();
  const { data: result, isLoading } = useEmails({ folder: activeFolder, search: searchQuery });
  const emails = result?.data;

  return (
    <div className="flex h-full flex-col border-r">
      {/* Barre de recherche */}
      <div className="border-b p-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher dans les emails..."
        />
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5 rounded-md bg-muted/40 p-3">
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!emails || emails.length === 0) && (
          <EmptyState icon={Mail} title="Aucun email" description="Aucun email dans ce dossier." />
        )}

        {!isLoading &&
          emails?.map((email: EmailWithParticipants) => (
            <EmailListItem key={email.id} email={email} />
          ))}
      </div>
    </div>
  );
}
