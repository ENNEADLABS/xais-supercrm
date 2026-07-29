"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTENT_FORMAT_OPTIONS, PUBLICATION_CHANNEL_OPTIONS } from "@/lib/utils/contentLabels";
import type { TemplateFormValues } from "./templateFormSchema";

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

// Editeur des livrables a decliner (deliverable_specs[]) d'un template.
export function TemplateDeliverableSpecsEditor() {
  const { register, control } = useFormContext<TemplateFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "deliverable_specs" });

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Livrables à décliner</legend>
      {fields.map((field, i) => (
        <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input {...register(`deliverable_specs.${i}.title`)} placeholder="Titre du livrable" />
          <select {...register(`deliverable_specs.${i}.format`)} className={selectClass}>
            {CONTENT_FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select {...register(`deliverable_specs.${i}.channel`)} className={selectClass}>
            <option value="">Canal —</option>
            {PUBLICATION_CHANNEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <Input
              type="number"
              min={0}
              aria-label="Décalage en jours"
              className="w-16"
              {...register(`deliverable_specs.${i}.offset_days`, { valueAsNumber: true })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Supprimer le livrable"
              onClick={() => remove(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ title: "", format: "youtube_short", channel: "", offset_days: 0 })}
      >
        <Plus className="size-4" /> Ajouter un livrable
      </Button>
    </fieldset>
  );
}
