import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/crm/EmptyState";

describe("EmptyState", () => {
  // Verifie que le titre et la description sont affiches
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Users}
        title="Aucun contact"
        description="Ajoutez votre premier contact pour commencer."
      />,
    );

    expect(screen.getByText("Aucun contact")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez votre premier contact pour commencer.")).toBeInTheDocument();
  });

  // Verifie que le lien d'action est affiche quand il est fourni
  it("renders action link when provided", () => {
    const { container } = render(
      <EmptyState
        icon={Users}
        title="Aucun contact"
        description="Commencez maintenant."
        action={{ label: "Ajouter un contact", href: "/contacts/new" }}
      />,
    );

    const link = within(container).getByRole("link", { name: "Ajouter un contact" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/contacts/new");
  });

  // Verifie que le bouton d'action n'est pas affiche quand non fourni
  it("does not render action when not provided", () => {
    const { container } = render(
      <EmptyState icon={Users} title="Aucun contact" description="Rien a afficher." />,
    );

    expect(within(container).queryByRole("link")).not.toBeInTheDocument();
  });
});
