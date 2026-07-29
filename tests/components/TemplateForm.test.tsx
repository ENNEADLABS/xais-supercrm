import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TemplateForm } from "@/components/studio/TemplateForm";
import { useCreateTemplate, useUpdateTemplate } from "@/lib/hooks/useContentTemplates";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/useContentTemplates", () => ({
  useCreateTemplate: vi.fn(),
  useUpdateTemplate: vi.fn(),
}));

const createMutate = vi.fn().mockResolvedValue({ id: "tpl-1" });
const updateMutate = vi.fn().mockResolvedValue({ id: "tpl-1" });

beforeEach(() => {
  createMutate.mockClear();
  updateMutate.mockClear();
  vi.mocked(useCreateTemplate).mockReturnValue({ mutateAsync: createMutate } as never);
  vi.mocked(useUpdateTemplate).mockReturnValue({ mutateAsync: updateMutate } as never);
});

afterEach(() => cleanup());

describe("TemplateForm", () => {
  it("permet d'éditer les listes (checklist + livrables) et soumet le bon payload", async () => {
    render(<TemplateForm />);

    fireEvent.change(screen.getByLabelText("Nom *"), { target: { value: "YouTube Long" } });

    // Ajoute une étape de checklist
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une étape/i }));
    fireEvent.change(screen.getByPlaceholderText("Étape 1"), { target: { value: "Tournage" } });

    // Ajoute un livrable + renseigne son titre
    fireEvent.click(screen.getByRole("button", { name: /Ajouter un livrable/i }));
    fireEvent.change(screen.getByPlaceholderText("Titre du livrable"), {
      target: { value: "Short extrait" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Créer le template/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const payload = createMutate.mock.calls[0][0];
    expect(payload.name).toBe("YouTube Long");
    expect(payload.checklist_items).toEqual(["Tournage"]);
    expect(payload.deliverable_specs).toHaveLength(1);
    expect(payload.deliverable_specs[0].title).toBe("Short extrait");
  });

  it("retire une étape de checklist", async () => {
    render(<TemplateForm />);

    fireEvent.click(screen.getByRole("button", { name: /Ajouter une étape/i }));
    expect(screen.getByPlaceholderText("Étape 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Supprimer l'étape/i }));
    expect(screen.queryByPlaceholderText("Étape 1")).not.toBeInTheDocument();
  });
});
