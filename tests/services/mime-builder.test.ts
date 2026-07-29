import { describe, it, expect } from "vitest";
import { buildMimeMessage, encodeBase64Url } from "@/lib/services/email-sync/mime-builder";

// --- Tests du constructeur de messages MIME ---

describe("buildMimeMessage", () => {
  it("genere un message text-only avec les bons en-tetes", () => {
    const mime = buildMimeMessage({
      from: "sender@example.com",
      to: ["recipient@example.com"],
      subject: "Test",
      body_text: "Hello world",
    });

    expect(mime).toContain("From: sender@example.com");
    expect(mime).toContain("To: recipient@example.com");
    expect(mime).toContain("MIME-Version: 1.0");
    expect(mime).toContain("Content-Type: text/plain; charset=UTF-8");
    // Le sujet est encode en base64 UTF-8
    expect(mime).toContain("Subject: =?UTF-8?B?");
    // Pas de boundary pour text-only
    expect(mime).not.toContain("multipart/alternative");
  });

  it("genere un message multipart avec boundary quand HTML est fourni", () => {
    const mime = buildMimeMessage({
      from: "sender@example.com",
      to: ["recipient@example.com"],
      subject: "Test HTML",
      body_text: "Hello text",
      body_html: "<p>Hello HTML</p>",
    });

    expect(mime).toContain("Content-Type: multipart/alternative");
    expect(mime).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(mime).toContain("Content-Type: text/html; charset=UTF-8");
    // Verifie la presence du boundary
    expect(mime).toMatch(/boundary="boundary_\d+_\w+"/);
  });

  it("inclut les en-tetes CC et BCC", () => {
    const mime = buildMimeMessage({
      from: "sender@example.com",
      to: ["a@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Test",
      body_text: "Hello",
    });

    expect(mime).toContain("Cc: cc@example.com");
    expect(mime).toContain("Bcc: bcc@example.com");
  });

  it("inclut les en-tetes In-Reply-To et References", () => {
    const mime = buildMimeMessage({
      from: "sender@example.com",
      to: ["a@example.com"],
      subject: "Re: Test",
      body_text: "Reply",
      in_reply_to: "<original@example.com>",
      references: "<original@example.com>",
    });

    expect(mime).toContain("In-Reply-To: <original@example.com>");
    expect(mime).toContain("References: <original@example.com>");
  });

  it("gere plusieurs destinataires separes par virgule", () => {
    const mime = buildMimeMessage({
      from: "sender@example.com",
      to: ["a@example.com", "b@example.com"],
      subject: "Test",
      body_text: "Hello",
    });

    expect(mime).toContain("To: a@example.com, b@example.com");
  });
});

describe("encodeBase64Url", () => {
  it("produit du base64url valide (sans +, /, =)", () => {
    const result = encodeBase64Url("Hello World! This is a test with special chars: +/=");
    expect(result).not.toMatch(/[+/=]/);
  });

  it("encode correctement une chaine simple", () => {
    const result = encodeBase64Url("Hello");
    // "Hello" en base64 = "SGVsbG8=" → base64url = "SGVsbG8"
    expect(result).toBe("SGVsbG8");
  });

  it("encode une chaine vide", () => {
    const result = encodeBase64Url("");
    expect(result).toBe("");
  });
});
