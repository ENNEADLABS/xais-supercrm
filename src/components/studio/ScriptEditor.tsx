"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContentScript, useUpsertScript } from "@/lib/hooks/useContentScript";

interface ScriptEditorProps {
  contentPieceId: string;
}

interface ScriptFields {
  hook: string;
  intro: string;
  structure: string;
  key_points: string;
  cta: string;
  shooting_notes: string;
  short_version: string;
  long_version: string;
}

const EMPTY: ScriptFields = {
  hook: "",
  intro: "",
  structure: "",
  key_points: "",
  cta: "",
  shooting_notes: "",
  short_version: "",
  long_version: "",
};

const FIELDS: { key: keyof ScriptFields; label: string; rows: number }[] = [
  { key: "hook", label: "Accroche (hook)", rows: 2 },
  { key: "intro", label: "Intro", rows: 3 },
  { key: "structure", label: "Structure / plan", rows: 6 },
  { key: "key_points", label: "Points clés", rows: 4 },
  { key: "cta", label: "Call to action", rows: 2 },
  { key: "shooting_notes", label: "Notes de tournage", rows: 3 },
  { key: "short_version", label: "Version courte", rows: 4 },
  { key: "long_version", label: "Version longue", rows: 6 },
];

/**
 * Editeur de script d'un contenu (champs textarea, upsert).
 */
export function ScriptEditor({ contentPieceId }: ScriptEditorProps) {
  const { data: script, isLoading } = useContentScript(contentPieceId);
  const upsertScript = useUpsertScript();

  const { register, handleSubmit, reset } = useForm<ScriptFields>({ defaultValues: EMPTY });

  // Hydrate le formulaire quand le script est charge.
  useEffect(() => {
    if (script) {
      reset({
        hook: script.hook ?? "",
        intro: script.intro ?? "",
        structure: script.structure ?? "",
        key_points: script.key_points ?? "",
        cta: script.cta ?? "",
        shooting_notes: script.shooting_notes ?? "",
        short_version: script.short_version ?? "",
        long_version: script.long_version ?? "",
      });
    }
  }, [script, reset]);

  async function onSubmit(data: ScriptFields) {
    await upsertScript.mutateAsync({
      content_piece_id: contentPieceId,
      hook: data.hook || null,
      intro: data.intro || null,
      structure: data.structure || null,
      key_points: data.key_points || null,
      cta: data.cta || null,
      shooting_notes: data.shooting_notes || null,
      short_version: data.short_version || null,
      long_version: data.long_version || null,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`script-${field.key}`}>{field.label}</Label>
          <Textarea id={`script-${field.key}`} rows={field.rows} {...register(field.key)} />
        </div>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={upsertScript.isPending}>
          {upsertScript.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer le script
        </Button>
      </div>
    </form>
  );
}
