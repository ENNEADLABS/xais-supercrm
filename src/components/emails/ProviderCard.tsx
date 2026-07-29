"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProviderCardProps {
  provider: string;
  name: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  onConnect?: () => void;
}

/** Carte de selection d'un provider email (Gmail, Microsoft, IMAP) */
export function ProviderCard({
  name,
  description,
  icon: Icon,
  available,
  onConnect,
}: ProviderCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {!available && (
            <Badge variant="secondary" className="text-xs">
              Bientot disponible
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Button onClick={onConnect} disabled={!available} variant={available ? "default" : "outline"}>
        Connecter
      </Button>
    </Card>
  );
}
