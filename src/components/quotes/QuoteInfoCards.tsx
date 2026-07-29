import Link from "next/link";
import { Handshake, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface QuoteInfoCardsProps {
  quote: {
    deal_id: string | null;
    contact_id: string | null;
    validity_days: number;
    created_at: string;
    sent_at: string | null;
    signed_at: string | null;
    total_ttc: number;
    version: number;
  };
  company?: { id: string; name: string };
  contact?: { id: string; first_name: string; last_name: string };
}

/** Cartes d'infos rapides du devis (contact, deal, validite, montant, dates). */
export function QuoteInfoCards({ quote, contact }: QuoteInfoCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Contact</p>
        <p className="text-sm font-medium">
          {contact ? (
            <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
              {contact.first_name} {contact.last_name}
            </Link>
          ) : (
            "—"
          )}
        </p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Deal</p>
        <p className="text-sm font-medium">
          {quote.deal_id ? (
            <Link
              href={`/deals/${quote.deal_id}`}
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Handshake className="size-3.5" />
              Voir le deal
            </Link>
          ) : (
            "—"
          )}
        </p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Validité</p>
        <p className="text-sm font-medium">{quote.validity_days} jours</p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Montant TTC</p>
        <p className="text-sm font-semibold">{formatCurrency(quote.total_ttc)}</p>
      </Card>
      {quote.sent_at && (
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Envoyé le</p>
          <p className="inline-flex items-center gap-1 text-sm font-medium">
            <Calendar className="size-3.5" />
            {new Date(quote.sent_at).toLocaleDateString("fr-FR")}
          </p>
        </Card>
      )}
      {quote.signed_at && (
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Signé le</p>
          <p className="inline-flex items-center gap-1 text-sm font-medium">
            <Calendar className="size-3.5" />
            {new Date(quote.signed_at).toLocaleDateString("fr-FR")}
          </p>
        </Card>
      )}
    </div>
  );
}
