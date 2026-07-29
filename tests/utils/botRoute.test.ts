import { describe, it, expect } from "vitest";
import { z } from "zod";
import { isUuid, parseJsonBody, jsonError } from "@/lib/utils/botRoute";

// parseJsonBody n'utilise que Request.json() : une Request standard suffit.
function jsonRequest(body: string): Request {
  return new Request("http://localhost/api/v1/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

const schema = z.object({ content: z.string().min(1, "Le contenu est requis") });

describe("isUuid", () => {
  it("accepte un UUID valide (toute casse)", () => {
    expect(isUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuid("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(true);
  });

  it("refuse un id malformé (le cas 500 Postgres 22P02)", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("11111111-1111-1111-1111-11111111111")).toBe(false); // 1 char manquant
    expect(isUuid("'; drop table contacts; --")).toBe(false);
  });
});

describe("parseJsonBody", () => {
  it("retourne les donnees validees pour un body conforme", async () => {
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ content: "ok" })), schema);
    expect("data" in result && result.data.content).toBe("ok");
  });

  it("retourne un 400 formate pour un JSON malformé", async () => {
    const result = await parseJsonBody(jsonRequest("{pas du json"), schema);
    if (!("errorResponse" in result)) throw new Error("attendu: errorResponse");
    expect(result.errorResponse.status).toBe(400);
    const payload = await result.errorResponse.json();
    expect(payload.error.code).toBe("BAD_REQUEST");
  });

  it("retourne un 400 formate avec le message Zod pour un payload invalide", async () => {
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ content: "" })), schema);
    if (!("errorResponse" in result)) throw new Error("attendu: errorResponse");
    expect(result.errorResponse.status).toBe(400);
    const payload = await result.errorResponse.json();
    expect(payload.error.message).toBe("Le contenu est requis");
  });
});

describe("jsonError", () => {
  it("produit le format d'erreur standard { error: { code, message } }", async () => {
    const response = jsonError("NOT_FOUND", "Contact introuvable", 404);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Contact introuvable" },
    });
  });
});
