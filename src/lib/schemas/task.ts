import { z } from "zod";

// --- Enums ---

const taskStatusEnum = z.enum(["todo", "in_progress", "done", "cancelled"]);
const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const entityTypeEnum = z.enum([
  "contact",
  "company",
  "deal",
  "quote",
  "invoice",
  "product",
  "task",
  "email",
  "content_idea",
  "content_piece",
  "deliverable",
  "content_template",
]);

// --- Creation ---

export const createTaskSchema = z
  .object({
    title: z.string().min(1, "Le titre est requis").max(200),
    description: z.string().max(5000).nullish(),
    status: taskStatusEnum.default("todo"),
    priority: taskPriorityEnum.default("medium"),
    task_type: z.string().max(50).nullish(),
    due_date: z.string().datetime().nullish(),
    entity_type: entityTypeEnum.nullish(),
    entity_id: z.string().uuid().nullish(),
    assigned_to: z.string().uuid().nullish(),
  })
  .refine(
    (data) =>
      (data.entity_type == null && data.entity_id == null) ||
      (data.entity_type != null && data.entity_id != null),
    { message: "entity_type et entity_id doivent etre fournis ensemble", path: ["entity_type"] },
  );

// --- Mise a jour ---

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullish(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    task_type: z.string().max(50).nullish(),
    due_date: z.string().datetime().nullish(),
    entity_type: entityTypeEnum.nullish(),
    entity_id: z.string().uuid().nullish(),
    assigned_to: z.string().uuid().nullish(),
  })
  .refine(
    (data) => {
      // Si aucun des deux n'est defini dans l'update, pas de validation croisee
      if (data.entity_type === undefined && data.entity_id === undefined) return true;
      return (
        (data.entity_type == null && data.entity_id == null) ||
        (data.entity_type != null && data.entity_id != null)
      );
    },
    { message: "entity_type et entity_id doivent etre fournis ensemble", path: ["entity_type"] },
  );

// --- Recherche ---

export const taskSearchSchema = z.object({
  query: z.string().default(""),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assigned_to: z.string().uuid().optional(),
  entity_type: entityTypeEnum.optional(),
  entity_id: z.string().uuid().optional(),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Types derives ---

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskSearchInput = z.infer<typeof taskSearchSchema>;
