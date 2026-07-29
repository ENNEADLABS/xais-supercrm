"use client";

import { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddQuoteLine,
  useUpdateQuoteLine,
  useDeleteQuoteLine,
  useAddFromProduct,
} from "@/lib/hooks/useQuoteLines";
import { formatCurrency } from "@/lib/utils/format";
import type { QuoteLine } from "@/types/database";

import { ProductPicker } from "./ProductPicker";

interface QuoteLineEditorProps {
  quoteId: string;
  lines: QuoteLine[];
  isEditable: boolean;
}

/**
 * Tableau des lignes de devis.
 * Mode éditable (draft) : inline edit, ajout, suppression.
 * Mode lecture : affichage simple.
 */
export function QuoteLineEditor({ quoteId, lines, isEditable }: QuoteLineEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addLine = useAddQuoteLine();
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  const addFromProduct = useAddFromProduct();

  /** Ajouter une ligne vide */
  function handleAddEmptyLine() {
    addLine.mutate({
      quoteId,
      input: {
        quote_id: quoteId,
        description: "Nouvelle ligne",
        quantity: 1,
        unit: "unité",
        unit_price: 0,
        discount_percent: 0,
        vat_rate: 2000,
        position: lines.length,
      },
    });
  }

  /** Ajouter depuis le catalogue */
  function handleProductSelect(productId: string, quantity: number) {
    addFromProduct.mutate({ quoteId, productId, quantity });
  }

  /** Mise à jour d'un champ de ligne (on blur) */
  function handleFieldUpdate(lineId: string, field: string, value: string) {
    const numericFields = ["quantity", "unit_price", "discount_percent", "vat_rate"];
    let parsed: string | number = numericFields.includes(field) ? Number(value) : value;

    // Convertir le taux TVA saisi en % vers des basis points (ex: 20 → 2000)
    if (field === "vat_rate" && typeof parsed === "number") {
      parsed = Math.round(parsed * 100);
    }

    updateLine.mutate({
      quoteId,
      lineId,
      input: { [field]: parsed },
    });
  }

  return (
    <div className="space-y-3">
      {/* En-tête du tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground">
              <th className="pb-2 pr-2">Description</th>
              <th className="w-20 pb-2 pr-2 text-right">Qté</th>
              <th className="w-20 pb-2 pr-2">Unité</th>
              <th className="w-28 pb-2 pr-2 text-right">PU HT</th>
              <th className="w-20 pb-2 pr-2 text-right">Remise %</th>
              <th className="w-20 pb-2 pr-2 text-right">TVA %</th>
              <th className="w-28 pb-2 text-right">Total HT</th>
              {isEditable && <th className="w-10 pb-2" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <QuoteLineRow
                key={line.id}
                line={line}
                quoteId={quoteId}
                isEditable={isEditable}
                onFieldUpdate={handleFieldUpdate}
                onDelete={() => deleteLine.mutate({ quoteId, lineId: line.id })}
              />
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 8 : 7} className="py-6 text-center text-muted-foreground">
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Boutons d'ajout (mode éditable uniquement) */}
      {isEditable && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAddEmptyLine}>
            <Plus className="size-4" />
            Ajouter une ligne
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <Package className="size-4" />
            Depuis le catalogue
          </Button>

          <ProductPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelect={handleProductSelect}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Sous-composant : ligne du tableau
// ------------------------------------------------------------------

interface QuoteLineRowProps {
  line: QuoteLine;
  quoteId: string;
  isEditable: boolean;
  onFieldUpdate: (lineId: string, field: string, value: string) => void;
  onDelete: () => void;
}

function QuoteLineRow({ line, isEditable, onFieldUpdate, onDelete }: QuoteLineRowProps) {
  if (!isEditable) {
    return (
      <tr className="border-b">
        <td className="py-2 pr-2">{line.description}</td>
        <td className="py-2 pr-2 text-right">{line.quantity}</td>
        <td className="py-2 pr-2">{line.unit ?? "—"}</td>
        <td className="py-2 pr-2 text-right">{formatCurrency(line.unit_price)}</td>
        <td className="py-2 pr-2 text-right">{(line.discount_percent / 100).toFixed(0)}%</td>
        <td className="py-2 pr-2 text-right">{(line.vat_rate / 100).toFixed(1)}%</td>
        <td className="py-2 text-right font-medium">{formatCurrency(line.line_total_ht)}</td>
      </tr>
    );
  }

  return (
    <tr className="border-b">
      <td className="py-1 pr-1">
        <Input
          defaultValue={line.description}
          onBlur={(e) => onFieldUpdate(line.id, "description", e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="py-1 pr-1">
        <Input
          type="number"
          defaultValue={line.quantity}
          onBlur={(e) => onFieldUpdate(line.id, "quantity", e.target.value)}
          className="h-8 w-20 text-right text-sm"
          min={0}
          step={0.01}
        />
      </td>
      <td className="py-1 pr-1">
        <Input
          defaultValue={line.unit ?? "unité"}
          onBlur={(e) => onFieldUpdate(line.id, "unit", e.target.value)}
          className="h-8 w-20 text-sm"
        />
      </td>
      <td className="py-1 pr-1">
        <Input
          type="number"
          defaultValue={line.unit_price}
          onBlur={(e) => onFieldUpdate(line.id, "unit_price", e.target.value)}
          className="h-8 w-28 text-right text-sm"
          min={0}
        />
      </td>
      <td className="py-1 pr-1">
        <Input
          type="number"
          defaultValue={line.discount_percent}
          onBlur={(e) => onFieldUpdate(line.id, "discount_percent", e.target.value)}
          className="h-8 w-20 text-right text-sm"
          min={0}
          max={10000}
        />
      </td>
      <td className="py-1 pr-1">
        <Input
          type="number"
          defaultValue={line.vat_rate / 100}
          onBlur={(e) => onFieldUpdate(line.id, "vat_rate", e.target.value)}
          className="h-8 w-20 text-right text-sm"
          min={0}
          step={0.1}
        />
      </td>
      <td className="py-1 text-right text-sm font-medium">{formatCurrency(line.line_total_ht)}</td>
      <td className="py-1 pl-1">
        <button
          type="button"
          onClick={onDelete}
          className="text-destructive hover:text-destructive/80"
          aria-label="Supprimer la ligne"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}
