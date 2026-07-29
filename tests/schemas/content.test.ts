import { describe, it, expect } from "vitest";
import {
  createContentIdeaSchema,
  createContentPieceSchema,
  moveContentPieceSchema,
  convertIdeaSchema,
  createContentAssetSchema,
  createChecklistItemSchema,
  createDeliverableSchema,
} from "@/lib/schemas/content";

// --- Tests des schemas de validation Content Studio (spec 021) ---

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createContentIdeaSchema", () => {
  it("accepte une idee minimale et applique la priorite par defaut", () => {
    const result = createContentIdeaSchema.safeParse({ title: "Mon idee" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe("medium");
  });

  it("rejette un titre vide", () => {
    expect(createContentIdeaSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejette un format non reconnu", () => {
    const result = createContentIdeaSchema.safeParse({
      title: "X",
      planned_format: "tiktok",
    });
    expect(result.success).toBe(false);
  });
});

describe("createContentPieceSchema", () => {
  it("accepte un contenu valide avec statut par defaut 'idea'", () => {
    const result = createContentPieceSchema.safeParse({
      title: "Episode 1",
      format: "youtube_long",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("idea");
  });

  it("exige le format", () => {
    expect(createContentPieceSchema.safeParse({ title: "Episode 1" }).success).toBe(false);
  });

  it("rejette une published_url non-URL", () => {
    const result = createContentPieceSchema.safeParse({
      title: "X",
      format: "youtube_long",
      published_url: "pas-une-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("moveContentPieceSchema", () => {
  it("accepte un deplacement valide", () => {
    expect(moveContentPieceSchema.safeParse({ status: "editing", position: 3 }).success).toBe(true);
  });

  it("rejette une position negative", () => {
    expect(moveContentPieceSchema.safeParse({ status: "editing", position: -1 }).success).toBe(
      false,
    );
  });

  it("rejette un statut hors enum", () => {
    expect(moveContentPieceSchema.safeParse({ status: "done", position: 0 }).success).toBe(false);
  });
});

describe("convertIdeaSchema", () => {
  it("accepte une conversion valide", () => {
    const result = convertIdeaSchema.safeParse({ idea_id: VALID_UUID, format: "youtube_short" });
    expect(result.success).toBe(true);
  });

  it("exige un idea_id au format uuid", () => {
    expect(convertIdeaSchema.safeParse({ idea_id: "abc", format: "youtube_short" }).success).toBe(
      false,
    );
  });
});

describe("createContentAssetSchema (refines)", () => {
  it("accepte un asset rattache a un contenu avec lien externe", () => {
    const result = createContentAssetSchema.safeParse({
      content_piece_id: VALID_UUID,
      external_url: "https://loom.com/share/abc",
      role: "final_video",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un asset rattache a un contenu avec document GED", () => {
    const result = createContentAssetSchema.safeParse({
      content_piece_id: VALID_UUID,
      document_id: VALID_UUID,
      role: "thumbnail",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un asset sans parent (ni piece ni livrable)", () => {
    const result = createContentAssetSchema.safeParse({
      external_url: "https://example.com",
      role: "reference",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un asset sans source (ni document ni lien)", () => {
    const result = createContentAssetSchema.safeParse({
      content_piece_id: VALID_UUID,
      role: "reference",
    });
    expect(result.success).toBe(false);
  });
});

describe("createDeliverableSchema", () => {
  it("accepte un livrable valide avec statut par defaut 'planned'", () => {
    const result = createDeliverableSchema.safeParse({
      content_piece_id: VALID_UUID,
      title: "3 Shorts",
      format: "youtube_short",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("planned");
  });
});

describe("createChecklistItemSchema", () => {
  it("accepte un item valide", () => {
    const result = createChecklistItemSchema.safeParse({
      content_piece_id: VALID_UUID,
      label: "Tourner l'intro",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un libelle vide", () => {
    expect(
      createChecklistItemSchema.safeParse({ content_piece_id: VALID_UUID, label: "" }).success,
    ).toBe(false);
  });
});
