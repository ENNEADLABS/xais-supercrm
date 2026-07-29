import { describe, it, expect } from "vitest";
import {
  createContactSchema,
  updateContactSchema,
  contactSearchSchema,
} from "@/lib/schemas/contact";

// --- Tests pour les schemas de validation des contacts ---

describe("createContactSchema", () => {
  it("accepte un contact minimal (prenom + nom uniquement)", () => {
    // Arrange
    const input = { first_name: "Jean", last_name: "Dupont" };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe("Jean");
      expect(result.data.last_name).toBe("Dupont");
      expect(result.data.status).toBe("active");
    }
  });

  it("accepte un contact avec tous les champs remplis", () => {
    // Arrange
    const input = {
      first_name: "Marie",
      last_name: "Curie",
      email: "marie@example.com",
      phone: "+33 0 00 00 00 00",
      job_title: "Directrice R&D",
      status: "archived" as const,
      custom_fields: { source: "salon" },
    };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("marie@example.com");
      expect(result.data.phone).toBe("+33 0 00 00 00 00");
      expect(result.data.job_title).toBe("Directrice R&D");
      expect(result.data.status).toBe("archived");
      expect(result.data.custom_fields).toEqual({ source: "salon" });
    }
  });

  it("rejette un prenom vide", () => {
    // Arrange
    const input = { first_name: "", last_name: "Dupont" };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un nom vide", () => {
    // Arrange
    const input = { first_name: "Jean", last_name: "" };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette un email au format invalide", () => {
    // Arrange
    const input = {
      first_name: "Jean",
      last_name: "Dupont",
      email: "pas-un-email",
    };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte un email null ou undefined", () => {
    // Arrange
    const inputNull = { first_name: "Jean", last_name: "Dupont", email: null };
    const inputUndefined = { first_name: "Jean", last_name: "Dupont" };

    // Act
    const resultNull = createContactSchema.safeParse(inputNull);
    const resultUndefined = createContactSchema.safeParse(inputUndefined);

    // Assert
    expect(resultNull.success).toBe(true);
    expect(resultUndefined.success).toBe(true);
  });

  it("applique le statut 'active' par defaut", () => {
    // Arrange
    const input = { first_name: "Jean", last_name: "Dupont" };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });

  it("rejette un prenom trop long (>100 caracteres)", () => {
    // Arrange
    const input = {
      first_name: "A".repeat(101),
      last_name: "Dupont",
    };

    // Act
    const result = createContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("accepte une mise a jour partielle (nom uniquement)", () => {
    // Arrange
    const input = { last_name: "Martin" };

    // Act
    const result = updateContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_name).toBe("Martin");
      expect(result.data.first_name).toBeUndefined();
    }
  });

  it("accepte un objet vide (tous les champs optionnels)", () => {
    // Arrange
    const input = {};

    // Act
    const result = updateContactSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("ne reapplique pas le default 'active' sur un update sans status (regression : reactivation d'un contact archive)", () => {
    // Arrange — update partiel qui ne touche pas au statut
    const input = { job_title: "CTO" };

    // Act
    const result = updateContactSchema.safeParse(input);

    // Assert — status absent doit rester absent ("ne pas toucher"), pas "active"
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });
});

describe("contactSearchSchema", () => {
  it("applique les valeurs par defaut sur un objet vide", () => {
    // Arrange
    const input = {};

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
    }
  });

  it("coerce une page string en number", () => {
    // Arrange
    const input = { page: "3" };

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejette page=0", () => {
    // Arrange
    const input = { page: 0 };

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejette per_page=101", () => {
    // Arrange
    const input = { per_page: 101 };

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepte des tag_ids avec des UUIDs valides", () => {
    // Arrange
    const input = {
      tag_ids: ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
    };

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tag_ids).toHaveLength(2);
    }
  });

  it("rejette des tag_ids avec des chaines non-UUID", () => {
    // Arrange
    const input = { tag_ids: ["not-a-uuid", "also-not-a-uuid"] };

    // Act
    const result = contactSearchSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });
});
