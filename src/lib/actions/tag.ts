"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as tagService from "@/lib/services/tagService";
import type { EntityType } from "@/types/database";

// --- Liste des tags ---

export async function fetchTags(entityType?: EntityType) {
  const { organizationId } = await getAuthContext();
  return tagService.getTags(organizationId, entityType);
}

// --- Creation ---

export async function createTagAction(input: {
  name: string;
  color: string;
  entity_type: EntityType;
}) {
  const { organizationId } = await requireMember();
  const tag = await tagService.createTag(organizationId, input);
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return tag;
}

// --- Suppression ---

export async function deleteTagAction(tagId: string) {
  const { organizationId } = await requireMember();
  await tagService.deleteTag(organizationId, tagId);
  revalidatePath("/contacts");
  revalidatePath("/companies");
}

// --- Assignation ---

export async function assignTagAction(
  entityId: string,
  tagId: string,
  type: "contact" | "company",
) {
  await tagService.assignTag(entityId, tagId, type);
  revalidatePath(type === "contact" ? "/contacts" : "/companies");
}

// --- Retrait ---

export async function removeTagAction(
  entityId: string,
  tagId: string,
  type: "contact" | "company",
) {
  await tagService.removeTag(entityId, tagId, type);
  revalidatePath(type === "contact" ? "/contacts" : "/companies");
}
