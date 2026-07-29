"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactChannelSchema, type ContactChannelInput } from "@/lib/schemas/contact";
import {
  useContactChannels,
  useAddContactChannel,
  useRemoveContactChannel,
} from "@/lib/hooks/useContactChannels";
import type { ContactChannel } from "@/lib/services/contactChannelService";

const LABEL_LABELS: Record<string, string> = {
  work: "Pro",
  personal: "Perso",
  mobile: "Mobile",
  other: "Autre",
};

interface ContactChannelsProps {
  contactId: string;
  type: "email" | "phone";
  /** Email ou téléphone principal (depuis contacts.email / contacts.phone) */
  primaryValue: string | null | undefined;
}

/**
 * Section inline pour gérer les canaux de communication supplémentaires d'un contact.
 * Affiche le canal principal (non modifiable ici) + les canaux additionnels.
 */
export function ContactChannels({ contactId, type, primaryValue }: ContactChannelsProps) {
  const [adding, setAdding] = useState(false);

  const { data: channels = [], isLoading } = useContactChannels(contactId);
  const addMutation = useAddContactChannel(contactId);
  const removeMutation = useRemoveContactChannel(contactId);

  const filtered = channels.filter((c) => c.type === type);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactChannelInput>({
    resolver: zodResolver(contactChannelSchema),
    defaultValues: { type, value: "", label: null },
  });

  async function onSubmit(data: ContactChannelInput) {
    await addMutation.mutateAsync(data);
    reset({ type, value: "", label: null });
    setAdding(false);
  }

  function handleCancel() {
    reset({ type, value: "", label: null });
    setAdding(false);
  }

  return (
    <div className="space-y-1">
      {/* Canal principal */}
      {primaryValue && <ChannelRow value={primaryValue} label={null} isPrimary />}

      {/* Canaux supplémentaires */}
      {isLoading ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      ) : (
        filtered.map((channel) => (
          <ChannelRow
            key={channel.id}
            value={channel.value}
            label={channel.label}
            onRemove={() => removeMutation.mutate(channel.id)}
            isRemoving={removeMutation.isPending}
          />
        ))
      )}

      {/* Formulaire d'ajout inline */}
      {adding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 flex items-start gap-2">
          <input type="hidden" {...register("type")} />
          <div className="flex-1 space-y-1">
            <Input
              {...register("value")}
              type={type === "email" ? "email" : "tel"}
              placeholder={type === "email" ? "email@example.com" : "+33 0 00 00 00 00"}
              className="h-8 text-sm"
              aria-invalid={!!errors.value}
            />
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>
          <Select
            defaultValue=""
            onValueChange={(v) => setValue("label", (v as ContactChannel["label"]) ?? null)}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">Pro</SelectItem>
              <SelectItem value="personal">Perso</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={isSubmitting || addMutation.isPending}
          >
            {addMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Ajouter"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleCancel}>
            Annuler
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" />
          {type === "email" ? "Ajouter un email" : "Ajouter un téléphone"}
        </Button>
      )}
    </div>
  );
}

function ChannelRow({
  value,
  label,
  isPrimary,
  onRemove,
  isRemoving,
}: {
  value: string;
  label: ContactChannel["label"] | null;
  isPrimary?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  return (
    <div className="group flex items-center gap-2">
      <span className="text-sm">{value}</span>
      {label && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {LABEL_LABELS[label] ?? label}
        </span>
      )}
      {isPrimary && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Principal</span>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label="Supprimer ce canal"
        >
          {isRemoving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3 text-destructive" />
          )}
        </Button>
      )}
    </div>
  );
}
