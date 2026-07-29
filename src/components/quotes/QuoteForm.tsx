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
import { useQuote, useCreateQuote, useUpdateQuote } from "@/lib/hooks/useQuotes";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { useContacts } from "@/lib/hooks/useContacts";
import { useDeal } from "@/lib/hooks/useDeals";

/** Schema du formulaire côté UI */
const quoteFormSchema = z.object({
  subject: z.string().min(1, "Le sujet est requis").max(500),
  company_id: z.string().min(1, "La société est requise"),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  notes: z.string().optional(),
  validity_days: z.number().int().min(1).max(365),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  quoteId?: string;
  dealId?: string;
  companyId?: string;
}

/**
 * Formulaire de création/édition d'un devis.
 * Si quoteId fourni → mode édition. Si dealId → pré-remplissage depuis le deal.
 */
export function QuoteForm({ quoteId, dealId, companyId }: QuoteFormProps) {
  const router = useRouter();
  const isEdit = !!quoteId;

  const { data: existingQuote, isLoading: isLoadingQuote } = useQuote(quoteId);
  const { data: prefillDeal } = useDeal(dealId);
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      subject: "",
      company_id: companyId ?? "",
      contact_id: "",
      deal_id: dealId ?? "",
      notes: "",
      validity_days: 30,
    },
  });

  const selectedCompanyId = watch("company_id");

  // Pré-remplir en mode édition
  useEffect(() => {
    if (existingQuote) {
      reset({
        subject: existingQuote.subject,
        company_id: existingQuote.company_id ?? "",
        contact_id: existingQuote.contact_id ?? "",
        deal_id: existingQuote.deal_id ?? "",
        notes: existingQuote.notes ?? "",
        validity_days: existingQuote.validity_days,
      });
    }
  }, [existingQuote, reset]);

  // Pré-remplir depuis le deal
  useEffect(() => {
    if (prefillDeal && !isEdit) {
      reset({
        subject: `Devis — ${prefillDeal.name}`,
        company_id: prefillDeal.company_id,
        deal_id: prefillDeal.id,
        contact_id: "",
        notes: "",
        validity_days: 30,
      });
    }
  }, [prefillDeal, isEdit, reset]);

  async function onSubmit(data: QuoteFormValues) {
    const payload = {
      subject: data.subject,
      company_id: data.company_id,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || null,
      notes: data.notes || null,
      validity_days: data.validity_days,
    };

    if (isEdit && quoteId) {
      await updateMutation.mutateAsync({ quoteId, input: payload });
      router.push(`/quotes/${quoteId}`);
    } else {
      const result = await createMutation.mutateAsync(payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour variable
      const newId = (result as any)?.id;
      router.push(newId ? `/quotes/${newId}` : "/quotes");
    }
  }

  if (isEdit && isLoadingQuote) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Extraire les listes (format paginé possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour paginé
  const companyList = Array.isArray(companies) ? companies : ((companies as any)?.data ?? []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour paginé
  const contactList = Array.isArray(contacts) ? contacts : ((contacts as any)?.data ?? []);

  // Filtrer les contacts liés à la société sélectionnée (si possible)
  const filteredContacts = selectedCompanyId
    ? contactList.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Relations variables
        (c: any) =>
          c.contact_companies?.some(
            (cc: { company_id: string }) => cc.company_id === selectedCompanyId,
          ) ?? true,
      )
    : contactList;

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sujet */}
        <div className="space-y-2">
          <Label htmlFor="subject">Sujet *</Label>
          <Input id="subject" {...register("subject")} aria-invalid={!!errors.subject} />
          {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
        </div>

        {/* Société + Contact */}
        <QuoteFormSelectors
          companyList={companyList}
          contactList={filteredContacts}
          register={register}
          errors={errors}
        />

        {/* Deal + Validité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deal_id">Deal (optionnel)</Label>
            <Input id="deal_id" {...register("deal_id")} placeholder="ID du deal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validity_days">Validité (jours)</Label>
            <Input
              id="validity_days"
              type="number"
              min={1}
              max={365}
              {...register("validity_days", { valueAsNumber: true })}
            />
            {errors.validity_days && (
              <p className="text-xs text-destructive">{errors.validity_days.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Introduction / Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={4} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="size-4" />
            Annuler
          </Button>
          <Button type="submit" disabled={isPending || isSubmitting}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? "Enregistrer" : "Créer le devis"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------
// Sous-composant : sélecteurs société / contact
// ------------------------------------------------------------------

interface QuoteFormSelectorsProps {
  companyList: Array<{ id: string; name: string }>;
  contactList: Array<{ id: string; first_name: string; last_name: string }>;
  register: ReturnType<typeof useForm<QuoteFormValues>>["register"];
  errors: ReturnType<typeof useForm<QuoteFormValues>>["formState"]["errors"];
}

function QuoteFormSelectors({
  companyList,
  contactList,
  register,
  errors,
}: QuoteFormSelectorsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="company_id">Société *</Label>
        <select
          id="company_id"
          {...register("company_id")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-invalid={!!errors.company_id}
        >
          <option value="">Sélectionner une société</option>
          {companyList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.company_id && (
          <p className="text-xs text-destructive">{errors.company_id.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_id">Contact</Label>
        <select
          id="contact_id"
          {...register("contact_id")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Aucun contact</option>
          {contactList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
