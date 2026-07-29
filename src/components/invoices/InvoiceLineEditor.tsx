"use client";

import { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddInvoiceLine,
  useUpdateInvoiceLine,
  useDeleteInvoiceLine,
} from "@/lib/hooks/useInvoiceLines";
import { formatCurrency } from "@/lib/utils/format";
import { ProductPicker } from "@/components/quotes/ProductPicker";
import type { InvoiceLine } from "@/types/database";

interface InvoiceLineEditorProps {
  invoiceId: string;
  lines: InvoiceLine[];
  isEditable: boolean;
}

/**
 * Tableau des lignes de facture.
 * Mode \u00e9ditable (draft) : inline edit, ajout, suppression.
 * Mode lecture : affichage simple.
 */
export function InvoiceLineEditor({ invoiceId, lines, isEditable }: InvoiceLineEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addLine = useAddInvoiceLine();
  const updateLine = useUpdateInvoiceLine();
  const deleteLine = useDeleteInvoiceLine();

  /** Ajouter une ligne vide */
  function handleAddEmptyLine() {
    addLine.mutate({
      invoiceId,
      input: {
        invoice_id: invoiceId,
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

  /** Ajouter depuis le catalogue (on r\u00e9utilise le ProductPicker des devis) */
  function handleProductSelect(productId: string, quantity: number) {
    // Ajouter via le produit : on cr\u00e9e une ligne avec le product_id
    addLine.mutate({
      invoiceId,
      input: {
        invoice_id: invoiceId,
        product_id: productId,
        description: `Produit ${productId.slice(0, 8)}`,
        quantity,
        unit: "unité",
        unit_price: 0,
        discount_percent: 0,
        vat_rate: 2000,
        position: lines.length,
      },
    });
  }

  /** Mise \u00e0 jour d'un champ de ligne (on blur) */
  function handleFieldUpdate(lineId: string, field: string, value: string) {
    const numericFields = ["quantity", "unit_price", "discount_percent", "vat_rate"];
    let parsed: string | number = numericFields.includes(field) ? Number(value) : value;

    // Convertir le taux TVA saisi en % vers des basis points (ex: 20 → 2000)
    if (field === "vat_rate" && typeof parsed === "number") {
      parsed = Math.round(parsed * 100);
    }

    updateLine.mutate({
      invoiceId,
      lineId,
      input: { [field]: parsed },
    });
  }

  return (
    <div className="space-y-3">
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
              <InvoiceLineRow
                key={line.id}
                line={line}
                isEditable={isEditable}
                onFieldUpdate={handleFieldUpdate}
                onDelete={() => deleteLine.mutate({ invoiceId, lineId: line.id })}
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

      {/* Boutons d'ajout (mode \u00e9ditable uniquement) */}
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

interface InvoiceLineRowProps {
  line: InvoiceLine;
  isEditable: boolean;
  onFieldUpdate: (lineId: string, field: string, value: string) => void;
  onDelete: () => void;
}

function InvoiceLineRow({ line, isEditable, onFieldUpdate, onDelete }: InvoiceLineRowProps) {
  if (!isEditable) {
    return (
      <tr className="border-b">
        <td className="py-2 pr-2">{line.description}</td>
        <td className="py-2 pr-2 text-right">{line.quantity}</td>
        <td className="py-2 pr-2">{line.unit ?? "\u2014"}</td>
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
