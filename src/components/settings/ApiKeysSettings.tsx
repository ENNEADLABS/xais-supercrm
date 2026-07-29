"use client";

import { useState } from "react";
import { Loader2, Plus, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApiKeys, useRevokeApiKey } from "@/lib/hooks/useApiKeys";
import { GenerateApiKeyDialog } from "./GenerateApiKeyDialog";

/**
 * Gestion des cles API pour les bots externes : liste, generation, revocation.
 * Admin uniquement (verifie cote serveur par requireAdmin() dans les actions).
 */
export function ApiKeysSettings() {
  const { data: apiKeys, isLoading, isError, refetch } = useApiKeys();
  const revokeApiKey = useRevokeApiKey();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const handleRevoke = () => {
    if (!confirmRevokeId) return;
    revokeApiKey.mutate(confirmRevokeId);
    setConfirmRevokeId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clés API</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus className="size-4" />
            Générer une clé
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isError ? (
          // Ne jamais afficher un echec comme une liste vide : c'est ce qui a
          // masque un 500 prod (migration manquante) derriere "Aucune clé".
          <div className="flex items-center gap-3">
            <p className="text-sm text-destructive">Impossible de charger les clés API.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune clé générée pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Préfixe</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Dernière utilisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.label}</TableCell>
                  <TableCell className="font-mono text-xs">{key.key_prefix}…</TableCell>
                  <TableCell>{new Date(key.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString("fr-FR")
                      : "Jamais"}
                  </TableCell>
                  <TableCell>
                    {key.revoked_at ? (
                      <Badge variant="outline">Révoquée</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!key.revoked_at && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRevokeId(key.id)}>
                        <Ban className="size-4" />
                        Révoquer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <GenerateApiKeyDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      <AlertDialog open={!!confirmRevokeId} onOpenChange={() => setConfirmRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer cette clé ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le bot qui l&apos;utilise ne pourra plus écrire dans le CRM. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Révoquer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
