"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Champ de recherche avec icône, bouton de réinitialisation
 * et debounce de 300ms.
 */
export function SearchInput({ value, onChange, placeholder = "Rechercher..." }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const isFirstRender = useRef(true);

  // Synchroniser la valeur externe → locale
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce : notifier le parent après 300ms d'inactivité
  useEffect(() => {
    // Éviter le déclenchement au premier rendu
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue]); // onChange volontairement exclu pour éviter les boucles

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la recherche"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
