"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as productService from "@/lib/services/productService";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductSearchInput,
} from "@/lib/schemas/product";

// --- Liste des produits avec filtres ---

export async function fetchProducts(params?: ProductSearchInput) {
  const { organizationId } = await getAuthContext();
  return productService.getProducts(organizationId, params);
}

// --- Detail d'un produit ---

export async function fetchProduct(productId: string) {
  const { organizationId } = await getAuthContext();
  return productService.getProduct(organizationId, productId);
}

// --- Creation ---

export async function createProductAction(input: CreateProductInput) {
  const { organizationId } = await requireMember();
  const validated = createProductSchema.parse(input);
  const product = await productService.createProduct(organizationId, validated);
  revalidatePath("/products");
  return product;
}

// --- Mise a jour ---

export async function updateProductAction(productId: string, input: UpdateProductInput) {
  const { organizationId } = await requireMember();
  const validated = updateProductSchema.parse(input);
  const product = await productService.updateProduct(organizationId, productId, validated);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return product;
}

// --- Archivage ---

export async function archiveProductAction(productId: string) {
  const { organizationId } = await requireMember();
  await productService.archiveProduct(organizationId, productId);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}
