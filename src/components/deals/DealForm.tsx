"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useDeal, useCreateDeal, useUpdateDeal } from "@/lib/hooks/useDeals";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { usePipelineStages } from "@/lib/hooks/useTenantConfig";
import { createDealSchema, updateDealSchema } from "@/lib/schemas/deal";

/** Valeurs du formulaire (montant affiché en euros, converti en centimes au submit) */
interface DealFormValues {
  name: string;
  company_id: string;
  stage: string;
  amount_display: string;
  probability: string;
  expected_close_date: string;
  assigned_to: string;
}

interface DealFormProps {
  dealId?: string;
}

/**
 * Formulaire de création/édition de deal.
 * Si dealId est fourni, mode édition avec pré-remplissage.
 */
export function DealForm({ dealId }: DealFormProps) {
  const router = useRouter();
  const isEdit = !!dealId;

  const { data: existingDeal, isLoading: isLoadingDeal } = useDeal(dealId);
  const { data: companies } = useCompanies();
  const { data: stages } = usePipelineStages();
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({
    // Validation zod appliquée sur les données transformées dans onSubmit
    defaultValues: {
      name: "",
      company_id: "",
      stage: "new",
      amount_display: "",
      probability: "",
      expected_close_date: "",
      assigned_to: "",
    },
  });

  // Pré-remplir en mode édition
  useEffect(() => {
    if (existingDeal) {
      reset({
        name: existingDeal.name,
        company_id: existingDeal.company_id,
        stage: existingDeal.stage,
        amount_display: existingDeal.amount != null ? (existingDeal.amount / 100).toString() : "",
        probability: existingDeal.probability != null ? existingDeal.probability.toString() : "",
        expected_close_date: existingDeal.expected_close_date ?? "",
        assigned_to: existingDeal.assigned_to ?? "",
      });
    }
  }, [existingDeal, reset]);

  async function onSubmit(data: DealFormValues) {
    // Convertir les euros affichés en centimes
    const amountCents = data.amount_display
      ? Math.round(parseFloat(data.amount_display) * 100)
      : null;
    const probability = data.probability ? parseInt(data.probability, 10) : null;

    const payload = {
      name: data.name,
      company_id: data.company_id,
      stage: data.stage,
      amount: amountCents,
      probability,
      expected_close_date: data.expected_close_date || null,
      assigned_to: data.assigned_to || null,
    };

    // Valider avec zod avant envoi
    const schema = isEdit ? updateDealSchema : createDealSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    if (isEdit && dealId) {
      await updateMutation.mutateAsync({ dealId, input: parsed.data });
      router.push(`/deals/${dealId}`);
    } else {
      await createMutation.mutateAsync(
        parsed.data as Parameters<typeof createMutation.mutateAsync>[0],
      );
      router.push("/pipeline");
    }
  }

  if (isEdit && isLoadingDeal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Extraire la liste des sociétés (résultat paginé)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cast nécessaire : format de retour paginé
  const companyList = Array.isArray(companies) ? companies : ((companies as any)?.data ?? []);

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="name">Nom du deal *</Label>
          <Input
            id="name"
            {...register("name", { required: "Le nom est requis" })}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Société */}
        <div className="space-y-2">
          <Label htmlFor="company_id">Société *</Label>
          <select
            id="company_id"
            {...register("company_id", { required: "La société est requise" })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-invalid={!!errors.company_id}
          >
            <option value="">Sélectionner une société</option>
            {companyList.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.company_id && (
            <p className="text-xs text-destructive">{errors.company_id.message}</p>
          )}
        </div>

        {/* Stage + Probabilité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              {...register("stage")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {(stages ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="probability">Probabilité (%)</Label>
            <Input id="probability" type="number" min="0" max="100" {...register("probability")} />
          </div>
        </div>

        {/* Montant + Date de clôture */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount_display">Montant (€)</Label>
            <Input
              id="amount_display"
              type="number"
              step="0.01"
              min="0"
              {...register("amount_display")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Date de clôture prévue</Label>
            <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="size-4" />
            Annuler
          </Button>
          <Button type="submit" disabled={isPending || isSubmitting}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? "Enregistrer" : "Créer le deal"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
