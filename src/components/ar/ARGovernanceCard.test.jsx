import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceCard from "./ARGovernanceCard";

describe("ARGovernanceCard entry button", () => {
  it("exposes Beyond the CV as the accessible name and launches on click", async () => {
    const onLaunch = vi.fn();
    render(<ARGovernanceCard onLaunch={onLaunch} />);

    const button = screen.getByRole("button", { name: "Beyond the CV" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("ar-lens-button");
    expect(button.querySelector(".ar-reticle-anchor")).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector(".ar-reticle-svg")).toBeTruthy();
    expect(button.querySelector(".ar-cube-anchor")).toBeNull();

    await userEvent.click(button);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("renders the static AR-view glyph with no animation hooks", () => {
    render(<ARGovernanceCard onLaunch={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Beyond the CV" });
    const svg = button.querySelector(".ar-reticle-svg");
    expect(svg).toBeTruthy();
    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.querySelectorAll("path").length).toBe(4);
    expect(button.querySelector("animate")).toBeNull();
    expect(button.querySelector("animateTransform")).toBeNull();
  });
});


