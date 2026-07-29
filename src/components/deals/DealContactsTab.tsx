"use client";

import Link from "next/link";
import { User, Unlink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUnlinkDealContact } from "@/lib/hooks/useDeals";

/** Type d'une ligne contact liée au deal (relation Supabase résolue) */
export interface DealContactRow {
  id: string;
  contact_id: string;
  role: string | null;
  contacts: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

interface DealContactsTabProps {
  dealId: string;
  contacts: DealContactRow[];
}

/**
 * Onglet Contacts : liste des contacts liés au deal.
 */
export function DealContactsTab({ dealId, contacts }: DealContactsTabProps) {
  const unlinkMutation = useUnlinkDealContact();

  if (contacts.length === 0) {
    return (
      <div className="py-8 text-center">
        <User className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Aucun contact lié à ce deal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((link) => {
        const contact = link.contacts;
        return (
          <Card key={link.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div>
                <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                  {contact.first_name} {contact.last_name}
                </Link>
                {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                {link.role && (
                  <Badge variant="outline" className="mt-1">
                    {link.role}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => unlinkMutation.mutate({ dealId, contactId: contact.id })}
              disabled={unlinkMutation.isPending}
              aria-label={`Délier ${contact.first_name} ${contact.last_name}`}
            >
              <Unlink className="size-4" />
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
