import { describe, it, expect } from "vitest";
import { createNoteSchema, updateNoteSchema } from "@/lib/schemas/note";

// --- Tests pour les schemas de validation des notes ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createNoteSchema", () => {
  it("accepte une note valide avec entity_type 'contact'", () => {
    // Arrange
    const input = {
      entity_type: "contact",
      entity_id: VALID_UUID,
      content: "Note de suivi client",
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entity_type).toBe("contact");
      expect(result.data.entity_id).toBe(VALID_UUID);
      expect(result.data.content).toBe("Note de suivi client");
    }
  });

  it("rejette un contenu manquant", () => {
    // Arrange
    const input = {
      entity_type: "contact",
      entity_id: VALID_UUID,
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un contenu vide", () => {
    // Arrange
    const input = {
      entity_type: "contact",
      entity_id: VALID_UUID,
      content: "",
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un contenu depassant 10 000 caracteres", () => {
    // Arrange
    const input = {
      entity_type: "contact",
      entity_id: VALID_UUID,
      content: "X".repeat(10001),
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un entity_type invalide", () => {
    // Arrange
    const input = {
      entity_type: "unknown_type",
      entity_id: VALID_UUID,
      content: "Note",
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un entity_id non-UUID", () => {
    // Arrange
    const input = {
      entity_type: "contact",
      entity_id: "pas-un-uuid",
      content: "Note",
    };

    // Act
    const result = createNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte tous les entity_types valides", () => {
    // Arrange
    const validTypes = [
      "contact",
      "company",
      "deal",
      "quote",
      "invoice",
      "product",
      "task",
    ] as const;

    // Act & Assert
    for (const entityType of validTypes) {
      const result = createNoteSchema.safeParse({
        entity_type: entityType,
        entity_id: VALID_UUID,
        content: `Note pour ${entityType}`,
      });
      expect(result.success, `entity_type '${entityType}' devrait etre accepte`).toBe(true);
    }
  });
});

describe("updateNoteSchema", () => {
  it("accepte un contenu valide", () => {
    // Arrange
    const input = { content: "Contenu mis a jour" };

    // Act
    const result = updateNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Contenu mis a jour");
    }
  });

  it("rejette un contenu vide", () => {
    // Arrange
    const input = { content: "" };

    // Act
    const result = updateNoteSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});
