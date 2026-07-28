import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceIntro from "./ARGovernanceIntro";

vi.mock("./checkArTargetAvailable", () => ({
  checkArTargetAvailable: vi.fn(),
}));

import { checkArTargetAvailable } from "./checkArTargetAvailable";

describe("ARGovernanceIntro entry CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render the primary CTA while the target probe is pending", () => {
    checkArTargetAvailable.mockReturnValue(new Promise(() => {}));

    render(<ARGovernanceIntro onActivateCamera={vi.fn()} onBack={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Activate Camera" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Explore 2D Governance Brief" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beyond the CV" })).toBeInTheDocument();
    expect(
      screen.queryByText("Discover a few of the interests behind the CV."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Point your camera at the first page of my CV to unlock an interactive experience.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Camera processing happens entirely on your device."),
    ).toBeInTheDocument();
    expect(screen.queryByText("AR Governance View")).not.toBeInTheDocument();
  });

  it("shows Activate Camera when the .mind target is available", async () => {
    const onActivateCamera = vi.fn();
    checkArTargetAvailable.mockResolvedValue(true);

    render(<ARGovernanceIntro onActivateCamera={onActivateCamera} onBack={vi.fn()} />);

    const activate = await screen.findByRole("button", { name: "Activate Camera" });
    expect(
      screen.queryByRole("button", { name: "Explore 2D Governance Brief" }),
    ).not.toBeInTheDocument();

    await userEvent.click(activate);
    expect(onActivateCamera).toHaveBeenCalledTimes(1);
  });

  it("shows an unavailable notice without a 2D brief CTA when the target is missing", async () => {
    checkArTargetAvailable.mockResolvedValue(false);

    render(<ARGovernanceIntro onActivateCamera={vi.fn()} onBack={vi.fn()} />);

    expect(
      await screen.findByText(/The AR recognition experience is not currently available/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate Camera" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Explore 2D Governance Brief" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("2D Governance Brief")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
  });

  it("never requests camera permission from the intro screen", async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    checkArTargetAvailable.mockResolvedValue(true);

    render(<ARGovernanceIntro onActivateCamera={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Activate Camera" })).toBeInTheDocument();
    });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("shows previous camera session ended banner when provided", async () => {
    checkArTargetAvailable.mockResolvedValue(true);

    render(
      <ARGovernanceIntro
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
        previousExitReason="arCleanup:cleanupSession"
      />,
    );

    expect(
      await screen.findByText(/Previous camera session ended: arCleanup:cleanupSession/),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-ar-exit-trace-banner", "true");
  });
});
