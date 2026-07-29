"use client";

import Link from "next/link";
import { Mail, Phone, Briefcase, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Contact } from "@/types/database";
import { ContactChannels } from "./ContactChannels";

interface ContactInfoTabProps {
  contact: Contact;
  contactId: string;
}

/**
 * Onglet Infos : détails du contact dans une Card.
 */
export function ContactInfoTab({ contact, contactId }: ContactInfoTabProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Informations</h2>
        <Button variant="outline" size="sm" render={<Link href={`/contacts/${contactId}/edit`} />}>
          Modifier
        </Button>
      </div>

      <Separator className="my-4" />

      <dl className="space-y-5">
        {/* Emails */}
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <dt className="w-24 shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">Email</dt>
          <dd className="flex-1">
            <ContactChannels contactId={contactId} type="email" primaryValue={contact.email} />
          </dd>
        </div>

        {/* Téléphones */}
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <dt className="w-24 shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
            Téléphone
          </dt>
          <dd className="flex-1">
            <ContactChannels contactId={contactId} type="phone" primaryValue={contact.phone} />
          </dd>
        </div>

        <InfoRow icon={Briefcase} label="Poste" value={contact.job_title} />
        <InfoRow
          icon={Calendar}
          label="Créé le"
          value={new Date(contact.created_at).toLocaleDateString("fr-FR")}
        />
        <InfoRow
          icon={Calendar}
          label="Modifié le"
          value={new Date(contact.updated_at).toLocaleDateString("fr-FR")}
        />
      </dl>
    </Card>
  );
}

/** Ligne d'information avec icône */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <dt className="w-24 shrink-0 text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}
