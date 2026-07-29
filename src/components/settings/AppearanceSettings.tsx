"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Clair", icon: Sun, description: "Thème lumineux classique" },
  { id: "dark", label: "Sombre", icon: Moon, description: "Moins de fatigue oculaire" },
  { id: "system", label: "Système", icon: Monitor, description: "Suit les préférences OS" },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Apparence</h2>
        <p className="text-sm text-muted-foreground">
          Personnalisez l&apos;apparence de l&apos;application.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEMES.map((t) => (
          <Card
            key={t.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              theme === t.id && "border-primary ring-1 ring-primary",
            )}
            onClick={() => setTheme(t.id)}
          >
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  theme === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <t.icon className="size-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
