"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagSelector } from "@/components/crm";
import { useContact, useArchiveContact } from "@/lib/hooks/useContacts";
import { useTags, useAssignTag, useRemoveTag } from "@/lib/hooks/useTags";

import { EntityTasksTab } from "@/components/tasks";
import { EntityDocumentsTab } from "@/components/documents";

import { ContactDetailHeader } from "./ContactDetailHeader";
import { ContactInfoTab } from "./ContactInfoTab";
import { ContactCompaniesTab, type ContactCompanyRow } from "./ContactCompaniesTab";
import { ContactNotesTab } from "./ContactNotesTab";
import { ContactActivitiesTab } from "./ContactActivitiesTab";
import { ContactPickerDialog } from "./ContactPickerDialog";
import { ContactMergeDialog } from "./ContactMergeDialog";
import type { Contact } from "@/types/database";

interface ContactDetailProps {
  contactId: string;
}

/**
 * Page de détail d'un contact avec tabs : Infos, Sociétés, Notes, Activité.
 */
export function ContactDetail({ contactId }: ContactDetailProps) {
  const router = useRouter();
  const { data: contact, isLoading } = useContact(contactId);
  const { data: allTags } = useTags("contact");
  const archiveMutation = useArchiveContact();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Contact | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Contact introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/contacts")}>
          Retour aux contacts
        </Button>
      </div>
    );
  }

  // Extraire les IDs des tags assignés
  // Le type Supabase ne résout pas la relation, on cast le résultat runtime
  const tagRows = (contact.tags ?? []) as unknown as Array<{
    tag_id: string;
    tags?: { id: string };
  }>;
  const assignedTagIds = tagRows.map((ct) => ct.tag_id ?? ct.tags?.id ?? "").filter(Boolean);

  async function handleArchive() {
    await archiveMutation.mutateAsync(contactId);
    router.push("/contacts");
  }

  return (
    <div className="space-y-6">
      <ContactDetailHeader
        contact={contact}
        onEdit={() => router.push(`/contacts/${contactId}/edit`)}
        onArchive={handleArchive}
        onMerge={() => setPickerOpen(true)}
      />

      {/* Tags */}
      <TagSelector
        entityType="contact"
        assignedTagIds={assignedTagIds}
        availableTags={allTags ?? []}
        onAssign={(tagId) => assignTag.mutate({ entityId: contactId, tagId, type: "contact" })}
        onRemove={(tagId) => removeTag.mutate({ entityId: contactId, tagId, type: "contact" })}
      />

      {/* Onglets */}
      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="companies">Sociétés</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activities">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <ContactInfoTab contact={contact} contactId={contactId} />
        </TabsContent>
        <TabsContent value="companies">
          <ContactCompaniesTab
            contactId={contactId}
            companies={(contact.companies ?? []) as unknown as ContactCompanyRow[]}
          />
        </TabsContent>
        <TabsContent value="notes">
          <ContactNotesTab contactId={contactId} />
        </TabsContent>
        <TabsContent value="tasks">
          <EntityTasksTab entityType="contact" entityId={contactId} />
        </TabsContent>
        <TabsContent value="documents">
          <EntityDocumentsTab entityType="contact" entityId={contactId} />
        </TabsContent>
        <TabsContent value="activities">
          <ContactActivitiesTab contactId={contactId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs de fusion */}
      <ContactPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeId={contactId}
        onSelect={(selected) => setMergeTarget(selected)}
      />
      {mergeTarget && (
        <ContactMergeDialog
          contactA={contact as unknown as Contact}
          contactB={mergeTarget}
          open={!!mergeTarget}
          onOpenChange={(open) => !open && setMergeTarget(null)}
          onMerged={(winnerId) => {
            setMergeTarget(null);
            router.push(`/contacts/${winnerId}`);
          }}
        />
      )}
    </div>
  );
}
