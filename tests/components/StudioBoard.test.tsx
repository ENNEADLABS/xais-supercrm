import { render, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StudioBoard } from "@/components/studio/StudioBoard";
import {
  useBoardPieces,
  useMoveContentPiece,
  useCreateContentPiece,
} from "@/lib/hooks/useContentPieces";
import { CONTENT_STATUS_LABELS } from "@/lib/utils/contentLabels";
import type { BoardPiece } from "@/types/database";

vi.mock("@/lib/hooks/useContentPieces", () => ({
  useBoardPieces: vi.fn(),
  useMoveContentPiece: vi.fn(),
  useCreateContentPiece: vi.fn(),
}));

// Le board rend CreateFromTemplateDialog (useContentTemplates) : on neutralise
// ce hook pour eviter d'avoir besoin d'un QueryClient dans ce test.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/useContentTemplates", () => ({
  useContentTemplates: () => ({ data: [] }),
  useCreatePieceFromTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockedUseBoardPieces = vi.mocked(useBoardPieces);

function piece(overrides: Partial<BoardPiece>): BoardPiece {
  return {
    id: crypto.randomUUID(),
    title: "Contenu",
    format: "youtube_long",
    status: "idea",
    priority: "medium",
    summary: null,
    target_audience: null,
    owner_id: null,
    idea_id: null,
    position: 0,
    scheduled_date: null,
    published_at: null,
    published_url: null,
    is_blocked: false,
    blocked_reason: null,
    blocked_at: null,
    validated_at: null,
    validated_by: null,
    organization_id: "org-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    checklist_total: 0,
    checklist_done: 0,
    ...overrides,
  };
}

describe("StudioBoard", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.mocked(useMoveContentPiece).mockReturnValue({
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useMoveContentPiece>);
    vi.mocked(useCreateContentPiece).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateContentPiece>);
  });

  it("rend les 9 colonnes de statut", () => {
    mockedUseBoardPieces.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useBoardPieces>);

    const { container } = render(<StudioBoard />);

    // Une zone droppable par statut (id = statut), cf. @hello-pangea/dnd.
    const droppables = container.querySelectorAll("[data-rfd-droppable-id]");
    expect(droppables).toHaveLength(9);
    const ids = Array.from(droppables).map((d) => d.getAttribute("data-rfd-droppable-id"));
    expect(ids).toEqual(Object.keys(CONTENT_STATUS_LABELS));
  });

  it("place chaque contenu dans la colonne de son statut", () => {
    mockedUseBoardPieces.mockReturnValue({
      data: [
        piece({ title: "Idée brute", status: "idea" }),
        piece({ title: "En montage", status: "editing" }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useBoardPieces>);

    const { container } = render(<StudioBoard />);

    const editingColumn = container.querySelector<HTMLElement>(
      '[data-rfd-droppable-id="editing"]',
    )!;
    expect(within(editingColumn).getByText("En montage")).toBeInTheDocument();
    expect(within(editingColumn).queryByText("Idée brute")).not.toBeInTheDocument();

    const ideaColumn = container.querySelector<HTMLElement>('[data-rfd-droppable-id="idea"]')!;
    const ideaCard = within(ideaColumn).getByText("Idée brute");
    expect(ideaCard.closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("/studio/content/"),
    );
  });
});
