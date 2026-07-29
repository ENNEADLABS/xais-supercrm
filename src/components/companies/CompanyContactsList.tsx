import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Contact } from "@/types/database";

export interface ContactWithRole {
  contacts?: Contact;
  role?: string | null;
}

interface CompanyContactsListProps {
  contacts: ContactWithRole[];
}

/** Liste des contacts rattaches a une societe. */
export function CompanyContactsList({ contacts }: CompanyContactsListProps) {
  if (contacts.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Aucun contact lie a cette societe.</p>;
  }

  return (
    <div className="space-y-2">
      {contacts.map((cc) => {
        const contact = cc.contacts;
        if (!contact) return null;
        return (
          <Card key={contact.id} className="p-3">
            <Link
              href={`/contacts/${contact.id}`}
              className="flex items-center justify-between hover:underline"
            >
              <div>
                <p className="text-sm font-medium">
                  {contact.first_name} {contact.last_name}
                </p>
                {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
              </div>
              {cc.role && <span className="text-xs text-muted-foreground">{cc.role}</span>}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
