import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductSearchInput,
} from "@/lib/schemas/product";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// --- Liste paginee avec recherche et filtres ---

export async function getProducts(organizationId: string, params?: ProductSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  // Recherche texte libre sur nom et reference
  if (params?.query) {
    const q = params.query;
    query = query.or(`name.ilike.%${escapeLike(q)}%,reference.ilike.%${escapeLike(q)}%`);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// --- Detail d'un produit ---

export async function getProduct(organizationId: string, productId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0];
}

// --- Creation ---

export async function createProduct(organizationId: string, input: CreateProductInput) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, organization_id: organizationId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Product creation failed");

  await activityService.log(organizationId, {
    entityType: "product",
    entityId: data[0].id as string,
    action: "created",
  });
  return data[0];
}

// --- Mise a jour ---

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: UpdateProductInput,
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Product not found");

  await activityService.log(organizationId, {
    entityType: "product",
    entityId: productId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });
  return data[0];
}

// --- Archivage ---

export async function archiveProduct(organizationId: string, productId: string) {
  return updateProduct(organizationId, productId, { status: "archived" });
}
