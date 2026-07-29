"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useContact, useCreateContact, useUpdateContact } from "@/lib/hooks/useContacts";
import { createContactSchema } from "@/lib/schemas/contact";

/** Type d'entrée du formulaire (avant transformation Zod) */
interface ContactFormValues {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
}

interface ContactFormProps {
  contactId?: string;
}

/**
 * Formulaire de création/édition de contact.
 * Si contactId est fourni, on pré-remplit et on utilise updateContact.
 */
export function ContactForm({ contactId }: ContactFormProps) {
  const router = useRouter();
  const isEdit = !!contactId;

  const { data: existingContact, isLoading: isLoadingContact } = useContact(contactId);
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(createContactSchema) as never,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      job_title: "",
    },
  });

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (existingContact) {
      reset({
        first_name: existingContact.first_name,
        last_name: existingContact.last_name,
        email: existingContact.email ?? "",
        phone: existingContact.phone ?? "",
        job_title: existingContact.job_title ?? "",
      });
    }
  }, [existingContact, reset]);

  async function onSubmit(data: ContactFormValues) {
    // Convertir les champs vides en null, ajouter le statut par défaut
    const cleaned = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone: data.phone || null,
      job_title: data.job_title || null,
      status: "active" as const,
    };

    if (isEdit && contactId) {
      await updateMutation.mutateAsync({ contactId, input: cleaned });
      router.push(`/contacts/${contactId}`);
    } else {
      await createMutation.mutateAsync(cleaned);
      router.push("/contacts");
    }
  }

  if (isEdit && isLoadingContact) {
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
        {/* Nom / Prénom */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom *</Label>
            <Input id="first_name" {...register("first_name")} aria-invalid={!!errors.first_name} />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom *</Label>
            <Input id="last_name" {...register("last_name")} aria-invalid={!!errors.last_name} />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Téléphone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" type="tel" {...register("phone")} />
        </div>

        {/* Poste */}
        <div className="space-y-2">
          <Label htmlFor="job_title">Poste</Label>
          <Input id="job_title" {...register("job_title")} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="size-4" />
            Annuler
          </Button>
          <Button type="submit" disabled={isPending || isSubmitting}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? "Enregistrer" : "Créer le contact"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
