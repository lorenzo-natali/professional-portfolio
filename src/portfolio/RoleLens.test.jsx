import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RoleLens from "./RoleLens.jsx";
import { lensOptions } from "./portfolioLens.js";
import { lensSummaries } from "./portfolioData.js";

describe("RoleLens active status", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows no active status in Overview", () => {
    render(<RoleLens selectedLens="Overview" onSelectLens={() => {}} />);
    expect(screen.getByRole("heading", { level: 2, name: "Role Lens" })).toBeTruthy();
    expect(screen.queryByText(/lens active/i)).toBeNull();
    expect(screen.getByText("No lens selected")).toBeTruthy();
  });

  it("exposes the selected lens with aria-pressed", () => {
    const { rerender } = render(
      <RoleLens selectedLens="Overview" onSelectLens={() => {}} />
    );

    for (const lens of lensOptions) {
      expect(
        screen.getByRole("button", { name: lens.label ?? lens.name })
      ).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    }

    rerender(<RoleLens selectedLens="IT Audit" onSelectLens={() => {}} />);
    expect(screen.getByRole("button", { name: "IT Audit" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it.each(lensOptions.map((lens) => [lens.name, lens.label ?? lens.name]))(
    "shows only '%s lens active' without the descriptive summary",
    (lensName, displayLabel) => {
      render(<RoleLens selectedLens={lensName} onSelectLens={() => {}} />);

      expect(
        screen.getByText(`${displayLabel} lens active`)
      ).toBeTruthy();
      expect(screen.queryByText("·")).toBeNull();
      expect(screen.queryByText(lensSummaries[lensName])).toBeNull();
      expect(screen.queryByText(/Highlights /i)).toBeNull();
      expect(screen.getByRole("button", { name: "Reset lens" })).toBeTruthy();
    }
  );

  it("keeps lens buttons and reset behaviour unchanged", () => {
    const onSelectLens = vi.fn();
    render(<RoleLens selectedLens="IT Audit" onSelectLens={onSelectLens} />);

    for (const lens of lensOptions) {
      expect(
        screen.getByRole("button", { name: lens.label ?? lens.name })
      ).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "Reset lens" }));
    expect(onSelectLens).toHaveBeenCalledWith("Overview");
  });
});
