"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as emailService from "@/lib/services/emailService";
import * as emailQueries from "@/lib/services/emailQueries";
import * as connectedAccountService from "@/lib/services/connectedAccountService";
import * as emailMatchingService from "@/lib/services/emailMatchingService";
import * as emailSendService from "@/lib/services/emailSendService";
import { syncAllChannels } from "@/lib/services/email-sync/syncOrchestrator";
import {
  emailSearchSchema,
  markEmailReadSchema,
  moveEmailSchema,
  composeEmailSchema,
  replyEmailSchema,
} from "@/lib/schemas/email";
import type { EmailSearchInput, ComposeEmailInput, ReplyEmailInput } from "@/lib/schemas/email";
import type { EmailFolder } from "@/types/email";

// --- Lecture liste paginee ---

export async function fetchEmails(params?: EmailSearchInput) {
  const { organizationId } = await getAuthContext();
  const validated = params ? emailSearchSchema.parse(params) : undefined;
  return emailQueries.getEmails(organizationId, validated);
}

// --- Lecture detail ---

export async function fetchEmail(emailId: string) {
  const { organizationId } = await getAuthContext();
  return emailQueries.getEmail(organizationId, emailId);
}

// --- Lecture thread ---

export async function fetchEmailThread(threadId: string) {
  const { organizationId } = await getAuthContext();
  return emailQueries.getEmailThread(organizationId, threadId);
}

// --- Compteurs (non lus + par dossier) ---

export async function fetchEmailCounts() {
  const { organizationId } = await getAuthContext();
  const [unreadCount, folderCounts] = await Promise.all([
    emailService.getUnreadCount(organizationId),
    emailService.getFolderCounts(organizationId),
  ]);
  return { unreadCount, folderCounts };
}

// --- Comptes connectes ---

export async function fetchConnectedAccounts() {
  const { organizationId } = await getAuthContext();
  return connectedAccountService.getAccounts(organizationId);
}

// --- Marquer comme lu/non lu ---

export async function markEmailsReadAction(emailIds: string[], isRead: boolean) {
  const { organizationId } = await requireMember();
  const validated = markEmailReadSchema.parse({ email_ids: emailIds, is_read: isRead });
  await emailService.markAsRead(organizationId, validated.email_ids, validated.is_read);
  revalidatePath("/emails");
}

// --- Deplacer vers un dossier ---

export async function moveEmailsAction(emailIds: string[], folder: EmailFolder) {
  const { organizationId } = await requireMember();
  const validated = moveEmailSchema.parse({ email_ids: emailIds, folder });
  await emailService.moveToFolder(organizationId, validated.email_ids, validated.folder);
  revalidatePath("/emails");
}

// --- Deconnexion d'un compte ---

export async function disconnectAccountAction(accountId: string) {
  const { organizationId } = await requireMember();
  await connectedAccountService.disconnectAccount(organizationId, accountId);
  revalidatePath("/emails");
  revalidatePath("/settings");
}

// --- Suppression d'un compte ---

export async function deleteAccountAction(accountId: string) {
  const { organizationId, userId } = await requireMember();
  await connectedAccountService.deleteAccount(organizationId, accountId, userId);
  revalidatePath("/emails");
  revalidatePath("/settings");
}

// --- Declenchement de la synchronisation ---

export async function triggerSyncAction(_accountId?: string) {
  const { organizationId } = await requireMember();
  const results = await syncAllChannels(organizationId);
  revalidatePath("/emails");
  const totalNew = results.reduce((sum, r) => sum + r.newEmails, 0);
  return { status: "ok" as const, newEmails: totalNew };
}

// --- Envoi d'un nouvel email ---

export async function sendEmailAction(input: ComposeEmailInput) {
  const { organizationId, userId } = await requireMember();
  const validated = composeEmailSchema.parse(input);
  const emailId = await emailSendService.composeAndSend(organizationId, userId, validated);
  revalidatePath("/emails");
  return { emailId };
}

// --- Repondre a un email ---

export async function replyEmailAction(input: ReplyEmailInput) {
  const { organizationId, userId } = await requireMember();
  const validated = replyEmailSchema.parse(input);
  const emailId = await emailSendService.replyToEmail(organizationId, userId, validated);
  revalidatePath("/emails");
  return { emailId };
}

// --- Re-matching des participants ---

export async function triggerReMatchAction() {
  const { organizationId } = await requireMember();
  const matchCount = await emailMatchingService.reMatchAll(organizationId);
  revalidatePath("/emails");
  return { matchCount };
}
