"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreatePayment } from "@/lib/hooks/usePayments";
import { paymentMethodValues } from "@/lib/schemas/payment";
import { formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/payment-labels";

/** Schema formulaire : montant en euros (converti en centimes au submit) */
const paymentFormSchema = z.object({
  amountEuros: z.number().positive("Le montant doit être positif"),
  payment_date: z.string().min(1, "La date est requise"),
  payment_method: z.enum(paymentMethodValues),
  reference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface InvoicePaymentDialogProps {
  invoiceId: string;
  totalTtc: number;
  paidAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePaymentDialog({
  invoiceId,
  totalTtc,
  paidAmount,
  open,
  onOpenChange,
}: InvoicePaymentDialogProps) {
  const remaining = totalTtc - paidAmount;
  const createPayment = useCreatePayment();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amountEuros: remaining / 100,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "virement",
      reference: "",
      notes: "",
    },
  });

  const selectedMethod = watch("payment_method");

  async function onSubmit(data: PaymentFormValues) {
    const amountCents = Math.round(data.amountEuros * 100);
    await createPayment.mutateAsync({
      invoice_id: invoiceId,
      amount: amountCents,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      reference: data.reference || null,
      notes: data.notes || null,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Reste à payer : {formatCurrency(remaining)}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountEuros">Montant (€)</Label>
              <Input
                id="amountEuros"
                type="number"
                step="0.01"
                min={0.01}
                max={remaining / 100}
                {...register("amountEuros", { valueAsNumber: true })}
                aria-invalid={!!errors.amountEuros}
              />
              {errors.amountEuros && (
                <p className="text-xs text-destructive">{errors.amountEuros.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Date de paiement</Label>
              <Input id="payment_date" type="date" {...register("payment_date")} />
              {errors.payment_date && (
                <p className="text-xs text-destructive">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select
                value={selectedMethod}
                onValueChange={(v: string | null) =>
                  v && setValue("payment_method", v as PaymentFormValues["payment_method"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodValues.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                placeholder="N° virement, chèque..."
                {...register("reference")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Commentaire optionnel..."
              rows={2}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
