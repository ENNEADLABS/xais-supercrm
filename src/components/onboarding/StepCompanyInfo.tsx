"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { companyInfoSchema, type CompanyInfoInput } from "@/lib/schemas/settings";
import { updateCompanyInfoAction } from "@/lib/actions/settings";

interface StepCompanyInfoProps {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const FIELDS = [
  { name: "legal_name", label: "Raison sociale", placeholder: "Ma Société SAS" },
  { name: "address", label: "Adresse", placeholder: "12 rue de la Paix" },
  { name: "city", label: "Ville", placeholder: "Paris" },
  { name: "postal_code", label: "Code postal", placeholder: "75001" },
  { name: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
  { name: "vat_number", label: "N° TVA", placeholder: "FR12345678901" },
  { name: "email", label: "Email de facturation", placeholder: "compta@example.com" },
  { name: "phone", label: "Téléphone", placeholder: "01 23 45 67 89" },
] as const;

export function StepCompanyInfo({ onNext, onSkip, onBack }: StepCompanyInfoProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInfoInput>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
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
      vat_exempt_293b: false,
    },
  });

  async function onSubmit(data: CompanyInfoInput) {
    setLoading(true);
    try {
      await updateCompanyInfoAction(data);
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
          <h2 className="text-xl font-bold">Informations de votre société</h2>
          <p className="text-sm text-muted-foreground">
            Ces informations apparaîtront sur vos devis et factures.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  {...register(field.name as keyof CompanyInfoInput)}
                />
                {errors[field.name as keyof CompanyInfoInput] && (
                  <p className="text-xs text-destructive">
                    {errors[field.name as keyof CompanyInfoInput]?.message}
                  </p>
                )}
              </div>
            ))}
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
