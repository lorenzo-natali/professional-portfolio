import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ARGovernanceView from "./ARGovernanceView";
import { attachArCameraDiagnostics } from "./arCameraDiagnostics";

const mobileMock = vi.hoisted(() => ({ isMobile: true }));
const trackingHandlers = vi.hoisted(() => ({}));

vi.mock("./useIsMobileDevice", () => ({
  useIsMobileDevice: () => mobileMock.isMobile,
}));

vi.mock("./checkArTargetAvailable", () => ({
  checkArTargetAvailable: vi.fn(async () => true),
}));

vi.mock("./ARTrackingScene", () => ({
  default: function MockARTrackingScene(props) {
    trackingHandlers.onReady = props.onReady;
    trackingHandlers.onTargetFound = props.onTargetFound;
    trackingHandlers.onTargetLost = props.onTargetLost;
    trackingHandlers.onVideoReady = props.onVideoReady;
    return (
      <div
        data-testid="tracking-scene"
        data-ar-tracking-container="true"
        className="ar-tracking-container"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />
    );
  },
}));

vi.mock("./tracking/ARTrackingProvider", () => ({
  ARTrackingProvider: ({ children }) => children,
}));

vi.mock("./arCameraDiagnostics", async () => {
  const actual = await vi.importActual("./arCameraDiagnostics");
  return {
    ...actual,
    attachArCameraDiagnostics: vi.fn((options) => actual.attachArCameraDiagnostics(options)),
  };
});

function stubReadyVideo() {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: 390 });
  Object.defineProperty(container, "clientHeight", { value: 844 });
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: 1280 });
  Object.defineProperty(video, "videoHeight", { value: 720 });
  Object.defineProperty(video, "clientWidth", { value: 390 });
  Object.defineProperty(video, "clientHeight", { value: 844 });
  video.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 390,
    height: 844,
    top: 0,
    left: 0,
    right: 390,
    bottom: 844,
  });
  Object.defineProperty(video, "srcObject", {
    value: {
      getVideoTracks: () => [
        {
          getSettings: () => ({
            width: 1280,
            height: 720,
            frameRate: 30,
            facingMode: "environment",
            deviceId: "secret-device",
          }),
          getConstraints: () => ({ facingMode: "environment" }),
          getCapabilities: () => ({ width: { max: 1920 }, deviceId: "secret-device" }),
        },
      ],
    },
  });
  container.appendChild(video);
  return { video, container };
}

const URL_FORMS = [
  "/professional-portfolio/?arCameraDebug=1",
  "/professional-portfolio?arCameraDebug=1",
  "/professional-portfolio/#/?arCameraDebug=1",
  "/professional-portfolio/?foo=1&arCameraDebug=1",
  "https://lorenzo-natali.github.io/professional-portfolio/?arCameraDebug=1",
  "/professional-portfolio/?arCameraDebug=1#frag",
];

async function openCameraThroughApp() {
  render(<ARGovernanceView open onClose={vi.fn()} />);
  const shell = document.querySelector("[data-ar-viewport-shell='true']");
  expect(shell).toBeTruthy();
  expect(shell.getAttribute("data-ar-camera-debug")).toBe("1");

  const activate = await screen.findByRole("button", { name: "Activate Camera" });
  await userEvent.click(activate);

  const stage = document.querySelector("[data-ar-camera-stage='true']");
  expect(stage).toBeTruthy();
  expect(shell.contains(stage)).toBe(true);
  return { shell, stage };
}

describe("AR camera diagnostics integration", () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '<div id="root"></div>';
    mobileMock.isMobile = true;
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it.each(URL_FORMS)("mounts Waiting diagnostics for URL form %s", async (form) => {
    if (form.startsWith("http")) {
      const url = new URL(form);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    } else {
      window.history.replaceState({}, "", form);
    }

    const { shell, stage } = await openCameraThroughApp();
    const panel = stage.querySelector("[data-ar-camera-diagnostics='true']");
    expect(panel).toBeTruthy();
    expect(shell.contains(panel)).toBe(true);
    expect(panel.getAttribute("data-ar-camera-diagnostics-waiting")).toBe("true");
    expect(panel.textContent).toMatch(/Waiting for camera video metadata/);

    const rect = panel.getBoundingClientRect();
    // jsdom often returns a zero box; still assert the node is in the stage stacking path.
    expect(panel.className).toContain("ar-camera-diagnostics");
    expect(stage.contains(panel)).toBe(true);
    expect(rect).toBeTruthy();

    const tracking = stage.querySelector("[data-ar-tracking-container='true']");
    expect(tracking).toBeTruthy();
    expect(
      tracking.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("fills measurements after mocked onVideoReady and survives target found/lost", async () => {
    window.history.replaceState({}, "", "/professional-portfolio/?arCameraDebug=1");
    const { stage } = await openCameraThroughApp();

    const { video, container } = stubReadyVideo();
    await act(async () => {
      trackingHandlers.onVideoReady?.({ video, container });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(attachArCameraDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ forceEnabled: true, video }),
    );

    const panel = stage.querySelector("[data-ar-camera-diagnostics='true']");
    expect(panel.textContent).toMatch(/Native:\s*1280\s*×\s*720/);
    expect(within(stage).getByRole("button", { name: "Copy diagnostics" })).toBeInTheDocument();

    await act(async () => {
      trackingHandlers.onTargetFound?.();
      trackingHandlers.onTargetLost?.();
    });

    expect(stage.querySelector("[data-ar-camera-diagnostics='true']")).toBeTruthy();
    expect(screen.getByText("Reframe the CV to continue")).toBeInTheDocument();
  });

  it("never mounts diagnostics when the debug flag is absent", async () => {
    window.history.replaceState({}, "", "/professional-portfolio/?foo=1");
    render(<ARGovernanceView open onClose={vi.fn()} />);

    const shell = document.querySelector("[data-ar-viewport-shell='true']");
    expect(shell.getAttribute("data-ar-camera-debug")).toBe("0");

    await userEvent.click(await screen.findByRole("button", { name: "Activate Camera" }));
    expect(document.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
    expect(attachArCameraDiagnostics).not.toHaveBeenCalled();
  });

  it("keeps the session flag on after the URL loses arCameraDebug mid-session", async () => {
    window.history.replaceState({}, "", "/professional-portfolio/?arCameraDebug=1");
    const { stage } = await openCameraThroughApp();
    expect(stage.querySelector("[data-ar-camera-diagnostics='true']")).toBeTruthy();

    window.history.replaceState({}, "", "/professional-portfolio/");
    expect(stage.querySelector("[data-ar-camera-diagnostics='true']")).toBeTruthy();

    const { video, container } = stubReadyVideo();
    await act(async () => {
      trackingHandlers.onVideoReady?.({ video, container });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(attachArCameraDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ forceEnabled: true }),
    );
    expect(stage.querySelector("[data-ar-camera-diagnostics='true']")?.textContent).toMatch(
      /Native:/,
    );
  });

  it("removes the panel and does not keep listeners after Close", async () => {
    window.history.replaceState({}, "", "/professional-portfolio/?arCameraDebug=1");
    const onClose = vi.fn();
    const { rerender } = render(<ARGovernanceView open onClose={onClose} />);

    await userEvent.click(await screen.findByRole("button", { name: "Activate Camera" }));
    expect(document.querySelector("[data-ar-camera-diagnostics='true']")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();

    rerender(<ARGovernanceView open={false} onClose={onClose} />);
    expect(document.querySelector("[data-ar-viewport-shell='true']")).toBeNull();
    expect(document.querySelector("[data-ar-camera-diagnostics='true']")).toBeNull();
  });
});
