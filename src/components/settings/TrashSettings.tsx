"use client";

import { useState } from "react";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTrashItems, useRestoreItem, usePermanentDelete } from "@/lib/hooks/useTrash";
import { SOFT_DELETABLE_LABELS, type SoftDeletableTable } from "@/lib/supabase/softDelete";

const ENTITY_TYPES: Array<{ value: SoftDeletableTable | "all"; label: string }> = [
  { value: "all", label: "Tout" },
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Sociétés" },
  { value: "deals", label: "Opportunités" },
  { value: "products", label: "Produits" },
  { value: "quotes", label: "Devis" },
  { value: "invoices", label: "Factures" },
  { value: "notes", label: "Notes" },
];

/**
 * Onglet Corbeille — visible uniquement pour les admins.
 * Permet de restaurer ou supprimer définitivement les enregistrements soft-deleted.
 */
export function TrashSettings() {
  const [filter, setFilter] = useState<SoftDeletableTable | undefined>(undefined);
  const { data: items, isLoading } = useTrashItems(filter);
  const restore = useRestoreItem();
  const permanentDelete = usePermanentDelete();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="size-4" />
          Corbeille
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Éléments supprimés — restaurez-les ou supprimez-les définitivement.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtre par type */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map(({ value, label }) => (
            <Button
              key={value}
              variant={(value === "all" ? undefined : value) === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(value === "all" ? undefined : value)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Chargement...
          </div>
        ) : !items || items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            La corbeille est vide.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Supprimé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.entityType}:${item.id}`}>
                  <TableCell>
                    <Badge variant="outline">{SOFT_DELETABLE_LABELS[item.entityType]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">{item.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.deletedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Restaurer */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={restore.isPending}
                        onClick={() => restore.mutate({ entityType: item.entityType, id: item.id })}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Restaurer
                      </Button>

                      {/* Supprimer définitivement */}
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                          <Trash2 className="mr-1 size-3" />
                          Supprimer
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{item.label}</strong> sera supprimé de façon irréversible.
                              Cette action ne peut pas être annulée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                permanentDelete.mutate({
                                  entityType: item.entityType,
                                  id: item.id,
                                })
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
