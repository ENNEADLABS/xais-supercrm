import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CreateFromTemplateDialog } from "@/components/studio/CreateFromTemplateDialog";
import { useContentTemplates, useCreatePieceFromTemplate } from "@/lib/hooks/useContentTemplates";
import type { ContentTemplate } from "@/types/database";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/hooks/useContentTemplates", () => ({
  useContentTemplates: vi.fn(),
  useCreatePieceFromTemplate: vi.fn(),
}));

const createMutate = vi.fn().mockResolvedValue({ id: "piece-99" });

function template(overrides: Partial<ContentTemplate>): ContentTemplate {
  return {
    id: "tpl-1",
    organization_id: "org-1",
    name: "YouTube Long",
    description: null,
    format: "youtube_long",
    target_audience: null,
    default_priority: "medium",
    script_skeleton: null,
    checklist_items: [],
    deliverable_specs: [],
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  push.mockClear();
  createMutate.mockClear();
  vi.mocked(useContentTemplates).mockReturnValue({
    data: [
      template({ id: "tpl-1", name: "YouTube Long" }),
      template({ id: "tpl-2", name: "Newsletter" }),
    ],
  } as never);
  vi.mocked(useCreatePieceFromTemplate).mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  } as never);
});

afterEach(() => cleanup());

describe("CreateFromTemplateDialog", () => {
  it("applique le template sélectionné avec le titre saisi puis redirige", async () => {
    render(<CreateFromTemplateDialog open onOpenChange={vi.fn()} />);

    // Sélectionne le 2e template
    fireEvent.change(screen.getByLabelText("Template"), { target: { value: "tpl-2" } });
    fireEvent.change(screen.getByLabelText("Titre du contenu"), {
      target: { value: "Mon édition" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Créer le contenu/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith({
      template_id: "tpl-2",
      title: "Mon édition",
      scheduled_date: null,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/studio/content/piece-99"));
  });

  it("désactive la création sans titre", () => {
    render(<CreateFromTemplateDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Créer le contenu/i })).toBeDisabled();
  });
});
