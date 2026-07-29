"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityTasksTab } from "@/components/tasks/EntityTasksTab";
import { EntityDocumentsTab } from "@/components/documents/EntityDocumentsTab";
import { useContentPiece } from "@/lib/hooks/useContentPieces";
import { ContentDetailHeader } from "./ContentDetailHeader";
import { ScriptEditor } from "./ScriptEditor";
import { AssetList } from "./AssetList";
import { DeliverableList } from "./DeliverableList";
import { RepurposingMatrix } from "./RepurposingMatrix";
import { ChecklistPanel } from "./ChecklistPanel";
import { ContentActivity } from "./ContentActivity";

interface ContentDetailProps {
  pieceId: string;
}

/**
 * Fiche detaillee d'un contenu : en-tete + onglets (script, assets, livrables,
 * checklist, taches, documents, activite).
 */
export function ContentDetail({ pieceId }: ContentDetailProps) {
  const router = useRouter();
  const { data: piece, isLoading } = useContentPiece(pieceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/studio/board")}>
          <ArrowLeft className="size-4" />
          Retour au board
        </Button>
        <p className="text-sm text-muted-foreground">Contenu introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContentDetailHeader piece={piece} />

      <Tabs defaultValue="script">
        <TabsList className="flex-wrap">
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="deliverables">Livrables</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="pt-4">
          <ScriptEditor contentPieceId={pieceId} />
        </TabsContent>
        <TabsContent value="assets" className="pt-4">
          <AssetList contentPieceId={pieceId} />
        </TabsContent>
        <TabsContent value="deliverables" className="space-y-6 pt-4">
          <DeliverableList contentPieceId={pieceId} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matrice de repurposing</CardTitle>
            </CardHeader>
            <CardContent>
              <RepurposingMatrix contentPieceId={pieceId} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="checklist" className="pt-4">
          <ChecklistPanel contentPieceId={pieceId} />
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <EntityTasksTab entityType="content_piece" entityId={pieceId} />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <EntityDocumentsTab entityType="content_piece" entityId={pieceId} />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <ContentActivity contentPieceId={pieceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
