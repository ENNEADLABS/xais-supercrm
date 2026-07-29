/**
 * Formate une date ISO en texte relatif en français.
 * Ex: "il y a 5 min", "il y a 2 h", "il y a 3 j"
 */
export function formatRelativeDate(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMs = now - date;

  // Futur ou très récent
  if (diffMs < 0) return "à l'instant";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 30) return `il y a ${days} j`;
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}
