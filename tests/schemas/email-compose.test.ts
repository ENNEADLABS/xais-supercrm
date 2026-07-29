import { describe, it, expect } from "vitest";
import { composeEmailSchema, replyEmailSchema } from "@/lib/schemas/email";

// --- Tests des schemas de composition et reponse email ---

describe("composeEmailSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepte un email valide avec tous les champs requis", () => {
    const input = {
      account_id: validUuid,
      to: ["recipient@example.com"],
      subject: "Test subject",
      body_text: "Hello world",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepte un email avec CC, BCC et HTML", () => {
    const input = {
      account_id: validUuid,
      to: ["a@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Test",
      body_text: "Text",
      body_html: "<p>HTML</p>",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejette quand le tableau 'to' est vide", () => {
    const input = {
      account_id: validUuid,
      to: [],
      subject: "Test",
      body_text: "Hello",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejette une adresse email invalide dans 'to'", () => {
    const input = {
      account_id: validUuid,
      to: ["not-an-email"],
      subject: "Test",
      body_text: "Hello",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejette un account_id invalide", () => {
    const input = {
      account_id: "invalid-uuid",
      to: ["a@example.com"],
      subject: "Test",
      body_text: "Hello",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejette un sujet vide", () => {
    const input = {
      account_id: validUuid,
      to: ["a@example.com"],
      subject: "",
      body_text: "Hello",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejette un body_text vide", () => {
    const input = {
      account_id: validUuid,
      to: ["a@example.com"],
      subject: "Test",
      body_text: "",
    };

    const result = composeEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("replyEmailSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepte une reponse valide", () => {
    const input = {
      email_id: validUuid,
      body_text: "My reply",
    };

    const result = replyEmailSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verifie la valeur par defaut de reply_all
      expect(result.data.reply_all).toBe(false);
    }
  });

  it("accepte une reponse avec reply_all et HTML", () => {
    const input = {
      email_id: validUuid,
      body_text: "Reply to all",
      body_html: "<p>Reply to all</p>",
      reply_all: true,
    };

    const result = replyEmailSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reply_all).toBe(true);
    }
  });

  it("rejette un body_text vide", () => {
    const input = {
      email_id: validUuid,
      body_text: "",
    };

    const result = replyEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejette un email_id invalide", () => {
    const input = {
      email_id: "not-a-uuid",
      body_text: "Reply",
    };

    const result = replyEmailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
