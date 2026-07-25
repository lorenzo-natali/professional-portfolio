import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceView from "./ARGovernanceView";

vi.mock("./useIsMobileDevice", () => ({
  useIsMobileDevice: () => true,
}));

vi.mock("./checkArTargetAvailable", () => ({
  checkArTargetAvailable: vi.fn(),
}));

vi.mock("./ARCameraView", () => ({
  default: () => <div data-testid="ar-camera-view">camera</div>,
}));

import { checkArTargetAvailable } from "./checkArTargetAvailable";

describe("ARGovernanceView entry flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.innerHTML = '<div id="root"></div>';
    checkArTargetAvailable.mockResolvedValue(true);
  });

  it("portals the AR root to document.body outside the portfolio main tree", () => {
    const main = document.createElement("main");
    document.getElementById("root").appendChild(main);

    render(
      <ARGovernanceView open onClose={vi.fn()} />,
      { container: main },
    );

    const shell = document.querySelector("[data-ar-viewport-shell='true']");
    expect(shell).toBeTruthy();
    expect(shell.parentElement).toBe(document.body);
    expect(main.contains(shell)).toBe(false);
    expect(document.querySelectorAll("[data-ar-viewport-shell='true']")).toHaveLength(1);
  });

  it("locks the portfolio root against pointer interaction while open", () => {
    const root = document.getElementById("root");
    render(<ARGovernanceView open onClose={vi.fn()} />);

    expect(root.hasAttribute("inert")).toBe(true);
    expect(root.style.pointerEvents).toBe("none");
    expect(document.body.style.position).toBe("fixed");
  });

  it("restores page lock on close", () => {
    const root = document.getElementById("root");
    const { rerender } = render(<ARGovernanceView open onClose={vi.fn()} />);
    expect(root.hasAttribute("inert")).toBe(true);

    rerender(<ARGovernanceView open={false} onClose={vi.fn()} />);

    expect(document.querySelector("[data-ar-viewport-shell='true']")).toBeNull();
    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.style.pointerEvents).toBe("");
    expect(document.body.style.position).toBe("");
  });

  it("opens the 2D brief from intro when the target is missing, without mounting the camera view", async () => {
    checkArTargetAvailable.mockResolvedValue(false);

    render(<ARGovernanceView open onClose={vi.fn()} />);

    const explore = await screen.findByRole("button", { name: "Explore 2D Governance Brief" });
    expect(screen.queryByTestId("ar-camera-view")).not.toBeInTheDocument();

    await userEvent.click(explore);

    expect(await screen.findByText("2D Governance Brief")).toBeInTheDocument();
    expect(
      screen.getByText(/The AR recognition experience is not currently available/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ar-camera-view")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate Camera" })).not.toBeInTheDocument();
  });

  it("mounts the camera view only after Activate Camera when the target is available", async () => {
    checkArTargetAvailable.mockResolvedValue(true);

    render(<ARGovernanceView open onClose={vi.fn()} />);

    const activate = await screen.findByRole("button", { name: "Activate Camera" });
    expect(screen.queryByTestId("ar-camera-view")).not.toBeInTheDocument();

    await userEvent.click(activate);

    expect(await screen.findByTestId("ar-camera-view")).toBeInTheDocument();
  });
});
