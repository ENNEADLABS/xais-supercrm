import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { softDeleteRecord } from "@/lib/supabase/softDelete";
import type { Database, EntityType, Note } from "@/types/database";
import type { CreateNoteInput } from "@/lib/schemas/note";
import * as activityService from "./activityService";

// --- Liste des notes d'une entite ---

export async function getNotes(organizationId: string, entityType: EntityType, entityId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Note[]) ?? [];
}

// --- Creation d'une note ---

export async function createNote(
  organizationId: string,
  authorId: string,
  input: CreateNoteInput,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("notes")
    .insert({
      organization_id: organizationId,
      author_id: authorId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      content: input.content,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Note creation failed");

  const note = data[0];

  await activityService.log(
    organizationId,
    {
      entityType: input.entity_type,
      entityId: input.entity_id,
      action: "note_added",
      actorId: authorId,
      metadata: { note_id: note.id },
    },
    supabase,
  );

  return note;
}

// --- Mise a jour du contenu d'une note ---

export async function updateNote(organizationId: string, noteId: string, content: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("notes")
    .update({ content })
    .eq("organization_id", organizationId)
    .eq("id", noteId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Note not found");
  return data[0];
}

// --- Suppression d'une note ---

export async function deleteNote(organizationId: string, noteId: string) {
  const supabase = await createServerSupabaseClient();

  // Recuperer la note avant suppression pour le log d'activite
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", noteId)
    .is("deleted_at", null);

  if (!notes || notes.length === 0) throw new Error("Note not found");
  const note = notes[0];

  await softDeleteRecord(supabase, "notes", organizationId, noteId);

  await activityService.log(organizationId, {
    entityType: note.entity_type,
    entityId: note.entity_id,
    action: "note_deleted",
    metadata: { note_id: noteId },
  });
}
