"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/lib/hooks/useProducts";

/** Schema formulaire : prix affiché en euros, converti en centimes au submit */
const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().optional(),
  reference: z.string().max(50).optional(),
  unit_price_display: z.string().min(1, "Le prix est requis"),
  unit: z.string(),
  vat_rate_display: z.string(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  productId?: string;
}

/**
 * Formulaire de création/édition d'un produit.
 * Prix affiché en euros, stocké en centimes.
 * TVA affichée en %, stockée en basis points.
 */
export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!productId;

  const { data: existingProduct, isLoading: isLoadingProduct } = useProduct(productId);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      reference: "",
      unit_price_display: "",
      unit: "unité",
      vat_rate_display: "20",
    },
  });

  // Pré-remplir en mode édition
  useEffect(() => {
    if (existingProduct) {
      reset({
        name: existingProduct.name,
        description: existingProduct.description ?? "",
        reference: existingProduct.reference ?? "",
        unit_price_display: (existingProduct.unit_price / 100).toFixed(2),
        unit: existingProduct.unit ?? "unité",
        vat_rate_display: (existingProduct.vat_rate / 100).toFixed(1),
      });
    }
  }, [existingProduct, reset]);

  async function onSubmit(data: ProductFormValues) {
    // Convertir euros → centimes, % → basis points
    const unitPriceCents = Math.round(parseFloat(data.unit_price_display) * 100);
    const vatRateBp = Math.round(parseFloat(data.vat_rate_display) * 100);

    const payload = {
      name: data.name,
      description: data.description || null,
      reference: data.reference || null,
      unit_price: unitPriceCents,
      unit: data.unit,
      vat_rate: vatRateBp,
    };

    if (isEdit && productId) {
      await updateMutation.mutateAsync({ productId, input: payload });
      router.push("/products");
    } else {
      await createMutation.mutateAsync(payload);
      router.push("/products");
    }
  }

  if (isEdit && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} rows={3} />
        </div>

        {/* Référence + Unité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input id="reference" {...register("reference")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unité</Label>
            <Input id="unit" {...register("unit")} />
          </div>
        </div>

        {/* Prix + TVA */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unit_price_display">Prix unitaire HT (EUR) *</Label>
            <Input
              id="unit_price_display"
              type="number"
              step="0.01"
              min="0"
              {...register("unit_price_display")}
              aria-invalid={!!errors.unit_price_display}
            />
            {errors.unit_price_display && (
              <p className="text-xs text-destructive">{errors.unit_price_display.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vat_rate_display">Taux de TVA (%)</Label>
            <Input
              id="vat_rate_display"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register("vat_rate_display")}
            />
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
            {isEdit ? "Enregistrer" : "Créer le produit"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
