import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { TagBadge } from "@/components/crm/TagBadge";
import type { Tag } from "@/types/database";

/** Cree un tag de test avec des valeurs par defaut */
function createTagFixture(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag-001",
    organization_id: "org-001",
    name: "VIP",
    color: "#e11d48",
    entity_type: "contact",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("TagBadge", () => {
  // Verifie que le nom du tag est affiche
  it("renders the tag name", () => {
    const tag = createTagFixture({ name: "Prospect" });

    const { container } = render(<TagBadge tag={tag} />);

    expect(within(container).getByText("Prospect")).toBeInTheDocument();
  });

  // Verifie que la couleur de fond correspond a la couleur du tag
  it("renders with correct background color", () => {
    const tag = createTagFixture({ color: "#3b82f6" });

    const { container } = render(<TagBadge tag={tag} />);

    const badge = within(container).getByText(tag.name).closest("[class]");
    expect(badge).toHaveStyle({ backgroundColor: "#3b82f6" });
  });

  // Verifie que le bouton de suppression apparait quand onRemove est fourni
  it("shows remove button when onRemove is provided", () => {
    const tag = createTagFixture({ name: "Client" });

    const { container } = render(<TagBadge tag={tag} onRemove={vi.fn()} />);

    expect(
      within(container).getByRole("button", { name: /retirer le tag client/i }),
    ).toBeInTheDocument();
  });

  // Verifie que le bouton de suppression n'apparait pas sans onRemove
  it("does not show remove button when no onRemove", () => {
    const tag = createTagFixture();

    const { container } = render(<TagBadge tag={tag} />);

    expect(within(container).queryByRole("button")).not.toBeInTheDocument();
  });

  // Verifie que onRemove est appele avec le bon ID quand on clique
  it("calls onRemove with tag id when X clicked", async () => {
    const user = userEvent.setup();
    const tag = createTagFixture({ id: "tag-42", name: "Urgent" });
    const handleRemove = vi.fn();

    const { container } = render(<TagBadge tag={tag} onRemove={handleRemove} />);

    await user.click(within(container).getByRole("button", { name: /retirer le tag urgent/i }));

    expect(handleRemove).toHaveBeenCalledOnce();
    expect(handleRemove).toHaveBeenCalledWith("tag-42");
  });
});
