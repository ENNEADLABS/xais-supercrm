import { z } from "zod";
import {
  contentFormatEnum,
  publicationChannelEnum,
  scriptSkeletonSchema,
} from "@/lib/schemas/content";

// Schema du formulaire de template : tolere les valeurs UI (canal vide) ;
// la transformation vers CreateTemplateInput se fait au submit (TemplateForm).
export const templateFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(2000),
  format: contentFormatEnum,
  target_audience: z.string().max(500),
  default_priority: z.enum(["low", "medium", "high", "urgent"]),
  is_active: z.boolean(),
  script_skeleton: scriptSkeletonSchema,
  checklist_items: z.array(z.string()),
  deliverable_specs: z.array(
    z.object({
      title: z.string().min(1, "Titre requis"),
      format: contentFormatEnum,
      channel: z.union([publicationChannelEnum, z.literal("")]),
      offset_days: z.number().int().min(0),
    }),
  ),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const SCRIPT_FIELDS = [
  { key: "hook", label: "Accroche (hook)" },
  { key: "intro", label: "Intro" },
  { key: "structure", label: "Structure" },
  { key: "key_points", label: "Points clés" },
  { key: "cta", label: "CTA" },
  { key: "shooting_notes", label: "Notes de tournage" },
] as const;
