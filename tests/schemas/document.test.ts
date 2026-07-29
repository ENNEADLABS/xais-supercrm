import { describe, it, expect } from "vitest";
import {
  uploadDocumentSchema,
  renameDocumentSchema,
  FILE_CONSTRAINTS,
} from "@/lib/schemas/document";

// --- Tests pour les schemas de validation des documents ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("uploadDocumentSchema", () => {
  it("accepte un nom seul sans entite rattachee", () => {
    // Arrange
    const input = { name: "rapport-annuel.pdf" };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("rapport-annuel.pdf");
      expect(result.data.entity_type).toBeUndefined();
      expect(result.data.entity_id).toBeUndefined();
    }
  });

  it("accepte un nom avec entity_type et entity_id", () => {
    // Arrange
    const input = {
      name: "contrat-client.pdf",
      entity_type: "deal",
      entity_id: VALID_UUID,
    };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("contrat-client.pdf");
      expect(result.data.entity_type).toBe("deal");
      expect(result.data.entity_id).toBe(VALID_UUID);
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "" };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un nom depassant 255 caracteres", () => {
    // Arrange
    const input = { name: "X".repeat(256) };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette entity_type sans entity_id", () => {
    // Arrange
    const input = {
      name: "document.pdf",
      entity_type: "contact",
    };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "entity_type et entity_id doivent etre fournis ensemble ou absents ensemble",
      );
    }
  });

  it("rejette entity_id sans entity_type", () => {
    // Arrange
    const input = {
      name: "document.pdf",
      entity_id: VALID_UUID,
    };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "entity_type et entity_id doivent etre fournis ensemble ou absents ensemble",
      );
    }
  });

  it("accepte entity_type et entity_id tous deux undefined", () => {
    // Arrange
    const input = {
      name: "fichier.txt",
      entity_type: undefined,
      entity_id: undefined,
    };

    // Act
    const result = uploadDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("renameDocumentSchema", () => {
  it("accepte un nom valide", () => {
    // Arrange
    const input = { name: "Mon document.pdf" };

    // Act
    const result = renameDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mon document.pdf");
    }
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { name: "" };

    // Act
    const result = renameDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un nom depassant 255 caracteres", () => {
    // Arrange
    const input = { name: "A".repeat(256) };

    // Act
    const result = renameDocumentSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("FILE_CONSTRAINTS", () => {
  it("maxSize vaut 10 Mo (10 * 1024 * 1024)", () => {
    expect(FILE_CONSTRAINTS.maxSize).toBe(10 * 1024 * 1024);
  });

  it("contient application/pdf dans les types MIME autorises", () => {
    expect(FILE_CONSTRAINTS.allowedMimeTypes).toContain("application/pdf");
  });

  it("contient image/jpeg dans les types MIME autorises", () => {
    expect(FILE_CONSTRAINTS.allowedMimeTypes).toContain("image/jpeg");
  });

  it("ne contient PAS application/exe dans les types MIME autorises", () => {
    expect(FILE_CONSTRAINTS.allowedMimeTypes).not.toContain("application/exe");
  });
});
