"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useContacts } from "@/lib/hooks/useContacts";
import type { Contact } from "@/types/database";

interface ContactPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeId: string; // Contact courant a exclure de la liste
  onSelect: (contact: Contact) => void;
}

export function ContactPickerDialog({
  open,
  onOpenChange,
  excludeId,
  onSelect,
}: ContactPickerDialogProps) {
  const [query, setQuery] = useState("");
  const { data } = useContacts({ query, page: 1, per_page: 10 });
  const contacts = (data?.data ?? []).filter((c) => c.id !== excludeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un contact</DialogTitle>
          <DialogDescription>Recherchez le contact avec lequel fusionner.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-auto">
          {contacts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun contact trouvé</p>
          ) : (
            <div className="space-y-1">
              {contacts.map((contact) => (
                <Button
                  key={contact.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    onSelect(contact);
                    onOpenChange(false);
                  }}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{contact.email ?? "—"}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
