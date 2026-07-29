"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization, useUpdateOrganization } from "@/lib/hooks/useOrganization";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/schemas/settings";

/**
 * Formulaire de modification des informations de l'organisation.
 */
export function OrganizationSettings() {
  const { data: org, isLoading } = useOrganization();
  const updateMutation = useUpdateOrganization();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: "" },
  });

  // Synchroniser le formulaire quand les donnees arrivent
  useEffect(() => {
    if (org) reset({ name: org.name });
  }, [org, reset]);

  const onSubmit = (data: UpdateOrganizationInput) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <OrganizationSkeleton />;
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Informations de l&apos;organisation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Nom</Label>
            <Input id="org-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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

function OrganizationSkeleton() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
