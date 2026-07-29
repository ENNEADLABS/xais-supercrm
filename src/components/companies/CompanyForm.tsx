"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/schemas/company";
import { useCompany, useCreateCompany, useUpdateCompany } from "@/lib/hooks/useCompanies";

interface CompanyFormProps {
  companyId?: string;
}

/**
 * Formulaire creation / edition d'une societe.
 * En mode edition, pre-remplit avec les donnees existantes.
 */
export function CompanyForm({ companyId }: CompanyFormProps) {
  const router = useRouter();
  const isEdit = !!companyId;

  const { data: company, isLoading: isLoadingCompany } = useCompany(companyId);
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema) as never,
    values:
      isEdit && company
        ? {
            name: company.name,
            status: company.status,
            domain: company.domain,
            industry: company.industry,
            size: company.size,
            address: company.address,
            city: company.city,
            postal_code: company.postal_code,
            country: company.country ?? "FR",
            phone: company.phone,
            website: company.website,
            siren: company.siren,
            siret: company.siret,
            vat_number: company.vat_number,
            legal_form: company.legal_form,
            // Affichage en euros, stockage en centimes
            capital: company.capital != null ? company.capital / 100 : null,
            naf_code: company.naf_code,
          }
        : { name: "", country: "FR", status: "active" as const },
  });

  async function onSubmit(data: CreateCompanyInput) {
    const payload = {
      ...data,
      // Convertir capital euros → centimes avant envoi
      capital: data.capital != null ? Math.round(data.capital * 100) : null,
    };
    if (isEdit && companyId) {
      await updateMutation.mutateAsync({ companyId, input: payload });
      router.push(`/companies/${companyId}`);
    } else {
      await createMutation.mutateAsync(payload);
      router.push("/companies");
    }
  }

  if (isEdit && isLoadingCompany) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>;
  }

  const title = isEdit ? "Modifier la societe" : "Nouvelle societe";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations generales */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Informations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nom *" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Acme SAS" />
            </FormField>
            <FormField label="Domaine" error={errors.domain?.message}>
              <Input {...register("domain")} placeholder="acme.fr" />
            </FormField>
            <FormField label="Secteur" error={errors.industry?.message}>
              <Input {...register("industry")} placeholder="Technologie" />
            </FormField>
            <FormField label="Taille" error={errors.size?.message}>
              <Input {...register("size")} placeholder="10-50" />
            </FormField>
          </div>
        </Card>

        <Separator />

        {/* Adresse */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Adresse</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Adresse" error={errors.address?.message}>
                <Input {...register("address")} placeholder="12 rue de la Paix" />
              </FormField>
            </div>
            <FormField label="Ville" error={errors.city?.message}>
              <Input {...register("city")} placeholder="Paris" />
            </FormField>
            <FormField label="Code postal" error={errors.postal_code?.message}>
              <Input {...register("postal_code")} placeholder="75001" />
            </FormField>
            <FormField label="Pays" error={errors.country?.message}>
              <Input {...register("country")} placeholder="FR" />
            </FormField>
          </div>
        </Card>

        <Separator />

        {/* Contact */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Contact</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Telephone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+33 0 00 00 00 00" />
            </FormField>
            <FormField label="Site web" error={errors.website?.message}>
              <Input {...register("website")} placeholder="https://acme.fr" />
            </FormField>
          </div>
        </Card>

        <Separator />

        {/* Informations légales PME FR */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Informations légales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="SIREN" error={errors.siren?.message}>
              <Input {...register("siren")} placeholder="123456789" maxLength={9} />
            </FormField>
            <FormField label="SIRET" error={errors.siret?.message}>
              <Input {...register("siret")} placeholder="12345678900010" maxLength={14} />
            </FormField>
            <FormField label="N° TVA intracom" error={errors.vat_number?.message}>
              <Input {...register("vat_number")} placeholder="FR12123456789" />
            </FormField>
            <FormField label="Forme juridique" error={errors.legal_form?.message}>
              <Input {...register("legal_form")} placeholder="SAS, SARL, EURL, SA, EI…" />
            </FormField>
            <FormField label="Capital (€)" error={errors.capital?.message}>
              <Input
                {...register("capital", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
                type="number"
                min={0}
                step={1}
                placeholder="50000"
              />
            </FormField>
            <FormField label="Code NAF / APE" error={errors.naf_code?.message}>
              <Input {...register("naf_code")} placeholder="6201Z" maxLength={5} />
            </FormField>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : isEdit ? "Mettre a jour" : "Creer la societe"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// --- Sous-composant champ de formulaire ---

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
