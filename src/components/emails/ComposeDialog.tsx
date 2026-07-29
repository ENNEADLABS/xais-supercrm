"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmailStore } from "@/stores/emailStore";
import { useSendEmail } from "@/lib/hooks/useEmails";
import { useConnectedAccounts } from "@/lib/hooks/useConnectedAccounts";
import { composeEmailSchema } from "@/lib/schemas/email";
import type { ComposeEmailInput } from "@/lib/schemas/email";

/** Modale de composition d'un nouvel email */
export function ComposeDialog() {
  const { composeOpen, setComposeOpen } = useEmailStore();
  const { data: accounts } = useConnectedAccounts();
  const sendEmail = useSendEmail();
  const [showCcBcc, setShowCcBcc] = useState(false);

  const connectedAccounts = accounts?.filter((a) => a.status === "connected") ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComposeEmailInput>({
    resolver: zodResolver(composeEmailSchema),
    defaultValues: {
      account_id: connectedAccounts[0]?.id ?? "",
      to: [],
      subject: "",
      body_text: "",
    },
  });

  function handleClose() {
    setComposeOpen(false);
    reset();
    setShowCcBcc(false);
  }

  async function onSubmit(data: ComposeEmailInput) {
    await sendEmail.mutateAsync(data);
    handleClose();
  }

  // Helper pour transformer une string comma-separated en array
  function parseEmailList(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <Dialog
      open={composeOpen}
      onOpenChange={(open) => (open ? setComposeOpen(true) : handleClose())}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau message</DialogTitle>
          <DialogDescription>Composez et envoyez un email</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Selecteur de compte */}
          <div>
            <Label htmlFor="account_id">De</Label>
            <select
              id="account_id"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              {...register("account_id")}
            >
              {connectedAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email_address}
                </option>
              ))}
            </select>
            {errors.account_id && (
              <p className="mt-1 text-xs text-red-500">{errors.account_id.message}</p>
            )}
          </div>

          {/* Destinataires */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="to">A</Label>
              {!showCcBcc && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setShowCcBcc(true)}
                >
                  Cc/Bcc
                </button>
              )}
            </div>
            <Input
              id="to"
              placeholder="destinataire@example.com, ..."
              {...register("to", {
                setValueAs: (v: string) => (typeof v === "string" ? parseEmailList(v) : v),
              })}
            />
            {errors.to && <p className="mt-1 text-xs text-red-500">{errors.to.message}</p>}
          </div>

          {/* Cc / Bcc */}
          {showCcBcc && (
            <>
              <div>
                <Label htmlFor="cc">Cc</Label>
                <Input
                  id="cc"
                  placeholder="cc@example.com, ..."
                  {...register("cc", {
                    setValueAs: (v: string) =>
                      typeof v === "string" && v.trim() ? parseEmailList(v) : undefined,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="bcc">Bcc</Label>
                <Input
                  id="bcc"
                  placeholder="bcc@example.com, ..."
                  {...register("bcc", {
                    setValueAs: (v: string) =>
                      typeof v === "string" && v.trim() ? parseEmailList(v) : undefined,
                  })}
                />
              </div>
            </>
          )}

          {/* Sujet */}
          <div>
            <Label htmlFor="subject">Sujet</Label>
            <Input id="subject" placeholder="Sujet du message" {...register("subject")} />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
            )}
          </div>

          {/* Corps */}
          <div>
            <Label htmlFor="body_text">Message</Label>
            <Textarea
              id="body_text"
              rows={10}
              placeholder="Ecrivez votre message..."
              {...register("body_text")}
            />
            {errors.body_text && (
              <p className="mt-1 text-xs text-red-500">{errors.body_text.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || sendEmail.isPending}>
              <Send className="mr-1.5 size-4" />
              Envoyer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
