"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markOnboardingCompleteAction } from "@/lib/actions/settings";

interface StepCompleteProps {
  onComplete: () => void;
}

export function StepComplete({ onComplete }: StepCompleteProps) {
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      await markOnboardingCompleteAction();
      onComplete();
    } catch {
      toast.error("Erreur lors de la finalisation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="text-2xl font-bold">Votre espace est prêt !</h2>
          <p className="max-w-md text-muted-foreground">
            Vous pouvez commencer à utiliser ENNEAD Studio Creator. Tous ces paramètres sont
            modifiables à tout moment dans les Réglages.
          </p>
        </div>

        <Button size="lg" onClick={handleComplete} disabled={loading}>
          {loading ? "Finalisation..." : "Accéder au tableau de bord"}
          {!loading && <ArrowRight className="ml-2 size-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}
