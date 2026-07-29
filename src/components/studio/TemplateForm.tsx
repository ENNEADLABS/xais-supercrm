"use client";

import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTemplate, useUpdateTemplate } from "@/lib/hooks/useContentTemplates";
import type { CreateTemplateInput } from "@/lib/schemas/content";
import { CONTENT_FORMAT_OPTIONS, PRIORITY_OPTIONS } from "@/lib/utils/contentLabels";
import type { ContentTemplate } from "@/types/database";
import { templateFormSchema, SCRIPT_FIELDS, type TemplateFormValues } from "./templateFormSchema";
import { TemplateChecklistEditor } from "./TemplateChecklistEditor";
import { TemplateDeliverableSpecsEditor } from "./TemplateDeliverableSpecsEditor";

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function toDefaults(t?: ContentTemplate): TemplateFormValues {
  const s = (t?.script_skeleton ?? {}) as Record<string, string | undefined>;
  return {
    name: t?.name ?? "",
    description: t?.description ?? "",
    format: t?.format ?? "youtube_long",
    target_audience: t?.target_audience ?? "",
    default_priority: t?.default_priority ?? "medium",
    is_active: t?.is_active ?? true,
    script_skeleton: Object.fromEntries(SCRIPT_FIELDS.map((f) => [f.key, s[f.key] ?? ""])),
    checklist_items: ((t?.checklist_items as string[]) ?? []).slice(),
    deliverable_specs: (
      (t?.deliverable_specs as TemplateFormValues["deliverable_specs"]) ?? []
    ).map((d) => ({ ...d, channel: d.channel ?? "", offset_days: d.offset_days ?? 0 })),
  };
}

export function TemplateForm({ template }: { template?: ContentTemplate }) {
  const router = useRouter();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const isEdit = !!template;

  const methods = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: toDefaults(template),
  });
  const { register, handleSubmit, formState } = methods;
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: TemplateFormValues) {
    const skeleton = Object.fromEntries(
      SCRIPT_FIELDS.map((f) => [f.key, values.script_skeleton[f.key] || undefined]),
    );
    const input: CreateTemplateInput = {
      name: values.name,
      description: values.description || null,
      format: values.format,
      target_audience: values.target_audience || null,
      default_priority: values.default_priority,
      is_active: values.is_active,
      script_skeleton: skeleton,
      checklist_items: values.checklist_items.map((c) => c.trim()).filter(Boolean),
      deliverable_specs: values.deliverable_specs.map((d) => ({
        title: d.title,
        format: d.format,
        channel: d.channel || undefined,
        offset_days: d.offset_days,
      })),
    };
    if (isEdit && template) {
      await updateTemplate.mutateAsync({ templateId: template.id, input });
    } else {
      await createTemplate.mutateAsync(input);
    }
    router.push("/studio/templates");
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input id="name" {...register("name")} placeholder="Ex: YouTube Long" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="format">Format *</Label>
            <select id="format" {...register("format")} className={selectClass}>
              {CONTENT_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_priority">Priorité</Label>
            <select id="default_priority" {...register("default_priority")} className={selectClass}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_audience">Cible</Label>
            <Input id="target_audience" {...register("target_audience")} placeholder="Audience" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} rows={2} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Squelette de script</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SCRIPT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`sk-${f.key}`}>{f.label}</Label>
                <Textarea id={`sk-${f.key}`} {...register(`script_skeleton.${f.key}`)} rows={2} />
              </div>
            ))}
          </div>
        </fieldset>

        <TemplateChecklistEditor />
        <TemplateDeliverableSpecsEditor />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Template actif
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/studio/templates")}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isEdit ? "Enregistrer" : "Créer le template"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
