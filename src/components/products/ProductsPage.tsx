"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Package, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput, EmptyState } from "@/components/crm";
import { useProducts } from "@/lib/hooks/useProducts";
import { formatCurrency } from "@/lib/utils/format";
import type { EntityStatus } from "@/types/database";

/**
 * Page de liste des produits du catalogue.
 */
export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: products, isLoading } = useProducts({
    query: search,
    status: "active",
    page,
    per_page: 25,
  });

  // Extraire la liste (format paginé possible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Format retour paginé
  const raw = products as any;
  const productList = Array.isArray(products) ? products : (raw?.data ?? []);
  const totalPages = raw?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produits</h1>
        <Button render={<Link href="/products/new" />}>
          <Plus className="size-4" />
          Nouveau produit
        </Button>
      </div>

      {/* Recherche */}
      <div className="w-72">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit..." />
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* État vide */}
      {!isLoading && productList.length === 0 && (
        <EmptyState
          icon={Package}
          title="Aucun produit"
          description="Créez votre premier produit pour constituer votre catalogue."
          action={{ label: "Nouveau produit", href: "/products/new" }}
        />
      )}

      {/* Tableau */}
      {!isLoading && productList.length > 0 && <ProductTable products={productList} />}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Sous-composant : tableau
// ------------------------------------------------------------------

interface ProductRow {
  id: string;
  name: string;
  reference: string | null;
  unit_price: number;
  unit: string | null;
  vat_rate: number;
  status: EntityStatus;
}

function ProductTable({ products }: { products: ProductRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3 text-right">Prix unitaire</th>
            <th className="px-4 py-3">Unité</th>
            <th className="px-4 py-3 text-right">TVA</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link
                  href={`/products/${p.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.unit_price)}</td>
              <td className="px-4 py-3">{p.unit ?? "unité"}</td>
              <td className="px-4 py-3 text-right">{(p.vat_rate / 100).toFixed(1)}%</td>
              <td className="px-4 py-3">
                <Badge variant={p.status === "active" ? "secondary" : "outline"}>
                  {p.status === "active" ? "Actif" : "Archivé"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
