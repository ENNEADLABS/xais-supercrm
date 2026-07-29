"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantConfig, useUpdateCommercialConfig } from "@/lib/hooks/useTenantConfig";
import { commercialConfigSchema, type CommercialConfigInput } from "@/lib/schemas/settings";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;

/**
 * Configuration commerciale : prefixes, TVA, delais de paiement, devise.
 */
export function CommercialSettings() {
  const { data: config, isLoading } = useTenantConfig();
  const updateMutation = useUpdateCommercialConfig();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
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

  // Synchroniser quand les donnees arrivent
  useEffect(() => {
    if (config) {
      reset({
        quote_prefix: config.quote_prefix,
        invoice_prefix: config.invoice_prefix,
        default_vat_rate: config.default_vat_rate,
        payment_terms_days: config.payment_terms_days,
        currency: config.currency as CommercialConfigInput["currency"],
      });
    }
  }, [config, reset]);

  const onSubmit = (data: CommercialConfigInput) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <CommercialSkeleton />;
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Configuration commerciale</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quote-prefix">Préfixe devis</Label>
              <Input
                id="quote-prefix"
                {...register("quote_prefix")}
                className="uppercase"
                placeholder="DEV"
              />
              {errors.quote_prefix && (
                <p className="text-sm text-destructive">{errors.quote_prefix.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-prefix">Préfixe factures</Label>
              <Input
                id="invoice-prefix"
                {...register("invoice_prefix")}
                className="uppercase"
                placeholder="FAC"
              />
              {errors.invoice_prefix && (
                <p className="text-sm text-destructive">{errors.invoice_prefix.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat-rate">TVA par défaut (%)</Label>
              <Input
                id="vat-rate"
                type="number"
                step={1}
                min={0}
                max={10000}
                {...register("default_vat_rate", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">En basis points (2000 = 20%)</p>
              {errors.default_vat_rate && (
                <p className="text-sm text-destructive">{errors.default_vat_rate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-terms">Délai de paiement (jours)</Label>
              <Input
                id="payment-terms"
                type="number"
                min={0}
                max={365}
                {...register("payment_terms_days", { valueAsNumber: true })}
              />
              {errors.payment_terms_days && (
                <p className="text-sm text-destructive">{errors.payment_terms_days.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <select
              id="currency"
              {...register("currency")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            )}
          </div>

          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CommercialSkeleton() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-9 animate-pulse rounded bg-muted" />
          <div className="h-9 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-9 animate-pulse rounded bg-muted" />
          <div className="h-9 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
