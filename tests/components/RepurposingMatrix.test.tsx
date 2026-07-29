import { render, screen, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RepurposingMatrix } from "@/components/studio/RepurposingMatrix";
import { useDeliverables } from "@/lib/hooks/useDeliverables";
import type { Deliverable } from "@/types/database";

// On mocke le hook de donnees : le composant est teste en isolation.
vi.mock("@/lib/hooks/useDeliverables", () => ({
  useDeliverables: vi.fn(),
}));

const mockedUseDeliverables = vi.mocked(useDeliverables);

function deliverable(overrides: Partial<Deliverable>): Deliverable {
  return {
    id: crypto.randomUUID(),
    title: "Livrable",
    format: "youtube_short",
    channel: null,
    status: "planned",
    content_piece_id: "piece-1",
    organization_id: "org-1",
    owner_id: null,
    position: 0,
    scheduled_date: null,
    published_at: null,
    published_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function asQuery(data: Deliverable[]) {
  return { data, isLoading: false } as unknown as ReturnType<typeof useDeliverables>;
}

describe("RepurposingMatrix", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mockedUseDeliverables.mockReset();
  });

  it("affiche un message vide quand aucun livrable", () => {
    mockedUseDeliverables.mockReturnValue(asQuery([]));
    render(<RepurposingMatrix contentPieceId="piece-1" />);
    expect(screen.getByText(/Aucun livrable à croiser/i)).toBeInTheDocument();
  });

  it("affiche une ligne par format present et compte par statut", () => {
    mockedUseDeliverables.mockReturnValue(
      asQuery([
        deliverable({ format: "youtube_short", status: "planned" }),
        deliverable({ format: "youtube_short", status: "planned" }),
        deliverable({ format: "skool_post", status: "published" }),
      ]),
    );
    render(<RepurposingMatrix contentPieceId="piece-1" />);

    // Deux formats distincts -> deux lignes
    const shortRow = screen.getByText("YouTube Short").closest("tr")!;
    const skoolRow = screen.getByText("Post Skool").closest("tr")!;

    // YouTube Short : 2 en "Prévu" (planned)
    expect(within(shortRow).getByText("2")).toBeInTheDocument();
    // Post Skool : 1 en "Publié"
    expect(within(skoolRow).getByText("1")).toBeInTheDocument();
  });

  it("n'affiche pas un format sans livrable", () => {
    mockedUseDeliverables.mockReturnValue(
      asQuery([deliverable({ format: "newsletter", status: "draft" })]),
    );
    render(<RepurposingMatrix contentPieceId="piece-1" />);
    expect(screen.getByText("Newsletter")).toBeInTheDocument();
    expect(screen.queryByText("Podcast")).not.toBeInTheDocument();
  });
});
