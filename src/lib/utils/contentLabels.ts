import type {
  ContentStatus,
  ContentFormat,
  DeliverableStatus,
  AssetRole,
  PublicationChannel,
} from "@/types/database";

// Libelles FR et ordres d'affichage pour le module Content Studio.
// Centralise les enums PostgreSQL -> UI (cf. spec 021).

type Priority = "low" | "medium" | "high" | "urgent";

// --- Statuts de contenu (colonnes kanban, dans l'ordre du workflow) ---

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "idea",
  "research",
  "script",
  "recording",
  "editing",
  "review",
  "scheduled",
  "published",
  "archived",
];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idée",
  research: "Recherche",
  script: "Script",
  recording: "Tournage",
  editing: "Montage",
  review: "Relecture",
  scheduled: "Planifié",
  published: "Publié",
  archived: "Archivé",
};

// Couleur de pastille par statut (utilisee en en-tete de colonne et badge carte).
export const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  idea: "#94a3b8",
  research: "#0ea5e9",
  script: "#6366f1",
  recording: "#a855f7",
  editing: "#f59e0b",
  review: "#eab308",
  scheduled: "#14b8a6",
  published: "#22c55e",
  archived: "#64748b",
};

// --- Formats de contenu ---

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  youtube_long: "YouTube (long)",
  youtube_short: "YouTube Short",
  skool_post: "Post Skool",
  newsletter: "Newsletter",
  linkedin_post: "Post LinkedIn",
  podcast: "Podcast",
  course_lesson: "Leçon de cours",
  blog_article: "Article blog",
  case_study: "Étude de cas",
  other: "Autre",
};

export const CONTENT_FORMAT_OPTIONS = (Object.keys(CONTENT_FORMAT_LABELS) as ContentFormat[]).map(
  (value) => ({ value, label: CONTENT_FORMAT_LABELS[value] }),
);

// --- Statuts de livrable ---

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  planned: "Prévu",
  draft: "Brouillon",
  ready: "Prêt",
  scheduled: "Planifié",
  published: "Publié",
  cancelled: "Annulé",
};

export const DELIVERABLE_STATUS_OPTIONS = (
  Object.keys(DELIVERABLE_STATUS_LABELS) as DeliverableStatus[]
).map((value) => ({ value, label: DELIVERABLE_STATUS_LABELS[value] }));

// --- Roles d'asset ---

export const ASSET_ROLE_LABELS: Record<AssetRole, string> = {
  thumbnail: "Miniature",
  raw_video: "Vidéo brute",
  final_video: "Vidéo finale",
  short_clip: "Clip court",
  audio: "Audio",
  transcript: "Transcript",
  script_doc: "Doc script",
  brand_asset: "Asset de marque",
  reference: "Référence",
};

export const ASSET_ROLE_OPTIONS = (Object.keys(ASSET_ROLE_LABELS) as AssetRole[]).map((value) => ({
  value,
  label: ASSET_ROLE_LABELS[value],
}));

// --- Canaux de publication (ou ca se publie, axe distinct du format) ---

export const PUBLICATION_CHANNEL_LABELS: Record<PublicationChannel, string> = {
  youtube: "YouTube",
  skool: "Skool",
  linkedin: "LinkedIn",
  newsletter: "Newsletter",
  instagram: "Instagram",
  tiktok: "TikTok",
  x_twitter: "X (Twitter)",
  podcast: "Podcast",
  blog: "Blog",
  other: "Autre",
};

export const PUBLICATION_CHANNEL_OPTIONS = (
  Object.keys(PUBLICATION_CHANNEL_LABELS) as PublicationChannel[]
).map((value) => ({ value, label: PUBLICATION_CHANNEL_LABELS[value] }));

// --- Priorites (reutilise task_priority) ---

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as Priority[]).map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

// --- Helper date courte FR ---

export function formatShortDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
