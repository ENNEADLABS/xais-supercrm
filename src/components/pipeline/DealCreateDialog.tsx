"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDeal } from "@/lib/hooks/useDeals";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { usePipelineStages } from "@/lib/hooks/useTenantConfig";
import { createDealSchema } from "@/lib/schemas/deal";
import type { z } from "zod";

// Utiliser le type input (avant .default()) pour le formulaire
type DealFormValues = z.input<typeof createDealSchema>;

interface DealCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStage?: string;
}

/**
 * Dialog de creation rapide d'un deal depuis le kanban.
 */
export function DealCreateDialog({ open, onOpenChange, defaultStage }: DealCreateDialogProps) {
  const createDeal = useCreateDeal();
  const { data: companies } = useCompanies();
  const { data: stages } = usePipelineStages();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      stage: defaultStage ?? "new",
    },
  });

  const onSubmit = async (data: DealFormValues) => {
    // Apres validation Zod, stage est garanti present via .default("new")
    await createDeal.mutateAsync({ ...data, stage: data.stage ?? "new" });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-name">Nom du deal</Label>
            <Input id="deal-name" {...register("name")} placeholder="Ex: Refonte site web" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-company">Société</Label>
            <select
              id="deal-company"
              {...register("company_id")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Sélectionner une société</option>
              {(
                (companies as { data: { id: string; name: string }[] } | undefined)?.data ?? []
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.company_id && (
              <p className="text-sm text-red-600">{errors.company_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-amount">Montant (en centimes)</Label>
            <Input
              id="deal-amount"
              type="number"
              {...register("amount", { valueAsNumber: true })}
              placeholder="Ex: 500000 (= 5 000 €)"
            />
            {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-stage">Stage</Label>
            <select
              id="deal-stage"
              {...register("stage")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {stages?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
