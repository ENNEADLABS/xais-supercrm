"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateContentIdea, useUpdateContentIdea } from "@/lib/hooks/useContentIdeas";
import { createContentIdeaSchema } from "@/lib/schemas/content";
import { CONTENT_FORMAT_OPTIONS, PRIORITY_OPTIONS } from "@/lib/utils/contentLabels";
import type { ContentIdea } from "@/types/database";
import type { z } from "zod";

type IdeaFormValues = z.input<typeof createContentIdeaSchema>;

interface IdeaFormProps {
  idea?: ContentIdea;
}

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Formulaire de creation / edition d'une idee de contenu.
 */
export function IdeaForm({ idea }: IdeaFormProps) {
  const router = useRouter();
  const createIdea = useCreateContentIdea();
  const updateIdea = useUpdateContentIdea();
  const isEdit = !!idea;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IdeaFormValues>({
    resolver: zodResolver(createContentIdeaSchema),
    defaultValues: {
      title: idea?.title ?? "",
      angle: idea?.angle ?? "",
      promise: idea?.promise ?? "",
      hook: idea?.hook ?? "",
      notes: idea?.notes ?? "",
      target: idea?.target ?? "",
      planned_format: idea?.planned_format ?? undefined,
      priority: idea?.priority ?? "medium",
      desired_publish_date: idea?.desired_publish_date ?? "",
    },
  });

  async function onSubmit(data: IdeaFormValues) {
    const cleaned = {
      ...data,
      priority: data.priority ?? "medium",
      angle: data.angle || null,
      promise: data.promise || null,
      hook: data.hook || null,
      notes: data.notes || null,
      target: data.target || null,
      planned_format: data.planned_format || null,
      desired_publish_date: data.desired_publish_date || null,
    };
    if (isEdit && idea) {
      await updateIdea.mutateAsync({ ideaId: idea.id, input: cleaned });
    } else {
      await createIdea.mutateAsync(cleaned);
    }
    router.push("/studio/ideas");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="Ex: Comment j'ai automatisé mon CRM"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planned_format">Format envisagé</Label>
          <select id="planned_format" {...register("planned_format")} className={selectClass}>
            <option value="">À définir</option>
            {CONTENT_FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priorité</Label>
          <select id="priority" {...register("priority")} className={selectClass}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="target">Cible</Label>
          <Input id="target" {...register("target")} placeholder="Ex: solopreneurs tech" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desired_publish_date">Date de publication souhaitée</Label>
          <Input id="desired_publish_date" type="date" {...register("desired_publish_date")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="angle">Angle</Label>
        <Textarea id="angle" {...register("angle")} rows={2} placeholder="L'angle éditorial" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="promise">Promesse</Label>
          <Textarea id="promise" {...register("promise")} rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hook">Accroche (hook)</Label>
          <Textarea id="hook" {...register("hook")} rows={2} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/studio/ideas")}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? "Enregistrer" : "Créer l'idée"}
        </Button>
      </div>
    </form>
  );
}
