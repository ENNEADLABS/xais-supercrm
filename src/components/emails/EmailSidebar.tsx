"use client";

import Link from "next/link";
import { Inbox, Send, Archive, Trash2, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmailStore } from "@/stores/emailStore";
import { useEmailCounts } from "@/lib/hooks/useEmails";
import { useConnectedAccounts, useTriggerSync } from "@/lib/hooks/useConnectedAccounts";
import { AccountStatusBadge } from "./AccountStatusBadge";
import type { EmailFolder } from "@/types/email";

const folders: {
  id: EmailFolder;
  label: string;
  icon: typeof Inbox;
  countKey: "unread" | EmailFolder;
}[] = [
  { id: "inbox", label: "Boite de reception", icon: Inbox, countKey: "unread" },
  { id: "sent", label: "Envoyes", icon: Send, countKey: "sent" },
  { id: "archive", label: "Archives", icon: Archive, countKey: "archive" },
  { id: "trash", label: "Corbeille", icon: Trash2, countKey: "trash" },
];

/** Panneau lateral gauche : dossiers + comptes connectes */
export function EmailSidebar() {
  const { activeFolder, setActiveFolder } = useEmailStore();
  const { data: counts } = useEmailCounts();
  const { data: accounts } = useConnectedAccounts();
  const triggerSync = useTriggerSync();

  return (
    <aside className="flex h-full w-52 flex-col border-r bg-sidebar">
      {/* Dossiers */}
      <nav className="flex-1 space-y-0.5 p-2">
        {folders.map((folder) => {
          const isActive = activeFolder === folder.id;
          const count =
            folder.countKey === "unread"
              ? (counts?.unreadCount ?? 0)
              : (counts?.folderCounts[folder.countKey] ?? 0);
          const showBadge = folder.id === "inbox" && count > 0;

          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setActiveFolder(folder.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <folder.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{folder.label}</span>
              {showBadge && <Badge className="bg-blue-100 text-blue-700 text-xs">{count}</Badge>}
            </button>
          );
        })}
      </nav>

      {/* Comptes connectes */}
      <div className="border-t p-2">
        <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">Comptes</p>
        {accounts?.map((account) => (
          <div key={account.id} className="flex items-center gap-2 px-2 py-1">
            <span className="flex-1 truncate text-xs">{account.email_address}</span>
            <AccountStatusBadge status={account.status} />
          </div>
        ))}

        <div className="mt-2 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Synchroniser tous les comptes connectes
              accounts
                ?.filter((a) => a.status === "connected")
                .forEach((a) => triggerSync.mutate(a.id));
            }}
            disabled={triggerSync.isPending}
          >
            <RefreshCw className={cn("size-3.5", triggerSync.isPending && "animate-spin")} />
            Synchroniser
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            render={<Link href="/emails/accounts" />}
          >
            <Settings className="size-3.5" />
            Gerer les comptes
          </Button>
        </div>
      </div>
    </aside>
  );
}
