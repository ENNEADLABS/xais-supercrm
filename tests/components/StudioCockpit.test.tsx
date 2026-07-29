import { render, screen, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StudioCockpit } from "@/components/studio/StudioCockpit";
import { useContentSignals } from "@/lib/hooks/useContentSignals";
import type { BoardPiece } from "@/types/database";

vi.mock("@/lib/hooks/useContentSignals", () => ({ useContentSignals: vi.fn() }));

function piece(overrides: Partial<BoardPiece>): BoardPiece {
  return {
    id: crypto.randomUUID(),
    organization_id: "org-1",
    idea_id: null,
    title: "Contenu",
    format: "youtube_long",
    status: "idea",
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    checklist_total: 0,
    checklist_done: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(useContentSignals).mockReturnValue({
    isLoading: false,
    thisWeek: [piece({ title: "Vidéo de la semaine", scheduled_date: "2026-06-16" })],
    toValidate: [piece({ title: "Short à relire", status: "review" })],
    blocked: [piece({ title: "Post bloqué", is_blocked: true, blocked_reason: "Attente client" })],
    overdue: [piece({ title: "Newsletter en retard", scheduled_date: "2026-01-01" })],
  });
});

afterEach(() => cleanup());

describe("StudioCockpit", () => {
  it("rend les 4 sections opérationnelles", () => {
    render(<StudioCockpit />);
    expect(screen.getByText("À produire cette semaine")).toBeInTheDocument();
    expect(screen.getByText("À valider")).toBeInTheDocument();
    expect(screen.getByText("Bloqués")).toBeInTheDocument();
    expect(screen.getByText("En retard")).toBeInTheDocument();
  });

  it("place chaque pièce dans sa section et affiche le motif de blocage", () => {
    render(<StudioCockpit />);
    expect(screen.getByText("Vidéo de la semaine")).toBeInTheDocument();
    expect(screen.getByText("Short à relire")).toBeInTheDocument();
    expect(screen.getByText("Newsletter en retard")).toBeInTheDocument();
    expect(screen.getByText(/Attente client/)).toBeInTheDocument();
  });

  it("affiche un état de chargement", () => {
    vi.mocked(useContentSignals).mockReturnValue({
      isLoading: true,
      thisWeek: [],
      toValidate: [],
      blocked: [],
      overdue: [],
    });
    const { container } = render(<StudioCockpit />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("lie vers le board", () => {
    render(<StudioCockpit />);
    const boardLink = screen.getByRole("link", { name: /Board/i });
    expect(boardLink).toHaveAttribute("href", "/studio/board");
  });
});
