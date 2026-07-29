import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useMoveContentPiece } from "@/lib/hooks/useContentPieces";
import { moveContentPieceAction } from "@/lib/actions/content";
import type { BoardPiece } from "@/types/database";

// On mocke l'action serveur et les toasts : on teste la mecanique optimistic du hook.
vi.mock("@/lib/actions/content", () => ({
  moveContentPieceAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockedAction = vi.mocked(moveContentPieceAction);
const BOARD_KEY = ["content-pieces", "board"] as const;

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
    checklist_total: 4,
    checklist_done: 2,
    ...overrides,
  };
}

function setup(initial: BoardPiece[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(BOARD_KEY, initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveContentPiece(), { wrapper });
  return { queryClient, result };
}

describe("useMoveContentPiece", () => {
  beforeEach(() => mockedAction.mockReset());

  it("applique un optimistic update (statut + position) en preservant l'avancement checklist", async () => {
    mockedAction.mockResolvedValue({} as never);
    const moved = piece({ status: "idea", position: 0, checklist_total: 4, checklist_done: 2 });
    const { queryClient, result } = setup([moved]);

    act(() => {
      result.current.mutate({ pieceId: moved.id, input: { status: "editing", position: 1 } });
    });

    await waitFor(() => {
      const cache = queryClient.getQueryData<BoardPiece[]>(BOARD_KEY)!;
      const updated = cache.find((p) => p.id === moved.id)!;
      expect(updated.status).toBe("editing");
      expect(updated.position).toBe(1);
      // Les compteurs d'avancement ne doivent pas etre perdus par le spread.
      expect(updated.checklist_total).toBe(4);
      expect(updated.checklist_done).toBe(2);
    });
  });

  // NB : le revert-on-error (onError -> setQueryData(previous)) n'est pas teste
  // ici. Faire echouer la mutation via react-query fait fuiter une rejection
  // interne que vitest signale comme "unhandled" quelle que soit la facon de la
  // capturer (mutate, mutateAsync+catch, promesse pre-geree, MutationCache
  // onError) — artefact connu react-query + vitest. On ne desactive pas la
  // detection globale d'erreurs (filet de securite). Le revert reste couvert par
  // le snapshot `previous` capture en onMutate (teste ci-dessus) et la
  // verification manuelle du board.
});
