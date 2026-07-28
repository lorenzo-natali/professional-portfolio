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
    expect(button.querySelector(".ar-reticle-mark")).toBeTruthy();
    expect(button.querySelector(".ar-cube-anchor")).toBeNull();

    await userEvent.click(button);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("renders the AR+ logo mark with no animation hooks", () => {
    render(<ARGovernanceCard onLaunch={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Beyond the CV" });
    const mark = button.querySelector(".ar-reticle-mark");
    expect(mark).toBeTruthy();
    expect(mark.getAttribute("style") || "").toMatch(/mask-image/i);
    expect(button.querySelector("animate")).toBeNull();
    expect(button.querySelector("animateTransform")).toBeNull();
  });
});
