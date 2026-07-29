import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentPiece, BoardPiece } from "@/types/database";
import type { ContentPieceSearchInput } from "@/lib/schemas/content";
import { escapeLike } from "@/lib/utils/format";

// --- Liste paginee avec recherche et filtres ---

export async function getContentPieces(organizationId: string, params?: ContentPieceSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("content_pieces")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (params?.query) {
    query = query.ilike("title", `%${escapeLike(params.query)}%`);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.format) {
    query = query.eq("format", params.format);
  }
  if (params?.owner_id) {
    query = query.eq("owner_id", params.owner_id);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as ContentPiece[]) ?? [], count: count ?? 0 };
}

// --- Toutes les pieces (pour le kanban : tri par statut puis position) ---

export async function getBoardPieces(organizationId: string): Promise<BoardPiece[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  const pieces = (data as ContentPiece[]) ?? [];
  if (pieces.length === 0) return [];

  // Avancement checklist agrege en une seule requete (pas de N+1 par carte).
  const { data: items, error: itemsError } = await supabase
    .from("content_checklist_items")
    .select("content_piece_id, is_done")
    .eq("organization_id", organizationId)
    .in(
      "content_piece_id",
      pieces.map((p) => p.id),
    );
  if (itemsError) throw itemsError;

  const progress = new Map<string, { total: number; done: number }>();
  for (const item of items ?? []) {
    const entry = progress.get(item.content_piece_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (item.is_done) entry.done += 1;
    progress.set(item.content_piece_id, entry);
  }

  return pieces.map((piece) => ({
    ...piece,
    checklist_total: progress.get(piece.id)?.total ?? 0,
    checklist_done: progress.get(piece.id)?.done ?? 0,
  }));
}

// --- Detail ---

export async function getContentPiece(organizationId: string, pieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pieceId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as ContentPiece;
}
