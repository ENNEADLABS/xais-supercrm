import Link from "next/link";
import { Handshake, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface InvoiceInfoCardsProps {
  invoice: {
    deal_id: string | null;
    contact_id: string | null;
    due_date: string | null;
    issued_at: string | null;
    sent_at: string | null;
    total_ttc: number;
    paid_amount: number;
  };
  company?: { id: string; name: string };
  contact?: { id: string; first_name: string; last_name: string };
}

/** Cartes d'infos rapides de la facture (contact, deal, montant, dates). */
export function InvoiceInfoCards({ invoice, contact }: InvoiceInfoCardsProps) {
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
          {invoice.deal_id ? (
            <Link
              href={`/deals/${invoice.deal_id}`}
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
        <p className="text-xs text-muted-foreground">Montant TTC</p>
        <p className="text-sm font-semibold">{formatCurrency(invoice.total_ttc)}</p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Échéance</p>
        <p className="text-sm font-medium">
          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("fr-FR") : "—"}
        </p>
      </Card>
      {invoice.issued_at && (
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Émise le</p>
          <p className="inline-flex items-center gap-1 text-sm font-medium">
            <Calendar className="size-3.5" />
            {new Date(invoice.issued_at).toLocaleDateString("fr-FR")}
          </p>
        </Card>
      )}
      {invoice.sent_at && (
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Envoyée le</p>
          <p className="inline-flex items-center gap-1 text-sm font-medium">
            <Calendar className="size-3.5" />
            {new Date(invoice.sent_at).toLocaleDateString("fr-FR")}
          </p>
        </Card>
      )}
    </div>
  );
}
