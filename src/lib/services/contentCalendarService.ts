import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ContentFormat,
  ContentStatus,
  DeliverableStatus,
  PublicationChannel,
} from "@/types/database";

// --- Entree de calendrier unifiee (contenu ou livrable) ---

export interface CalendarEntry {
  id: string;
  kind: "piece" | "deliverable";
  title: string;
  format: ContentFormat;
  status: ContentStatus | DeliverableStatus;
  scheduled_date: string;
  published_at: string | null;
  content_piece_id: string; // la piece elle-meme, ou la piece parente du livrable
}

/**
 * Agrege les contenus et livrables planifies sur une plage de dates [from, to].
 * Bornes au format ISO date (YYYY-MM-DD), typiquement un mois.
 */
export async function getCalendarEntries(
  organizationId: string,
  from: string,
  to: string,
): Promise<CalendarEntry[]> {
  const supabase = await createServerSupabaseClient();

  const [piecesRes, deliverablesRes] = await Promise.all([
    supabase
      .from("content_pieces")
      .select("id, title, format, status, scheduled_date, published_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", from)
      .lte("scheduled_date", to),
    supabase
      .from("deliverables")
      .select("id, title, format, status, scheduled_date, published_at, content_piece_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", from)
      .lte("scheduled_date", to),
  ]);

  if (piecesRes.error) throw piecesRes.error;
  if (deliverablesRes.error) throw deliverablesRes.error;

  const pieces: CalendarEntry[] = (piecesRes.data ?? []).map((p) => ({
    id: p.id,
    kind: "piece",
    title: p.title,
    format: p.format,
    status: p.status,
    scheduled_date: p.scheduled_date as string,
    published_at: p.published_at,
    content_piece_id: p.id,
  }));

  const deliverables: CalendarEntry[] = (deliverablesRes.data ?? []).map((d) => ({
    id: d.id,
    kind: "deliverable",
    title: d.title,
    format: d.format,
    status: d.status,
    scheduled_date: d.scheduled_date as string,
    published_at: d.published_at,
    content_piece_id: d.content_piece_id,
  }));

  return [...pieces, ...deliverables].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date),
  );
}

// --- Publications : livrables avec dimension canal (vue Publications) ---

export interface PublicationEntry {
  id: string;
  title: string;
  channel: PublicationChannel | null;
  format: ContentFormat;
  status: DeliverableStatus;
  scheduled_date: string | null;
  published_at: string | null;
  published_url: string | null;
  content_piece_id: string;
}

/**
 * Tous les livrables (hors corbeille) pour la vue Publications, triés par date
 * planifiée. Le regroupement par canal / semaine se fait côté UI (vue simple).
 */
export async function getPublications(organizationId: string): Promise<PublicationEntry[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select(
      "id, title, channel, format, status, scheduled_date, published_at, published_url, content_piece_id",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data as PublicationEntry[]) ?? [];
}
