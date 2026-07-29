import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEntries, fetchPublications } from "@/lib/actions/content";

// --- Entrees de calendrier sur une plage de dates (YYYY-MM-DD) ---

export function useContentCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["content-calendar", from, to],
    queryFn: () => fetchCalendarEntries(from, to),
    enabled: !!from && !!to,
  });
}

// --- Publications : livrables par canal (vue Publications) ---

export function usePublications() {
  return useQuery({
    queryKey: ["content-publications"],
    queryFn: () => fetchPublications(),
  });
}
