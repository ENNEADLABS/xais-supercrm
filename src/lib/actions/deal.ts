"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as dealService from "@/lib/services/dealService";
import {
  createDealSchema,
  updateDealSchema,
  type CreateDealInput,
  type UpdateDealInput,
  type DealSearchInput,
} from "@/lib/schemas/deal";

// --- Liste paginee avec filtres ---

export async function fetchDeals(params?: DealSearchInput) {
  const { organizationId } = await getAuthContext();
  return dealService.getDeals(organizationId, params);
}

// --- Deals groupes par stage (kanban) ---

export async function fetchDealsByStage() {
  const { organizationId } = await getAuthContext();
  return dealService.getDealsByStage(organizationId);
}

// --- Detail d'un deal ---

export async function fetchDeal(dealId: string) {
  const { organizationId } = await getAuthContext();
  return dealService.getDeal(organizationId, dealId);
}

// --- Creation ---

export async function createDealAction(input: CreateDealInput) {
  const { organizationId } = await requireMember();
  const validated = createDealSchema.parse(input);
  const deal = await dealService.createDeal(organizationId, validated);
  revalidatePath("/pipeline");
  return deal;
}

// --- Mise a jour ---

export async function updateDealAction(dealId: string, input: UpdateDealInput) {
  const { organizationId } = await requireMember();
  const validated = updateDealSchema.parse(input);
  const deal = await dealService.updateDeal(organizationId, dealId, validated);
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${dealId}`);
  return deal;
}

// --- Deplacement de stage (kanban drag & drop) ---

export async function moveDealAction(dealId: string, stage: string, position: number) {
  const { organizationId } = await requireMember();
  const deal = await dealService.moveDeal(organizationId, dealId, stage, position);
  revalidatePath("/pipeline");
  return deal;
}

// --- Fermeture (won/lost) ---

export async function closeDealAction(
  dealId: string,
  dealStatus: "won" | "lost",
  lostReason?: string,
) {
  const { organizationId } = await requireMember();
  const deal = await dealService.closeDeal(organizationId, dealId, dealStatus, lostReason);
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${dealId}`);
  return deal;
}

// --- Reouverture ---

export async function reopenDealAction(dealId: string, stage: string) {
  const { organizationId } = await requireMember();
  const deal = await dealService.reopenDeal(organizationId, dealId, stage);
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${dealId}`);
  return deal;
}

// --- Liaison deal <-> contact ---

export async function linkDealContactAction(dealId: string, contactId: string, role?: string) {
  const { organizationId } = await requireMember();
  await dealService.linkDealContact(organizationId, dealId, contactId, role);
  revalidatePath(`/pipeline/${dealId}`);
}

export async function unlinkDealContactAction(dealId: string, contactId: string) {
  const { organizationId } = await requireMember();
  await dealService.unlinkDealContact(organizationId, dealId, contactId);
  revalidatePath(`/pipeline/${dealId}`);
}
