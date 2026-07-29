import { describe, it, expect } from "vitest";
import { MicrosoftDriver } from "@/lib/services/email-sync/microsoft-driver";
import { ProviderNotAvailableError } from "@/lib/services/email-sync/types";
import type { DecryptedCredentials, OutgoingEmail } from "@/lib/services/email-sync/types";

// --- Tests du stub Microsoft driver ---

const driver = new MicrosoftDriver();

const fakeCreds: DecryptedCredentials = {
  provider: "microsoft",
  oauth: {
    access_token: "fake-token",
    refresh_token: "fake-refresh",
    expires_at: new Date().toISOString(),
    token_type: "Bearer",
  },
};

const fakeMessage: OutgoingEmail = {
  to: ["test@example.com"],
  subject: "Test",
  body_text: "Hello",
};

describe("MicrosoftDriver", () => {
  it("testConnection retourne false (stub)", async () => {
    const result = await driver.testConnection(fakeCreds);
    expect(result).toBe(false);
  });

  it("fetchNewEmails retourne un resultat vide (stub)", async () => {
    const result = await driver.fetchNewEmails(fakeCreds, null);
    expect(result.emails).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("sendEmail lance ProviderNotAvailableError avec provider=microsoft", async () => {
    await expect(driver.sendEmail(fakeCreds, fakeMessage)).rejects.toThrow(
      ProviderNotAvailableError,
    );
    await expect(driver.sendEmail(fakeCreds, fakeMessage)).rejects.toMatchObject({
      provider: "microsoft",
      operation: "send",
    });
  });

  it("exchangeAuthCode lance ProviderNotAvailableError", async () => {
    await expect(driver.exchangeAuthCode("code", "http://localhost")).rejects.toThrow(
      ProviderNotAvailableError,
    );
    await expect(driver.exchangeAuthCode("code", "http://localhost")).rejects.toMatchObject({
      provider: "microsoft",
      operation: "oauth",
    });
  });

  it("refreshAccessToken lance ProviderNotAvailableError", async () => {
    await expect(driver.refreshAccessToken("token")).rejects.toThrow(ProviderNotAvailableError);
    await expect(driver.refreshAccessToken("token")).rejects.toMatchObject({
      provider: "microsoft",
      operation: "refresh",
    });
  });
});
