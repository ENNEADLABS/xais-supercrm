"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentCalendar } from "@/lib/hooks/useContentCalendar";
import type { CalendarEntry } from "@/lib/services/contentCalendarService";
import { CalendarDayCell } from "./CalendarDayCell";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Formate une date locale en YYYY-MM-DD (sans decalage timezone).
function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calendrier editorial : grille mensuelle maison, contenus + livrables par date.
 */
export function StudioCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Decalage lundi = 0 (getDay() : 0 dimanche -> 6).
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  const from = toISODate(year, month, 1);
  const to = toISODate(year, month, daysInMonth);
  const { data: entries, isLoading } = useContentCalendar(from, to);

  // Regroupe les entrees par date.
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries ?? []) {
      const list = map.get(entry.scheduled_date) ?? [];
      list.push(entry);
      map.set(entry.scheduled_date, list);
    }
    return map;
  }, [entries]);

  function goPrev() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function goNext() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendrier éditorial</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mois précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Mois suivant">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div key={`blank-${i}`} className="min-h-24 border-b border-r bg-muted/20" />
                );
              }
              const dateISO = toISODate(year, month, day);
              return (
                <CalendarDayCell
                  key={dateISO}
                  day={day}
                  dateISO={dateISO}
                  todayISO={todayISO}
                  entries={byDate.get(dateISO) ?? []}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
