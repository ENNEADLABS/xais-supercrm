"use client";

import { useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TemplateFormValues } from "./templateFormSchema";

// Editeur de la checklist de production (string[]) d'un template.
export function TemplateChecklistEditor() {
  const { register, watch, setValue } = useFormContext<TemplateFormValues>();
  const checklist = watch("checklist_items");

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Checklist de production</legend>
      {checklist.map((_, i) => (
        <div key={i} className="flex gap-2">
          <Input {...register(`checklist_items.${i}`)} placeholder={`Étape ${i + 1}`} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer l'étape"
            onClick={() =>
              setValue(
                "checklist_items",
                checklist.filter((_, idx) => idx !== i),
              )
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setValue("checklist_items", [...checklist, ""])}
      >
        <Plus className="size-4" /> Ajouter une étape
      </Button>
    </fieldset>
  );
}
