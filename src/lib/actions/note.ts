"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as noteService from "@/lib/services/noteService";
import { createNoteSchema, type CreateNoteInput } from "@/lib/schemas/note";
import type { EntityType } from "@/types/database";

// --- Liste des notes d'une entite ---

export async function fetchNotes(entityType: EntityType, entityId: string) {
  const { organizationId } = await getAuthContext();
  return noteService.getNotes(organizationId, entityType, entityId);
}

// --- Creation ---

export async function createNoteAction(input: CreateNoteInput) {
  const { userId, organizationId } = await requireMember();
  const validated = createNoteSchema.parse(input);
  const note = await noteService.createNote(organizationId, userId, validated);
  revalidatePath(`/${validated.entity_type}s/${validated.entity_id}`);
  return note;
}

// --- Mise a jour ---

export async function updateNoteAction(noteId: string, content: string) {
  const { organizationId } = await requireMember();
  const note = await noteService.updateNote(organizationId, noteId, content);
  return note;
}

// --- Suppression ---

export async function deleteNoteAction(noteId: string) {
  const { organizationId } = await requireMember();
  await noteService.deleteNote(organizationId, noteId);
}
