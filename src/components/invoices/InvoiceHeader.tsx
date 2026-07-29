import Link from "next/link";
import { Building2, Edit2, Loader2, CreditCard, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePdfDownload } from "@/lib/hooks/usePdfDownload";
import type { InvoiceStatus } from "@/types/database";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoiceStatusActions } from "./InvoiceStatusActions";

interface InvoiceHeaderProps {
  invoice: {
    reference: string | null;
    subject: string;
    status: InvoiceStatus;
    total_ttc: number;
    paid_amount: number;
    is_credit_note: boolean;
    credit_note_for: string | null;
    source_quote_id: string | null;
  };
  invoiceId: string;
  isDraft: boolean;
  company?: { id: string; name: string };
}

/** En-tete de la fiche facture : titre, badges, liens et actions. */
export function InvoiceHeader({ invoice, invoiceId, isDraft, company }: InvoiceHeaderProps) {
  const { downloadPdf, isGenerating } = usePdfDownload();

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {invoice.reference ?? "Brouillon"} — {invoice.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.is_credit_note && (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <CreditCard className="mr-1 size-3" />
              Avoir
            </Badge>
          )}
          {invoice.credit_note_for && (
            <Link
              href={`/invoices/${invoice.credit_note_for}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Voir la facture originale
            </Link>
          )}
          {invoice.source_quote_id && (
            <Link
              href={`/quotes/${invoice.source_quote_id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <FileText className="size-3.5" />
              Voir le devis source
            </Link>
          )}
          {company && (
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Building2 className="size-3.5" />
              {company.name}
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isGenerating}
          onClick={() =>
            downloadPdf(
              "invoice",
              invoiceId,
              invoice.reference ? `${invoice.reference}.pdf` : undefined,
            )
          }
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          PDF
        </Button>
        {isDraft && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/invoices/${invoiceId}/edit`} />}
          >
            <Edit2 className="size-4" />
            Modifier
          </Button>
        )}
        <InvoiceStatusActions
          invoiceId={invoiceId}
          status={invoice.status}
          totalTtc={invoice.total_ttc}
          paidAmount={invoice.paid_amount}
        />
      </div>
    </div>
  );
}
