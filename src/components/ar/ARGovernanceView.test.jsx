import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
