"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/lib/hooks/useProducts";
import { formatCurrency } from "@/lib/utils/format";

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (productId: string, quantity: number) => void;
}

/**
 * Dialog de sélection d'un produit du catalogue.
 * Permet de chercher, sélectionner et définir la quantité.
 */
export function ProductPicker({ open, onOpenChange, onSelect }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products } = useProducts({ query: search, page: 1, per_page: 50 });

  // Extraire la liste (format paginé possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour paginé
  const productList = Array.isArray(products) ? products : ((products as any)?.data ?? []);

  function handleConfirm() {
    if (!selectedId) return;
    onSelect(selectedId, quantity);
    // Réinitialiser
    setSelectedId(null);
    setQuantity(1);
    setSearch("");
    onOpenChange(false);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setSelectedId(null);
      setQuantity(1);
      setSearch("");
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter depuis le catalogue</DialogTitle>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9"
          />
        </div>

        {/* Liste des produits */}
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {productList.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun produit trouvé.</p>
          )}
          {productList.map(
            (p: {
              id: string;
              name: string;
              reference: string | null;
              unit_price: number;
              unit: string | null;
            }) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === p.id ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.reference && (
                      <span className="ml-2 text-xs text-muted-foreground">{p.reference}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(p.unit_price)}/{p.unit ?? "unité"}
                  </span>
                </div>
              </button>
            ),
          )}
        </div>

        {/* Quantité (visible si un produit est sélectionné) */}
        {selectedId && (
          <div className="flex items-center gap-3">
            <Label htmlFor="picker-qty">Quantité</Label>
            <Input
              id="picker-qty"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-24"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
