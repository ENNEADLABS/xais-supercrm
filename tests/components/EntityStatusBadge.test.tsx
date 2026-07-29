import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EntityStatusBadge } from "@/components/crm/EntityStatusBadge";

describe("EntityStatusBadge", () => {
  // Verifie le rendu du statut actif avec le texte et le style vert
  it("renders 'Actif' with green styling for status='active'", () => {
    render(<EntityStatusBadge status="active" />);

    const badge = screen.getByText("Actif");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("emerald");
  });

  // Verifie le rendu du statut archive
  it("renders 'Archivé' for status='archived'", () => {
    render(<EntityStatusBadge status="archived" />);

    const badge = screen.getByText("Archivé");
    expect(badge).toBeInTheDocument();
  });
});
