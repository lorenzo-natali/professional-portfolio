import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceView from "./ARGovernanceView";

const mobileMock = vi.hoisted(() => ({ isMobile: true }));

vi.mock("./useIsMobileDevice", () => ({
  useIsMobileDevice: () => mobileMock.isMobile,
}));

vi.mock("./checkArTargetAvailable", () => ({
  checkArTargetAvailable: vi.fn(),
}));

vi.mock("./ARCameraView", () => ({
  default: () => <div data-testid="ar-camera-view">camera</div>,
}));

import { checkArTargetAvailable } from "./checkArTargetAvailable";

function portalScope() {
  const host = document.querySelector("[data-ar-portal-host='true']");
  expect(host).toBeTruthy();
  return within(/** @type {HTMLElement} */ (host));
}

describe("ARGovernanceView entry flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.innerHTML = '<div id="root"></div>';
    document.querySelectorAll("[data-ar-portal-host='true']").forEach((el) => el.remove());
    mobileMock.isMobile = true;
    checkArTargetAvailable.mockResolvedValue(true);
  });

  it("portals the AR root through ar-portal-host under document.documentElement", () => {
    const main = document.createElement("main");
    document.getElementById("root").appendChild(main);

    render(<ARGovernanceView open onClose={vi.fn()} />, { container: main });

    const shell = document.querySelector("[data-ar-viewport-shell='true']");
    const host = document.querySelector("[data-ar-portal-host='true']");
    expect(shell).toBeTruthy();
    expect(host).toBeTruthy();
    expect(host.parentElement).toBe(document.documentElement);
    expect(shell.parentElement).toBe(host);
    expect(main.contains(shell)).toBe(false);
    expect(document.querySelectorAll("[data-ar-viewport-shell='true']")).toHaveLength(1);
  });

  it("keeps the shell fullscreen-anchored with intro content inside the visible shell", async () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 360,
        height: 640,
        offsetLeft: 12,
        offsetTop: 24,
        scale: 1,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const main = document.createElement("main");
    main.style.height = "4000px";
    document.getElementById("root").appendChild(main);

    render(<ARGovernanceView open onClose={vi.fn()} />, { container: main });

    const shell = document.querySelector("[data-ar-viewport-shell='true']");
    expect(shell.style.left).toBe("0px");
    expect(shell.style.top).toBe("0px");
    expect(shell.style.right).toBe("0px");
    expect(shell.style.bottom).toBe("0px");
    expect(shell.style.width).toBe("auto");
    expect(shell.style.height).toBe("auto");
    expect(shell.style.maxWidth).toBe("none");
    // Must ignore the narrower visualViewport box that caused the right page gap.
    expect(shell.style.width).not.toBe("360px");
    expect(shell.style.left).not.toBe("12px");
    const host = document.querySelector("[data-ar-portal-host='true']");
    expect(host.style.width).toBe("auto");
    expect(host.style.maxWidth).toBe("none");

    const scope = portalScope();
    const introTitle = await scope.findByRole("heading", { name: "Beyond the CV" });
    expect(shell.contains(introTitle)).toBe(true);
    expect(await scope.findByRole("button", { name: "Back to Portfolio" })).toBeTruthy();
  });

  it("shows a centered desktop gate without the 2D brief CTA", () => {
    mobileMock.isMobile = false;
    render(<ARGovernanceView open onClose={vi.fn()} />);

    const scope = portalScope();
    expect(scope.getByRole("heading", { name: "Designed for smartphones." })).toBeTruthy();
    expect(scope.queryByText("AR Governance View")).toBeNull();
    expect(scope.queryByRole("button", { name: "View 2D Governance Brief" })).toBeNull();
    expect(scope.queryByText("2D Governance Brief")).toBeNull();
    expect(scope.getByRole("button", { name: "Close" })).toBeTruthy();
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

  it("does not offer a 2D brief when the target is missing", async () => {
    checkArTargetAvailable.mockResolvedValue(false);

    render(<ARGovernanceView open onClose={vi.fn()} />);

    const scope = portalScope();
    expect(
      await scope.findByText(/The AR recognition experience is not currently available/),
    ).toBeTruthy();
    expect(scope.queryByTestId("ar-camera-view")).toBeNull();
    expect(scope.queryByRole("button", { name: "Explore 2D Governance Brief" })).toBeNull();
    expect(scope.queryByText("2D Governance Brief")).toBeNull();
    expect(scope.queryByText("Governance view ready")).toBeNull();
  });

  it("mounts the camera view only after Activate Camera when the target is available", async () => {
    checkArTargetAvailable.mockResolvedValue(true);

    render(<ARGovernanceView open onClose={vi.fn()} />);

    const scope = portalScope();
    const activate = await scope.findByRole("button", { name: "Activate Camera" });
    expect(scope.queryByTestId("ar-camera-view")).toBeNull();

    await userEvent.click(activate);

    expect(await scope.findByTestId("ar-camera-view")).toBeTruthy();
  });
});
