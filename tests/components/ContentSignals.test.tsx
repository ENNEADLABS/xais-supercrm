import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { ContentCard } from "@/components/studio/ContentCard";
import { ContentDetailHeader } from "@/components/studio/ContentDetailHeader";
import {
  useUpdateContentPiece,
  useUnblockPiece,
  useValidatePiece,
} from "@/lib/hooks/useContentPieces";
import type { BoardPiece, ContentPiece } from "@/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/useContentPieces", () => ({
  useUpdateContentPiece: vi.fn(),
  useUnblockPiece: vi.fn(),
  useValidatePiece: vi.fn(),
  useBlockPiece: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

function boardPiece(overrides: Partial<BoardPiece>): BoardPiece {
  return {
    id: "p1",
    organization_id: "org-1",
    idea_id: null,
    title: "Contenu",
    format: "youtube_long",
    status: "editing",
    summary: null,
    target_audience: null,
    priority: "medium",
    owner_id: null,
    position: 0,
    scheduled_date: null,
    published_at: null,
    published_url: null,
    is_blocked: false,
    blocked_reason: null,
    blocked_at: null,
    validated_at: null,
    validated_by: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    deleted_at: null,
    checklist_total: 0,
    checklist_done: 0,
    ...overrides,
  };
}

function renderCard(piece: BoardPiece) {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="col">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <ContentCard piece={piece} index={0} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>,
  );
}

const validateMutate = vi.fn();

beforeEach(() => {
  validateMutate.mockClear();
  vi.mocked(useUpdateContentPiece).mockReturnValue({ mutate: vi.fn() } as never);
  vi.mocked(useUnblockPiece).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useValidatePiece).mockReturnValue({
    mutate: validateMutate,
    isPending: false,
  } as never);
});

afterEach(() => cleanup());

describe("Signaux / blocage / validation (UI)", () => {
  it("affiche le badge « Bloqué » sur une carte bloquée", () => {
    renderCard(boardPiece({ is_blocked: true, blocked_reason: "Attente client" }));
    expect(screen.getByText("Bloqué")).toBeInTheDocument();
  });

  it("affiche un signal sur une carte à risque (review > 3 j non validé)", () => {
    renderCard(boardPiece({ status: "review", updated_at: daysAgo(5), validated_at: null }));
    expect(screen.getByText(/En relecture depuis plus de 3 jours/i)).toBeInTheDocument();
  });

  it("le bouton Valider appelle l'action de validation", () => {
    const piece: ContentPiece = { ...boardPiece({ status: "review" }) };
    render(<ContentDetailHeader piece={piece} />);

    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(validateMutate).toHaveBeenCalledWith("p1");
  });

  it("masque Valider si déjà validé", () => {
    const piece: ContentPiece = { ...boardPiece({ status: "review", validated_at: daysAgo(1) }) };
    render(<ContentDetailHeader piece={piece} />);
    expect(screen.queryByRole("button", { name: /^Valider$/i })).not.toBeInTheDocument();
  });
});
