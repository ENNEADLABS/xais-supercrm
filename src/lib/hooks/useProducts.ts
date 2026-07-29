import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchProducts,
  fetchProduct,
  createProductAction,
  updateProductAction,
  archiveProductAction,
} from "@/lib/actions/product";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductSearchInput,
} from "@/lib/schemas/product";

// --- Liste des produits ---

export function useProducts(params?: ProductSearchInput) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
  });
}

// --- Detail d'un produit ---

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProductAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du produit");
    },
  });
}

// --- Mise a jour ---

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      updateProductAction(productId, input),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      toast.success("Produit mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du produit");
    },
  });
}

// --- Archivage ---

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => archiveProductAction(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit archivé");
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage du produit");
    },
  });
}
