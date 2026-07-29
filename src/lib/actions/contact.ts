"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as contactService from "@/lib/services/contactService";
import * as contactCompanyService from "@/lib/services/contactCompanyService";
import {
  createContactSchema,
  updateContactSchema,
  mergeContactsSchema,
  type CreateContactInput,
  type UpdateContactInput,
  type ContactSearchInput,
  type MergeContactsInput,
  type DuplicateCheckInput,
} from "@/lib/schemas/contact";
import * as duplicateService from "@/lib/services/duplicateDetectionService";

// --- Lecture liste paginee ---

export async function fetchContacts(params?: ContactSearchInput) {
  const { organizationId } = await getAuthContext();
  return contactService.getContacts(organizationId, params);
}

// --- Lecture detail ---

export async function fetchContact(contactId: string) {
  const { organizationId } = await getAuthContext();
  return contactService.getContact(organizationId, contactId);
}

// --- Creation ---

export async function createContactAction(input: CreateContactInput) {
  const { organizationId } = await requireMember();
  const validated = createContactSchema.parse(input);
  const contact = await contactService.createContact(organizationId, validated);
  revalidatePath("/contacts");
  return contact;
}

// --- Mise a jour ---

export async function updateContactAction(contactId: string, input: UpdateContactInput) {
  const { organizationId } = await requireMember();
  const validated = updateContactSchema.parse(input);
  const contact = await contactService.updateContact(organizationId, contactId, validated);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  return contact;
}

// --- Archivage ---

export async function archiveContactAction(contactId: string) {
  const { organizationId } = await requireMember();
  const contact = await contactService.archiveContact(organizationId, contactId);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  return contact;
}

// --- Liaison contact <-> societe ---

export async function linkContactCompanyAction(
  contactId: string,
  companyId: string,
  role?: string,
) {
  const { organizationId } = await requireMember();
  await contactCompanyService.linkContactToCompany(organizationId, contactId, companyId, role);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/companies/${companyId}`);
}

export async function unlinkContactCompanyAction(contactId: string, companyId: string) {
  const { organizationId } = await requireMember();
  await contactCompanyService.unlinkContactFromCompany(organizationId, contactId, companyId);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/companies/${companyId}`);
}

// --- Detection de doublons ---

export async function findDuplicatesAction(input: DuplicateCheckInput) {
  const { organizationId } = await getAuthContext();
  return duplicateService.findDuplicates(organizationId, input, input.exclude_id);
}

// --- Fusion de contacts ---

export async function mergeContactsAction(input: MergeContactsInput) {
  const { organizationId } = await requireMember();
  const validated = mergeContactsSchema.parse(input);
  const contact = await contactService.mergeContacts(
    organizationId,
    validated.winner_id,
    validated.loser_id,
    validated.field_overrides,
  );
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${validated.winner_id}`);
  return contact;
}
