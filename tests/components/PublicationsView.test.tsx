import { render, screen, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PublicationsView } from "@/components/studio/PublicationsView";
import { usePublications } from "@/lib/hooks/useContentCalendar";
import type { PublicationEntry } from "@/lib/services/contentCalendarService";

vi.mock("@/lib/hooks/useContentCalendar", () => ({ usePublications: vi.fn() }));

function entry(overrides: Partial<PublicationEntry>): PublicationEntry {
  return {
    id: crypto.randomUUID(),
    title: "Livrable",
    channel: "youtube",
    format: "youtube_short",
    status: "planned",
    scheduled_date: "2030-06-01",
    published_at: null,
    published_url: null,
    content_piece_id: "piece-1",
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("PublicationsView", () => {
  it("regroupe par canal et signale les retards", () => {
    vi.mocked(usePublications).mockReturnValue({
      isLoading: false,
      data: [
        entry({ title: "Short en retard", channel: "youtube", scheduled_date: "2020-01-01" }),
        entry({ title: "Post Skool", channel: "skool", scheduled_date: "2030-06-01" }),
        entry({ title: "Sans canal", channel: null }),
      ],
    } as never);

    render(<PublicationsView />);

    // Canaux distincts (titres de section)
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("Skool")).toBeInTheDocument();
    expect(screen.getByText("Canal non défini")).toBeInTheDocument();

    // Regroupement par semaine
    expect(screen.getAllByText(/Semaine du/).length).toBeGreaterThan(0);

    // Signal de retard sur le livrable passé non publié
    expect(screen.getByText("Retard")).toBeInTheDocument();

    // Lien vers le contenu parent
    expect(screen.getByRole("link", { name: "Short en retard" })).toHaveAttribute(
      "href",
      "/studio/content/piece-1",
    );
  });

  it("affiche un état vide", () => {
    vi.mocked(usePublications).mockReturnValue({ isLoading: false, data: [] } as never);
    render(<PublicationsView />);
    expect(screen.getByText(/Aucun livrable/)).toBeInTheDocument();
  });
});
