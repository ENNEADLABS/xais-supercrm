import { describe, it, expect } from "vitest";
import {
  computeSignals,
  type ContentSignalType,
  type SignalInputs,
} from "@/lib/services/contentSignalsService";
import type { ContentPiece, ContentAsset, ContentChecklistItem, Task } from "@/types/database";

// `now` fixe pour des cas déterministes.
const NOW = new Date("2026-06-15T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function piece(overrides: Partial<ContentPiece>): ContentPiece {
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
    updated_at: daysAgo(30),
    deleted_at: null,
    ...overrides,
  };
}

function asset(overrides: Partial<ContentAsset>): ContentAsset {
  return {
    id: "a1",
    organization_id: "org-1",
    content_piece_id: "p1",
    deliverable_id: null,
    document_id: null,
    external_url: "https://x.test/a",
    role: "final_video",
    version_label: null,
    is_final: true,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    ...overrides,
  };
}

function checklistItem(overrides: Partial<ContentChecklistItem>): ContentChecklistItem {
  return {
    id: "c1",
    organization_id: "org-1",
    content_piece_id: "p1",
    label: "Étape",
    position: 0,
    is_done: false,
    done_at: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
    ...overrides,
  };
}

function task(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    organization_id: "org-1",
    title: "Tâche",
    description: null,
    status: "todo",
    priority: "medium",
    task_type: null,
    due_date: null,
    completed_at: null,
    assigned_to: null,
    created_by: null,
    entity_type: "content_piece",
    entity_id: "p1",
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
    ...overrides,
  };
}

const EMPTY: SignalInputs = { assets: [], checklistItems: [], tasks: [], now: NOW };
const types = (p: ContentPiece, i: Partial<SignalInputs> = {}) =>
  computeSignals(p, { ...EMPTY, ...i }).map((s) => s.type);

describe("contentSignalsService.computeSignals", () => {
  it("ne signale rien pour une pièce saine en cours de montage", () => {
    expect(types(piece({ status: "editing", updated_at: daysAgo(1) }))).toEqual([]);
  });

  it("content_overdue : date de publication dépassée et non terminé", () => {
    expect(types(piece({ status: "scheduled", scheduled_date: "2026-06-10" }))).toContain(
      "content_overdue",
    );
  });

  it("pas de content_overdue si publié (terminal)", () => {
    const t = types(
      piece({ status: "published", scheduled_date: "2026-06-10", published_url: "https://x" }),
    );
    expect(t).not.toContain("content_overdue");
  });

  it("missing_final_asset en review sans vidéo finale", () => {
    expect(types(piece({ status: "review", updated_at: daysAgo(1) }))).toContain(
      "missing_final_asset",
    );
  });

  it("pas de missing_final_asset si la vidéo finale existe", () => {
    expect(
      types(piece({ status: "review", updated_at: daysAgo(1) }), {
        assets: [asset({ role: "final_video", is_final: true })],
      }),
    ).not.toContain("missing_final_asset");
  });

  it("PAS de missing_final_asset en editing (normal de ne pas l'avoir)", () => {
    expect(types(piece({ status: "editing" }))).not.toContain("missing_final_asset");
  });

  it("missing_final_asset en scheduled sans miniature finale", () => {
    const t = types(piece({ status: "scheduled", scheduled_date: "2026-12-01" }), {
      assets: [asset({ role: "final_video", is_final: true })],
    });
    expect(t).toContain("missing_final_asset");
  });

  it("missing_final_asset en published sans URL", () => {
    expect(types(piece({ status: "published", published_url: null }))).toContain(
      "missing_final_asset",
    );
  });

  it("checklist_stalled : items incomplets, aucune progression depuis 7 j", () => {
    expect(
      types(piece({ status: "script" }), {
        checklistItems: [checklistItem({ is_done: false, updated_at: daysAgo(10) })],
      }),
    ).toContain("checklist_stalled");
  });

  it("pas de checklist_stalled si progression récente", () => {
    expect(
      types(piece({ status: "script" }), {
        checklistItems: [checklistItem({ is_done: true, done_at: daysAgo(2) })],
      }),
    ).not.toContain("checklist_stalled");
  });

  it("review_too_long : en review > 3 j sans validation", () => {
    expect(types(piece({ status: "review", updated_at: daysAgo(5) }))).toContain("review_too_long");
  });

  it("pas de review_too_long si validé", () => {
    expect(
      types(piece({ status: "review", updated_at: daysAgo(5), validated_at: daysAgo(1) })),
    ).not.toContain("review_too_long");
  });

  it("task_overdue : tâche liée en retard", () => {
    expect(
      types(piece({ status: "script" }), {
        tasks: [task({ due_date: daysAgo(2), status: "todo" })],
      }),
    ).toContain("task_overdue");
  });

  it("pas de task_overdue si la tâche est faite", () => {
    expect(
      types(piece({ status: "script" }), {
        tasks: [task({ due_date: daysAgo(2), status: "done" })],
      }),
    ).not.toContain("task_overdue");
  });

  it("cumule plusieurs signaux", () => {
    const t = types(
      piece({ status: "review", scheduled_date: "2026-06-10", updated_at: daysAgo(5) }),
    );
    expect(t).toEqual(
      expect.arrayContaining<ContentSignalType>([
        "content_overdue",
        "review_too_long",
        "missing_final_asset",
      ]),
    );
  });
});
