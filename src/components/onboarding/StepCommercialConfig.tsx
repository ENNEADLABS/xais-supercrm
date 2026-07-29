"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { commercialConfigSchema, type CommercialConfigInput } from "@/lib/schemas/settings";
import { updateCommercialConfigAction } from "@/lib/actions/settings";

interface StepCommercialConfigProps {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepCommercialConfig({ onNext, onSkip, onBack }: StepCommercialConfigProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommercialConfigInput>({
    resolver: zodResolver(commercialConfigSchema),
    defaultValues: {
      quote_prefix: "DEV",
      invoice_prefix: "FAC",
      default_vat_rate: 2000,
      payment_terms_days: 30,
      currency: "EUR",
    },
  });

  async function onSubmit(data: CommercialConfigInput) {
    setLoading(true);
    try {
      await updateCommercialConfigAction(data);
      onNext();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <h2 className="text-xl font-bold">Préférences commerciales</h2>
          <p className="text-sm text-muted-foreground">
            Configurez vos devis et factures. Modifiable à tout moment dans les paramètres.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="quote_prefix">Préfixe devis</Label>
              <Input id="quote_prefix" placeholder="DEV" {...register("quote_prefix")} />
              {errors.quote_prefix && (
                <p className="text-xs text-destructive">{errors.quote_prefix.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="invoice_prefix">Préfixe factures</Label>
              <Input id="invoice_prefix" placeholder="FAC" {...register("invoice_prefix")} />
              {errors.invoice_prefix && (
                <p className="text-xs text-destructive">{errors.invoice_prefix.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="default_vat_rate">Taux TVA (basis points)</Label>
              <Input
                id="default_vat_rate"
                type="number"
                placeholder="2000"
                {...register("default_vat_rate", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">2000 = 20%, 550 = 5.5%</p>
              {errors.default_vat_rate && (
                <p className="text-xs text-destructive">{errors.default_vat_rate.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment_terms_days">Délai de paiement (jours)</Label>
              <Input
                id="payment_terms_days"
                type="number"
                placeholder="30"
                {...register("payment_terms_days", { valueAsNumber: true })}
              />
              {errors.payment_terms_days && (
                <p className="text-xs text-destructive">{errors.payment_terms_days.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Devise</Label>
              <select
                id="currency"
                {...register("currency")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF (Fr)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onBack}>
              Retour
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onSkip}>
                Passer
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Continuer"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
