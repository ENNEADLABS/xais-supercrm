"use client";

import { Archive, Trash2, MailOpen, Reply, ReplyAll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRelativeDate } from "@/components/crm/utils/format-date";
import { useEmailStore } from "@/stores/emailStore";
import { useEmail, useMarkEmailsRead, useMoveEmails } from "@/lib/hooks/useEmails";
import { EmailParticipants } from "./EmailParticipants";
import { ReplyForm } from "./ReplyForm";

/** Panneau de lecture d'un email selectionne */
export function EmailReader() {
  const { selectedEmailId, setSelectedEmailId, setReplyingTo, setReplyAll } = useEmailStore();
  const { data: email, isLoading } = useEmail(selectedEmailId);
  const markRead = useMarkEmailsRead();
  const moveEmails = useMoveEmails();

  // Etat vide : aucun email selectionne
  if (!selectedEmailId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Selectionnez un email pour le lire
      </div>
    );
  }

  // Chargement
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Email introuvable
      </div>
    );
  }

  function handleArchive() {
    if (!email) return;
    moveEmails.mutate({ emailIds: [email.id], folder: "archive" });
    setSelectedEmailId(null);
  }

  function handleTrash() {
    if (!email) return;
    moveEmails.mutate({ emailIds: [email.id], folder: "trash" });
    setSelectedEmailId(null);
  }

  function handleMarkUnread() {
    if (!email) return;
    markRead.mutate({ emailIds: [email.id], isRead: false });
  }

  function handleReply() {
    if (!email) return;
    setReplyAll(false);
    setReplyingTo(email.id);
  }

  function handleReplyAll() {
    if (!email) return;
    setReplyAll(true);
    setReplyingTo(email.id);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Barre d'actions */}
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <Button variant="ghost" size="icon-sm" onClick={handleArchive} title="Archiver">
          <Archive className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleTrash} title="Supprimer">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleMarkUnread} title="Marquer non lu">
          <MailOpen className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleReply} title="Répondre">
          <Reply className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleReplyAll} title="Répondre à tous">
          <ReplyAll className="size-4" />
        </Button>
      </div>

      {/* En-tete */}
      <div className="space-y-1 border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{email.subject || "(sans sujet)"}</h2>
        <div className="text-xs text-muted-foreground">{formatRelativeDate(email.received_at)}</div>
        <EmailParticipants participants={email.participants} role="from" label="De" />
        <EmailParticipants participants={email.participants} role="to" label="A" />
        <EmailParticipants participants={email.participants} role="cc" label="Cc" />
      </div>

      <Separator />

      {/* Corps du message (texte brut en V1 pour la securite) */}
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {email.body_text || "(aucun contenu)"}
        </pre>
      </div>

      {/* Formulaire de reponse inline */}
      <ReplyForm />
    </div>
  );
}
