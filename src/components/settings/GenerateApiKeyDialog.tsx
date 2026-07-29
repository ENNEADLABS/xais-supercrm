"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGenerateApiKey } from "@/lib/hooks/useApiKeys";
import { createApiKeySchema, type CreateApiKeyInput } from "@/lib/schemas/apiKey";

interface GenerateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Generation d'une cle API : formulaire (libelle) puis affichage unique de
 * la cle brute — jamais re-obtenue apres fermeture de ce dialog.
 */
export function GenerateApiKeyDialog({ open, onOpenChange }: GenerateApiKeyDialogProps) {
  const generateApiKey = useGenerateApiKey();
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { label: "" },
  });

  const onSubmit = (data: CreateApiKeyInput) => {
    generateApiKey.mutate(data.label);
  };

  // Tant que la cle brute est affichee (une seule fois), ESC / clic hors du
  // dialog / X l'effaceraient definitivement : fermeture uniquement via le
  // bouton "Fermer" (allowCloseRef), le X etant masque pendant l'affichage.
  const allowCloseRef = useRef(false);
  const keyDisplayed = !!generateApiKey.data;

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && keyDisplayed && !allowCloseRef.current) return;
    if (!nextOpen) {
      reset();
      generateApiKey.reset();
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const closeExplicitly = () => {
    allowCloseRef.current = true;
    handleClose(false);
    allowCloseRef.current = false;
  };

  const handleCopy = async () => {
    if (!generateApiKey.data) return;
    try {
      await navigator.clipboard.writeText(generateApiKey.data.rawKey);
      setCopied(true);
      toast.success("Clé copiée");
    } catch {
      toast.error("Copie impossible — sélectionnez la clé manuellement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={!keyDisplayed}>
        {!generateApiKey.data ? (
          <>
            <DialogHeader>
              <DialogTitle>Générer une clé API</DialogTitle>
              <DialogDescription>
                Pour un bot externe (ex. un agent qui écrit des contacts/notes).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-label">Libellé</Label>
                <Input id="api-key-label" placeholder="ClaudeClaw — comms" {...register("label")} />
                {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={generateApiKey.isPending}>
                  {generateApiKey.isPending && <Loader2 className="size-4 animate-spin" />}
                  Générer
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Clé générée</DialogTitle>
              <DialogDescription>
                Copiez-la maintenant — elle ne sera plus jamais affichée.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm break-all">
              {generateApiKey.data.rawKey}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copiée" : "Copier"}
              </Button>
              <Button onClick={closeExplicitly}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
