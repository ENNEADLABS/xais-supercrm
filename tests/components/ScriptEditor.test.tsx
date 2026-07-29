import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScriptEditor } from "@/components/studio/ScriptEditor";
import { useContentScript, useUpsertScript } from "@/lib/hooks/useContentScript";

vi.mock("@/lib/hooks/useContentScript", () => ({
  useContentScript: vi.fn(),
  useUpsertScript: vi.fn(),
}));

const mockedUseContentScript = vi.mocked(useContentScript);
const mockedUseUpsertScript = vi.mocked(useUpsertScript);
const mutateAsync = vi.fn().mockResolvedValue({});

function scriptQuery(data: unknown) {
  return { data, isLoading: false } as unknown as ReturnType<typeof useContentScript>;
}

describe("ScriptEditor", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mutateAsync.mockClear();
    mockedUseUpsertScript.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpsertScript>);
  });

  it("hydrate les champs depuis le script existant", async () => {
    mockedUseContentScript.mockReturnValue(
      scriptQuery({ content_piece_id: "piece-1", hook: "Mon accroche", intro: "Mon intro" }),
    );
    render(<ScriptEditor contentPieceId="piece-1" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Accroche (hook)")).toHaveValue("Mon accroche"),
    );
    expect(screen.getByLabelText("Intro")).toHaveValue("Mon intro");
  });

  it("enregistre le script avec le content_piece_id et la valeur saisie", async () => {
    mockedUseContentScript.mockReturnValue(scriptQuery(null));
    const user = userEvent.setup();
    render(<ScriptEditor contentPieceId="piece-1" />);

    await user.type(screen.getByLabelText("Accroche (hook)"), "Nouvelle accroche");
    await user.click(screen.getByRole("button", { name: /Enregistrer le script/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ content_piece_id: "piece-1", hook: "Nouvelle accroche" }),
    );
  });
});
