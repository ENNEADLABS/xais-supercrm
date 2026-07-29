"use client";

import Link from "next/link";
import { Kanban, Lightbulb, CalendarDays, LayoutTemplate, Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentSignals } from "@/lib/hooks/useContentSignals";
import { TodayQueue } from "./cockpit/TodayQueue";
import { ToValidate } from "./cockpit/ToValidate";
import { BlockedList } from "./cockpit/BlockedList";
import { OverdueList } from "./cockpit/OverdueList";

/**
 * Cockpit quotidien de production (page d'accueil /studio) : 4 listes
 * opérationnelles dérivées du board. Le kanban vit en /studio/board.
 */
export function StudioCockpit() {
  const { thisWeek, toValidate, blocked, overdue, isLoading } = useContentSignals();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Studio — cockpit</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href="/studio/board" />}>
            <Kanban className="size-4" />
            Board
          </Button>
          <Button variant="outline" render={<Link href="/studio/ideas" />}>
            <Lightbulb className="size-4" />
            Idées
          </Button>
          <Button variant="outline" render={<Link href="/studio/calendar" />}>
            <CalendarDays className="size-4" />
            Calendrier
          </Button>
          <Button variant="outline" render={<Link href="/studio/templates" />}>
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
          <Button variant="outline" render={<Link href="/studio/publications" />}>
            <Megaphone className="size-4" />
            Publications
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OverdueList items={overdue} />
          <ToValidate items={toValidate} />
          <TodayQueue items={thisWeek} />
          <BlockedList items={blocked} />
        </div>
      )}
    </div>
  );
}
