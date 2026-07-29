"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import { contactChannelSchema } from "@/lib/schemas/contact";
import * as channelService from "@/lib/services/contactChannelService";

// --- Lecture ---

export async function fetchContactChannels(contactId: string) {
  const { organizationId } = await getAuthContext();
  return channelService.getContactChannels(organizationId, contactId);
}

// --- Ajout ---

export async function addContactChannelAction(
  contactId: string,
  input: { type: string; value: string; label?: string | null },
) {
  const { organizationId } = await requireMember();
  const validated = contactChannelSchema.parse(input);
  const channel = await channelService.addContactChannel(organizationId, contactId, validated);
  revalidatePath(`/contacts/${contactId}`);
  return channel;
}

// --- Suppression ---

export async function removeContactChannelAction(contactId: string, channelId: string) {
  const { organizationId } = await requireMember();
  await channelService.removeContactChannel(organizationId, channelId, contactId);
  revalidatePath(`/contacts/${contactId}`);
}
