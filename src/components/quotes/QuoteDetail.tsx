"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuote } from "@/lib/hooks/useQuotes";
import { useQuoteLines } from "@/lib/hooks/useQuoteLines";
import { QuoteLineEditor } from "./QuoteLineEditor";
import { QuoteLineSummary } from "./QuoteLineSummary";
import { EntityTasksTab } from "@/components/tasks";
import { EntityDocumentsTab } from "@/components/documents";
import { QuoteNotesTab } from "./QuoteNotesTab";
import { QuoteActivitiesTab } from "./QuoteActivitiesTab";
import { QuoteHeader } from "./QuoteHeader";
import { QuoteInfoCards } from "./QuoteInfoCards";

interface QuoteDetailProps {
  quoteId: string;
}

/**
 * Page de détail d'un devis avec lignes, totaux, notes et activités.
 */
export function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const router = useRouter();
  const { data: quote, isLoading } = useQuote(quoteId);
  const { data: lines } = useQuoteLines(quoteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Devis introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/quotes")}>
          Retour aux devis
        </Button>
      </div>
    );
  }

  const isDraft = quote.status === "draft";

  // Relations Supabase (jointures)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const company = (quote as any).companies as { id: string; name: string } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const contact = (quote as any).contacts as
    | {
        id: string;
        first_name: string;
        last_name: string;
      }
    | undefined;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <QuoteHeader quote={quote} quoteId={quoteId} isDraft={isDraft} company={company} />

      {/* Infos rapides */}
      <QuoteInfoCards quote={quote} company={company} contact={contact} />

      {/* Texte d'introduction */}
      {quote.notes && (
        <Card className="p-4">
          <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
        </Card>
      )}

      {/* Lignes du devis */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Lignes</h2>
        <QuoteLineEditor quoteId={quoteId} lines={lines ?? []} isEditable={isDraft} />
      </div>

      {/* Totaux */}
      <div className="flex justify-end">
        <QuoteLineSummary
          totalHt={quote.total_ht}
          totalTax={quote.total_tax}
          totalTtc={quote.total_ttc}
        />
      </div>

      <Separator />

      {/* Onglets Notes / Tâches / Documents / Activité */}
      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activities">Activité</TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
          <QuoteNotesTab quoteId={quoteId} />
        </TabsContent>
        <TabsContent value="tasks">
          <EntityTasksTab entityType="quote" entityId={quoteId} />
        </TabsContent>
        <TabsContent value="documents">
          <EntityDocumentsTab entityType="quote" entityId={quoteId} />
        </TabsContent>
        <TabsContent value="activities">
          <QuoteActivitiesTab quoteId={quoteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
