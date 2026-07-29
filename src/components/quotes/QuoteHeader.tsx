import Link from "next/link";
import { Building2, Edit2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePdfDownload } from "@/lib/hooks/usePdfDownload";
import type { QuoteStatus } from "@/types/database";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QuoteStatusActions } from "./QuoteStatusActions";

interface QuoteHeaderProps {
  quote: {
    reference: string | null;
    subject: string;
    status: QuoteStatus;
    total_ttc: number;
  };
  quoteId: string;
  isDraft: boolean;
  company?: { id: string; name: string };
}

/** En-tete de la fiche devis : titre, badge, lien societe et actions. */
export function QuoteHeader({ quote, quoteId, isDraft, company }: QuoteHeaderProps) {
  const { downloadPdf, isGenerating } = usePdfDownload();

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {quote.reference ?? "Brouillon"} — {quote.subject}
        </h1>
        <div className="flex items-center gap-2">
          <QuoteStatusBadge status={quote.status} />
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
            downloadPdf("quote", quoteId, quote.reference ? `${quote.reference}.pdf` : undefined)
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
          <Button variant="outline" size="sm" render={<Link href={`/quotes/${quoteId}/edit`} />}>
            <Edit2 className="size-4" />
            Modifier
          </Button>
        )}
        <QuoteStatusActions
          quoteId={quoteId}
          status={quote.status}
          quoteName={quote.subject}
          totalTtc={quote.total_ttc}
        />
      </div>
    </div>
  );
}
