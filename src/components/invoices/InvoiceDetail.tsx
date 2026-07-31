"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvoice } from "@/lib/hooks/useInvoices";
import { useInvoiceLines } from "@/lib/hooks/useInvoiceLines";
import { InvoiceLineEditor } from "./InvoiceLineEditor";
import { InvoiceLineSummary } from "./InvoiceLineSummary";
import { EntityTasksTab } from "@/components/tasks";
import { EntityDocumentsTab } from "@/components/documents";
import { InvoiceNotesTab } from "./InvoiceNotesTab";
import { InvoiceActivitiesTab } from "./InvoiceActivitiesTab";
import { InvoicePaymentsTab } from "./InvoicePaymentsTab";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceInfoCards } from "./InvoiceInfoCards";

interface InvoiceDetailProps {
  invoiceId: string;
}

/**
 * Page de détail d'une facture avec lignes, totaux, paiements, notes et activités.
 */
export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: lines } = useInvoiceLines(invoiceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Facture introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/invoices")}>
          Retour aux factures
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === "draft";

  // Relations Supabase (jointures)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const company = (invoice as any).companies as { id: string; name: string } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : Supabase ne résout pas la relation
  const contact = (invoice as any).contacts as
    { id: string; first_name: string; last_name: string } | undefined;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <InvoiceHeader invoice={invoice} invoiceId={invoiceId} isDraft={isDraft} company={company} />

      {/* Infos rapides */}
      <InvoiceInfoCards invoice={invoice} company={company} contact={contact} />

      {/* Notes de la facture */}
      {invoice.notes && (
        <Card className="p-4">
          <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </Card>
      )}

      {/* Lignes de la facture */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Lignes</h2>
        <InvoiceLineEditor invoiceId={invoiceId} lines={lines ?? []} isEditable={isDraft} />
      </div>

      {/* Totaux + progression paiement */}
      <div className="flex justify-end">
        <InvoiceLineSummary
          totalHt={invoice.total_ht}
          totalTax={invoice.total_tax}
          totalTtc={invoice.total_ttc}
          paidAmount={invoice.paid_amount}
        />
      </div>

      <Separator />

      {/* Onglets Paiements / Notes / Tâches / Documents / Activité */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activities">Activité</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <InvoicePaymentsTab
            invoiceId={invoiceId}
            totalTtc={invoice.total_ttc}
            paidAmount={invoice.paid_amount}
            status={invoice.status}
          />
        </TabsContent>
        <TabsContent value="notes">
          <InvoiceNotesTab invoiceId={invoiceId} />
        </TabsContent>
        <TabsContent value="tasks">
          <EntityTasksTab entityType="invoice" entityId={invoiceId} />
        </TabsContent>
        <TabsContent value="documents">
          <EntityDocumentsTab entityType="invoice" entityId={invoiceId} />
        </TabsContent>
        <TabsContent value="activities">
          <InvoiceActivitiesTab invoiceId={invoiceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
