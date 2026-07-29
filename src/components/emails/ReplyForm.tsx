"use client";

import { useForm } from "react-hook-form";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEmailStore } from "@/stores/emailStore";
import { useReplyEmail } from "@/lib/hooks/useEmails";
import type { ReplyEmailInput } from "@/lib/schemas/email";

// Interface formulaire (sans validation zod pour eviter les conflits de types avec .default())
interface ReplyFormValues {
  body_text: string;
}

/** Formulaire de reponse inline affiche sous le lecteur d'email */
export function ReplyForm() {
  const { replyingTo, setReplyingTo, replyAll, setReplyAll } = useEmailStore();
  const replyEmail = useReplyEmail();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReplyFormValues>({
    defaultValues: { body_text: "" },
  });

  if (!replyingTo) return null;

  function handleClose() {
    setReplyingTo(null);
    setReplyAll(false);
    reset();
  }

  async function onSubmit(data: ReplyFormValues) {
    const input: ReplyEmailInput = {
      email_id: replyingTo!,
      body_text: data.body_text,
      reply_all: replyAll,
    };
    await replyEmail.mutateAsync(input);
    handleClose();
  }

  return (
    <div className="border-t p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{replyAll ? "Répondre à tous" : "Répondre"}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplyAll(!replyAll)}>
            {replyAll ? "Répondre seul" : "Répondre à tous"}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea rows={5} placeholder="Ecrivez votre reponse..." {...register("body_text")} />
        {errors.body_text && <p className="text-xs text-red-500">{errors.body_text.message}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isSubmitting || replyEmail.isPending}>
            <Send className="mr-1.5 size-3.5" />
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}
