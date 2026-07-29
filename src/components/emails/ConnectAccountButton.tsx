"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Boutons de connexion de compte email (Gmail actif, Microsoft bientot) */
export function ConnectAccountButton() {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Button onClick={() => router.push("/api/emails/oauth/google")}>Connecter Gmail</Button>
      <Button variant="outline" disabled title="Bientot disponible">
        Connecter Microsoft
      </Button>
    </div>
  );
}
