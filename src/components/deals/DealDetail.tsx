"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeal, useCloseDeal, useReopenDeal } from "@/lib/hooks/useDeals";
import { usePipelineStages } from "@/lib/hooks/useTenantConfig";

import { EntityTasksTab } from "@/components/tasks";
import { EntityDocumentsTab } from "@/components/documents";

import { DealDetailHeader } from "./DealDetailHeader";
import { DealInfoTab } from "./DealInfoTab";
import { DealContactsTab } from "./DealContactsTab";
import { DealNotesTab } from "./DealNotesTab";
import { DealActivitiesTab } from "./DealActivitiesTab";

interface DealDetailProps {
  dealId: string;
}

/**
 * Page de détail d'un deal avec tabs : Infos, Contacts, Notes, Activité.
 */
export function DealDetail({ dealId }: DealDetailProps) {
  const router = useRouter();
  const { data: deal, isLoading } = useDeal(dealId);
  const { data: stages } = usePipelineStages();
  const closeMutation = useCloseDeal();
  const reopenMutation = useReopenDeal();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Deal introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/pipeline")}>
          Retour au pipeline
        </Button>
      </div>
    );
  }

  // Trouver le stage courant pour afficher la couleur
  const currentStage = stages?.find((s) => s.id === deal.stage);

  // Extraire la société liée (relation Supabase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const company = (deal as any).companies as { id: string; name: string } | undefined;

  // Extraire les contacts liés
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const dealContacts = ((deal as any).deal_contacts ?? []) as Array<{
    id: string;
    contact_id: string;
    role: string | null;
    contacts: { id: string; first_name: string; last_name: string; email: string | null };
  }>;

  const isOpen = deal.deal_status === "open";

  function handleLose() {
    const reason = window.prompt("Motif de perte :");
    if (reason) {
      closeMutation.mutate({ dealId, dealStatus: "lost", lostReason: reason });
    }
  }

  return (
    <div className="space-y-6">
      <DealDetailHeader
        deal={deal}
        currentStage={currentStage}
        company={company}
        isOpen={isOpen}
        onEdit={() => router.push(`/deals/${dealId}/edit`)}
        onWin={() => closeMutation.mutate({ dealId, dealStatus: "won" })}
        onLose={handleLose}
        onReopen={() => reopenMutation.mutate({ dealId, stage: "new" })}
      />

      {/* Onglets */}
      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activities">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <DealInfoTab deal={deal} stages={stages ?? []} />
        </TabsContent>
        <TabsContent value="contacts">
          <DealContactsTab dealId={dealId} contacts={dealContacts} />
        </TabsContent>
        <TabsContent value="notes">
          <DealNotesTab dealId={dealId} />
        </TabsContent>
        <TabsContent value="tasks">
          <EntityTasksTab entityType="deal" entityId={dealId} />
        </TabsContent>
        <TabsContent value="documents">
          <EntityDocumentsTab entityType="deal" entityId={dealId} />
        </TabsContent>
        <TabsContent value="activities">
          <DealActivitiesTab dealId={dealId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
