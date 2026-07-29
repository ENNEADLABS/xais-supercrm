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
import { useInvoice, useCreateInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { useCompanies } from "@/lib/hooks/useCompanies";
import { useContacts } from "@/lib/hooks/useContacts";

/** Schema du formulaire c\u00f4t\u00e9 UI */
const invoiceFormSchema = z.object({
  subject: z.string().min(1, "Le sujet est requis").max(500),
  company_id: z.string().min(1, "La société est requise"),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoiceId?: string;
}

/**
 * Formulaire de cr\u00e9ation/\u00e9dition d'une facture.
 * Si invoiceId fourni \u2192 mode \u00e9dition.
 */
export function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoiceId;

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(invoiceId);
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      subject: "",
      company_id: "",
      contact_id: "",
      deal_id: "",
      notes: "",
      due_date: "",
    },
  });

  const selectedCompanyId = watch("company_id");

  // Pr\u00e9-remplir en mode \u00e9dition
  useEffect(() => {
    if (existingInvoice) {
      reset({
        subject: existingInvoice.subject,
        company_id: existingInvoice.company_id ?? "",
        contact_id: existingInvoice.contact_id ?? "",
        deal_id: existingInvoice.deal_id ?? "",
        notes: existingInvoice.notes ?? "",
        due_date: existingInvoice.due_date ?? "",
      });
    }
  }, [existingInvoice, reset]);

  async function onSubmit(data: InvoiceFormValues) {
    const payload = {
      subject: data.subject,
      company_id: data.company_id,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || null,
      notes: data.notes || null,
      due_date: data.due_date || null,
    };

    if (isEdit && invoiceId) {
      await updateMutation.mutateAsync({ invoiceId, input: payload });
      router.push(`/invoices/${invoiceId}`);
    } else {
      const result = await createMutation.mutateAsync(payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour variable
      const newId = (result as any)?.id;
      router.push(newId ? `/invoices/${newId}` : "/invoices");
    }
  }

  if (isEdit && isLoadingInvoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Extraire les listes (format pagin\u00e9 possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour pagin\u00e9
  const companyList = Array.isArray(companies) ? companies : ((companies as any)?.data ?? []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour pagin\u00e9
  const contactList = Array.isArray(contacts) ? contacts : ((contacts as any)?.data ?? []);

  // Filtrer les contacts li\u00e9s \u00e0 la soci\u00e9t\u00e9 s\u00e9lectionn\u00e9e
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

        {/* Soci\u00e9t\u00e9 + Contact */}
        <InvoiceFormSelectors
          companyList={companyList}
          contactList={filteredContacts}
          register={register}
          errors={errors}
        />

        {/* Deal + \u00c9ch\u00e9ance */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deal_id">Deal (optionnel)</Label>
            <Input id="deal_id" {...register("deal_id")} placeholder="ID du deal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Date d'échéance</Label>
            <Input id="due_date" type="date" {...register("due_date")} />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
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
            {isEdit ? "Enregistrer" : "Créer la facture"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------
// Sous-composant : s\u00e9lecteurs soci\u00e9t\u00e9 / contact
// ------------------------------------------------------------------

interface InvoiceFormSelectorsProps {
  companyList: Array<{ id: string; name: string }>;
  contactList: Array<{ id: string; first_name: string; last_name: string }>;
  register: ReturnType<typeof useForm<InvoiceFormValues>>["register"];
  errors: ReturnType<typeof useForm<InvoiceFormValues>>["formState"]["errors"];
}

function InvoiceFormSelectors({
  companyList,
  contactList,
  register,
  errors,
}: InvoiceFormSelectorsProps) {
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
