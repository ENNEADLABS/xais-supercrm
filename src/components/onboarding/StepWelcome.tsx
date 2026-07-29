"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/schemas/settings";
import { updateOrganizationAction } from "@/lib/actions/settings";

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: UpdateOrganizationInput) {
    setLoading(true);
    try {
      await updateOrganizationAction(data);
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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="size-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Bienvenue sur ENNEAD Studio Creator !</h2>
          <p className="max-w-md text-muted-foreground">
            Configurons votre espace de travail en quelques minutes. Commencez par donner un nom à
            votre organisation.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l&apos;organisation</Label>
            <Input id="name" placeholder="Ma Société SAS" {...register("name")} autoFocus />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Continuer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
