"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMergeContacts } from "@/lib/hooks/useContacts";
import type { Contact } from "@/types/database";

// Champs fusionnables
const MERGE_FIELDS = [
  { key: "first_name", label: "Prénom" },
  { key: "last_name", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "job_title", label: "Poste" },
] as const;

type MergeFieldKey = (typeof MERGE_FIELDS)[number]["key"];

interface ContactMergeDialogProps {
  contactA: Contact;
  contactB: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged?: (winnerId: string) => void;
}

export function ContactMergeDialog({
  contactA,
  contactB,
  open,
  onOpenChange,
  onMerged,
}: ContactMergeDialogProps) {
  // Par defaut, contactA est le winner pour chaque champ
  const [selections, setSelections] = useState<Record<MergeFieldKey, "a" | "b">>(() => {
    const init: Record<string, "a" | "b"> = {};
    for (const field of MERGE_FIELDS) {
      init[field.key] = "a";
    }
    return init as Record<MergeFieldKey, "a" | "b">;
  });

  const merge = useMergeContacts();

  function getFieldValue(contact: Contact, key: string): string {
    const val = (contact as Record<string, unknown>)[key];
    return val != null ? String(val) : "—";
  }

  async function handleMerge() {
    // Le winner est contactA, on construit les overrides depuis les selections "b"
    const fieldOverrides: Record<string, unknown> = {};
    for (const field of MERGE_FIELDS) {
      if (selections[field.key] === "b") {
        fieldOverrides[field.key] = (contactB as Record<string, unknown>)[field.key];
      }
    }

    await merge.mutateAsync({
      winner_id: contactA.id,
      loser_id: contactB.id,
      field_overrides: Object.keys(fieldOverrides).length > 0 ? fieldOverrides : undefined,
    });

    onOpenChange(false);
    onMerged?.(contactA.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fusionner les contacts</DialogTitle>
          <DialogDescription>
            Choisissez la valeur à conserver pour chaque champ. Le contact B sera supprimé et toutes
            ses relations transférées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_2fr_2fr] gap-2 text-xs font-medium text-muted-foreground">
            <span>Champ</span>
            <span>Contact A (conservé)</span>
            <span>Contact B (supprimé)</span>
          </div>

          {/* Champs */}
          {MERGE_FIELDS.map((field) => {
            const valA = getFieldValue(contactA, field.key);
            const valB = getFieldValue(contactB, field.key);
            const identical = valA === valB;

            return (
              <div
                key={field.key}
                className="grid grid-cols-[1fr_2fr_2fr] items-center gap-2 rounded-md border p-2"
              >
                <span className="text-sm font-medium">{field.label}</span>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${
                    selections[field.key] === "a"
                      ? "bg-green-50 font-medium"
                      : "text-muted-foreground"
                  } ${identical ? "text-muted-foreground" : ""}`}
                >
                  <input
                    type="radio"
                    name={field.key}
                    checked={selections[field.key] === "a"}
                    onChange={() => setSelections((s) => ({ ...s, [field.key]: "a" }))}
                    className="accent-green-600"
                  />
                  {valA}
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${
                    selections[field.key] === "b"
                      ? "bg-green-50 font-medium"
                      : "text-muted-foreground"
                  } ${identical ? "text-muted-foreground" : ""}`}
                >
                  <input
                    type="radio"
                    name={field.key}
                    checked={selections[field.key] === "b"}
                    onChange={() => setSelections((s) => ({ ...s, [field.key]: "b" }))}
                    className="accent-green-600"
                  />
                  {valB}
                </label>
              </div>
            );
          })}
        </div>

        {/* Avertissement */}
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Cette action est irréversible. Toutes les relations du contact B (sociétés, deals,
            devis, factures, emails, notes, tâches, documents) seront transférées au contact A.
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleMerge} disabled={merge.isPending}>
            {merge.isPending ? "Fusion en cours..." : "Fusionner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
