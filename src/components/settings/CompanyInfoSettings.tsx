"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantConfig, useUpdateCompanyInfo } from "@/lib/hooks/useTenantConfig";
import { companyInfoSchema, type CompanyInfoInput } from "@/lib/schemas/settings";

const EMPTY_DEFAULTS: CompanyInfoInput = {
  legal_name: "",
  address: "",
  city: "",
  postal_code: "",
  country: "France",
  phone: "",
  email: "",
  siret: "",
  vat_number: "",
  capital: "",
  rcs: "",
  ape_code: "",
  vat_exempt_293b: false,
};

/**
 * Formulaire d'informations legales de la societe.
 * Ces informations apparaissent sur les PDF de devis et factures.
 */
export function CompanyInfoSettings() {
  const { data: config, isLoading } = useTenantConfig();
  const updateMutation = useUpdateCompanyInfo();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyInfoInput>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  // Synchroniser avec les donnees existantes
  useEffect(() => {
    if (config?.company_info) {
      reset({
        ...EMPTY_DEFAULTS,
        ...config.company_info,
      });
    }
  }, [config, reset]);

  const onSubmit = (data: CompanyInfoInput) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <CompanyInfoSkeleton />;
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Informations société</CardTitle>
        <CardDescription>
          Ces informations apparaissent sur vos devis et factures PDF. Le logo sera disponible en
          V2.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Raison sociale</Label>
            <Input id="legal_name" {...register("legal_name")} placeholder="Ma Société SAS" />
            {errors.legal_name && (
              <p className="text-sm text-destructive">{errors.legal_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...register("address")} placeholder="12 rue de la Paix" />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input id="postal_code" {...register("postal_code")} placeholder="75002" />
              {errors.postal_code && (
                <p className="text-sm text-destructive">{errors.postal_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" {...register("city")} placeholder="Paris" />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" {...register("country")} placeholder="France" />
            {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} placeholder="+33 0 00 00 00 00" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="contact@example.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" {...register("siret")} placeholder="123 456 789 00012" />
              {errors.siret && <p className="text-sm text-destructive">{errors.siret.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">N° TVA intracommunautaire</Label>
              <Input id="vat_number" {...register("vat_number")} placeholder="FR12345678901" />
              {errors.vat_number && (
                <p className="text-sm text-destructive">{errors.vat_number.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <input
              id="vat_exempt_293b"
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              {...register("vat_exempt_293b")}
            />
            <div className="space-y-1">
              <Label htmlFor="vat_exempt_293b">Franchise en base de TVA (art. 293 B du CGI)</Label>
              <p className="text-sm text-muted-foreground">
                Ajoute la mention « TVA non applicable, art. 293 B du CGI » sur les devis et
                factures PDF, et masque la ligne TVA quand elle est nulle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capital">Capital social</Label>
              <Input id="capital" {...register("capital")} placeholder="10 000 €" />
              {errors.capital && (
                <p className="text-sm text-destructive">{errors.capital.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcs">RCS</Label>
              <Input id="rcs" {...register("rcs")} placeholder="Paris B 123 456 789" />
              {errors.rcs && <p className="text-sm text-destructive">{errors.rcs.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ape_code">Code APE</Label>
              <Input id="ape_code" {...register("ape_code")} placeholder="6201Z" />
              {errors.ape_code && (
                <p className="text-sm text-destructive">{errors.ape_code.message}</p>
              )}
            </div>
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

function CompanyInfoSkeleton() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}
