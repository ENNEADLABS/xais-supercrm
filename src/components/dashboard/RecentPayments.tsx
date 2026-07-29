"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHOD_SHORT, type PaymentMethod } from "@/lib/utils/payment-labels";

interface RecentPaymentsProps {
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    invoice_reference: string | null;
    company_name: string | null;
  }>;
}

export function RecentPayments({ payments }: RecentPaymentsProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Paiements récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" />
          Paiements récents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {p.company_name ?? "—"}
                {p.invoice_reference && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({p.invoice_reference})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.payment_date).toLocaleDateString("fr-FR")} ·{" "}
                {PAYMENT_METHOD_SHORT[p.payment_method] ?? p.payment_method}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-green-600">
              +{formatCurrency(p.amount)}
            </span>
          </div>
        ))}
        <Link
          href="/invoices"
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Voir toutes les factures →
        </Link>
      </CardContent>
    </Card>
  );
}
