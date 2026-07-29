"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Eviter le mismatch SSR — ne rendre qu'apres hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="size-9" />;

  // Cycle : system → light → dark → system
  function nextTheme() {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = theme === "dark" ? "Sombre" : theme === "light" ? "Clair" : "Système";

  return (
    <button
      onClick={nextTheme}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      aria-label={`Thème actuel : ${label}. Cliquer pour changer.`}
      title={label}
    >
      <Icon className="size-4" />
    </button>
  );
}
