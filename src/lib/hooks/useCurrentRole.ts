import { useQuery } from "@tanstack/react-query";
import { fetchCurrentRole } from "@/lib/actions/settings";

// --- Role du membre courant (admin / member / viewer) ---
// Sert a gater l'affichage (ex. onglet Cles API reserve aux admins) ; les
// server actions restent la vraie garde (requireAdmin cote serveur).

export function useCurrentRole() {
  return useQuery({
    queryKey: ["currentRole"],
    queryFn: () => fetchCurrentRole(),
    staleTime: 5 * 60 * 1000, // le role ne change presque jamais en cours de session
  });
}
