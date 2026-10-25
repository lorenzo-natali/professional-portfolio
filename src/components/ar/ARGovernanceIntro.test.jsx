import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceIntro from "./ARGovernanceIntro";

describe("ARGovernanceIntro entry CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("on first paint with a resolved available target shows Activate Camera and Back together", () => {
    render(
      <ARGovernanceIntro
        targetAvailable
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Activate Camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "BEYOND THE CV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate Camera" })).toHaveClass("beyond-cv-primary");
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toHaveClass("beyond-cv-secondary");
    expect(
      screen.getByText(
        "Your next discovery begins with the first page of my CV. Point your camera at it to bring the experience to life.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Camera processing happens entirely on your device."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Explore 2D Governance Brief" }),
    ).not.toBeInTheDocument();
  });

  it("returns to chat only when the experience was opened from the assistant", async () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <ARGovernanceIntro
        targetAvailable
        returnToChat
        onActivateCamera={vi.fn()}
        onBack={onBack}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Back to Chat" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Back to Portfolio" })).not.toBeInTheDocument();

    rerender(
      <ARGovernanceIntro
        targetAvailable
        returnToChat={false}
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Chat" })).not.toBeInTheDocument();
  });

  it("shows Activate Camera when the .mind target is available", async () => {
    const onActivateCamera = vi.fn();

    render(
      <ARGovernanceIntro
        targetAvailable
        onActivateCamera={onActivateCamera}
        onBack={vi.fn()}
      />,
    );

    const activate = screen.getByRole("button", { name: "Activate Camera" });
    await userEvent.click(activate);
    expect(onActivateCamera).toHaveBeenCalledTimes(1);
  });

  it("shows an unavailable notice without Activate Camera when the target is missing", () => {
    render(
      <ARGovernanceIntro
        targetAvailable={false}
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/The AR recognition experience is not currently available/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activate Camera" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Portfolio" })).toBeInTheDocument();
  });

  it("never requests camera permission from the intro screen", () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    render(
      <ARGovernanceIntro
        targetAvailable
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Activate Camera" })).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("shows previous camera session ended banner when provided", () => {
    render(
      <ARGovernanceIntro
        targetAvailable
        onActivateCamera={vi.fn()}
        onBack={vi.fn()}
        previousExitReason="arCleanup:cleanupSession"
      />,
    );

    expect(
      screen.getByText(/Previous camera session ended: arCleanup:cleanupSession/),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-ar-exit-trace-banner", "true");
  });
});
