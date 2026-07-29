"use client";

import { useRouter } from "next/navigation";
import { Building2, ExternalLink, MoreHorizontal, Pencil, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityStatusBadge, TagSelector, NoteList, ActivityTimeline } from "@/components/crm";
import { EntityTasksTab } from "@/components/tasks";
import { EntityDocumentsTab } from "@/components/documents";
import { useCompany, useArchiveCompany } from "@/lib/hooks/useCompanies";
import { useTags, useAssignTag, useRemoveTag } from "@/lib/hooks/useTags";
import { useNotes, useCreateNote, useDeleteNote } from "@/lib/hooks/useNotes";
import { useActivities } from "@/lib/hooks/useActivities";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { CompanyContactsList, type ContactWithRole } from "./CompanyContactsList";

interface CompanyDetailProps {
  companyId: string;
}

/**
 * Page detail d'une societe avec onglets (Infos, Contacts, Notes, Activite).
 */
export function CompanyDetail({ companyId }: CompanyDetailProps) {
  const router = useRouter();
  const { data: company, isLoading } = useCompany(companyId);
  const { data: allTags } = useTags("company");
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();
  const archiveMutation = useArchiveCompany();
  const { data: notes } = useNotes("company", companyId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const { data: activities } = useActivities("company", companyId);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>;
  }

  if (!company) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Societe introuvable.</div>
    );
  }

  const companyTags = (company.tags ?? []) as unknown as Array<{
    tag_id: string;
    tags?: { id: string };
  }>;
  const tagIds = companyTags.map((ct) => ct.tags?.id ?? ct.tag_id ?? "").filter(Boolean);

  function handleArchive() {
    archiveMutation.mutate(companyId, {
      onSuccess: () => router.push("/companies"),
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.industry && (
                <p className="text-sm text-muted-foreground">{company.industry}</p>
              )}
            </div>
            <EntityStatusBadge status={company.status} />
          </div>
          <TagSelector
            entityType="company"
            assignedTagIds={tagIds}
            availableTags={allTags ?? []}
            onAssign={(tagId) => assignTag.mutate({ entityId: companyId, tagId, type: "company" })}
            onRemove={(tagId) => removeTag.mutate({ entityId: companyId, tagId, type: "company" })}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/edit`)}>
              <Pencil className="mr-2 size-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 size-4" />
              Archiver
            </DropdownMenuItem>
            {company.website && (
              <DropdownMenuItem
                render={<a href={company.website} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink className="mr-2 size-4" />
                Voir le site web
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activite</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <CompanyInfoCard company={company} />
        </TabsContent>

        <TabsContent value="contacts">
          <CompanyContactsList
            contacts={(company.contacts ?? []) as unknown as ContactWithRole[]}
          />
        </TabsContent>

        <TabsContent value="notes">
          <NoteList
            notes={notes ?? []}
            onAdd={(content) =>
              createNote.mutate({ entity_type: "company", entity_id: companyId, content })
            }
            onDelete={(noteId) =>
              deleteNote.mutate({ noteId, entityType: "company", entityId: companyId })
            }
          />
        </TabsContent>

        <TabsContent value="tasks">
          <EntityTasksTab entityType="company" entityId={companyId} />
        </TabsContent>

        <TabsContent value="documents">
          <EntityDocumentsTab entityType="company" entityId={companyId} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline activities={activities ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
