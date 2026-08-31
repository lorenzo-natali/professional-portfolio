import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceCard from "./ARGovernanceCard";

describe("ARGovernanceCard entry button", () => {
  it("exposes Beyond CV as the accessible name and launches on click", async () => {
    const onLaunch = vi.fn();
    render(<ARGovernanceCard onLaunch={onLaunch} />);

    const button = screen.getByRole("button", { name: "Beyond CV" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("ar-lens-button");
    expect(button.querySelector(".ar-reticle-anchor")).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector(".ar-reticle-mark")).toBeTruthy();
    expect(button.querySelector(".ar-cube-anchor")).toBeNull();

    await userEvent.click(button);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("renders the AR+ logo mark with larger Beyond CV label and no animation hooks", () => {
    render(<ARGovernanceCard onLaunch={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Beyond CV" });
    const label = button.querySelector("span.absolute");
    expect(label?.textContent).toBe("Beyond CV");
    expect(label?.className).toMatch(/text-\[14px\]/);
    const mark = button.querySelector(".ar-reticle-mark");
    expect(mark).toBeTruthy();
    expect(mark.getAttribute("style") || "").toMatch(/mask-image/i);
    expect(button.querySelector("animate")).toBeNull();
    expect(button.querySelector("animateTransform")).toBeNull();
    expect(
      screen.getByText("Discover the person behind the professional.")
    ).toBeTruthy();
  });
});
