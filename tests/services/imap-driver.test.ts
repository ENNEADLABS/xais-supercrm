import { describe, it, expect } from "vitest";
import { ImapDriver } from "@/lib/services/email-sync/imap-driver";
import { ProviderNotAvailableError } from "@/lib/services/email-sync/types";
import type { DecryptedCredentials, OutgoingEmail } from "@/lib/services/email-sync/types";

// --- Tests du stub IMAP driver ---

const driver = new ImapDriver();

const credsWithImap: DecryptedCredentials = {
  provider: "imap_smtp",
  imap: {
    host: "imap.example.com",
    port: 993,
    secure: true,
    username: "user@example.com",
    password: "secret",
  },
  smtp: {
    host: "smtp.example.com",
    port: 465,
    secure: true,
    username: "user@example.com",
    password: "secret",
  },
};

const credsWithoutImap: DecryptedCredentials = {
  provider: "imap_smtp",
};

const fakeMessage: OutgoingEmail = {
  to: ["test@example.com"],
  subject: "Test",
  body_text: "Hello",
};

describe("ImapDriver", () => {
  it("testConnection retourne false (stub)", async () => {
    const result = await driver.testConnection(credsWithImap);
    expect(result).toBe(false);
  });

  it("testConnection sans credentials IMAP retourne false", async () => {
    const result = await driver.testConnection(credsWithoutImap);
    expect(result).toBe(false);
  });

  it("fetchNewEmails retourne un resultat vide (stub)", async () => {
    const result = await driver.fetchNewEmails(credsWithImap, null);
    expect(result.emails).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("sendEmail lance ProviderNotAvailableError", async () => {
    await expect(driver.sendEmail(credsWithImap, fakeMessage)).rejects.toThrow(
      ProviderNotAvailableError,
    );
    await expect(driver.sendEmail(credsWithImap, fakeMessage)).rejects.toMatchObject({
      provider: "imap_smtp",
      operation: "send",
    });
  });

  it("sendEmail sans credentials SMTP lance ProviderNotAvailableError specifique", async () => {
    await expect(driver.sendEmail(credsWithoutImap, fakeMessage)).rejects.toThrow(
      ProviderNotAvailableError,
    );
  });
});
