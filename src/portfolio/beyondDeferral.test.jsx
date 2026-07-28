import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import App from "../App.jsx";
import {
  getSourceImportContracts,
} from "../diagnostics/importGraphAudit.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const lightBeyond = {
  ARGovernanceCard: ({ onLaunch }) => (
    <button type="button" onClick={onLaunch}>
      Beyond the CV
    </button>
  ),
  shouldLaunchBeyondCvFromLocation: () => false,
};

vi.mock("./sections/HeroSection.jsx", () => ({
  default: () => <div data-testid="mock-hero" data-portfolio-section="hero" />,
}));

// Keep PortfolioCore lightweight — avoid mounting real tickers/sections here.
vi.mock("./PortfolioCore.jsx", () => ({
  default: ({ sidebarSlot }) => (
    <div data-testid="mock-core">
      {sidebarSlot}
    </div>
  ),
}));

describe("Beyond deferred until open (Step 6.4)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("beyondBundle.js is light — no ARGovernanceView export", () => {
    const src = readFileSync(
      path.join(rootDir, "src/components/ar/beyondBundle.js"),
      "utf8",
    );
    expect(src).toMatch(/ARGovernanceCard/);
    expect(src).not.toMatch(/from\s+["']\.\/ARGovernanceView/);
    expect(src).not.toMatch(/export\s+\{[^}]*ARGovernanceView/);
    const contracts = getSourceImportContracts();
    expect(contracts.beyondBundleIsLight).toBe(true);
    expect(contracts.appDefersBeyondViewUntilOpen).toBe(true);
  });

  it("does not mount ARGovernanceView while Beyond is closed", () => {
    render(
      <App
        features={{ beyond: true, assistant: false, intro: false, preload: false }}
        beyondModules={lightBeyond}
      />,
    );
    expect(screen.getByRole("button", { name: "Beyond the CV" })).toBeInTheDocument();
    expect(document.querySelector("[data-ar-portal-host]")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Beyond the CV" })).toBeNull();
  });

  it("lazy-imports ARGovernanceView only after launch", async () => {
    const user = userEvent.setup();
    const viewSpy = vi.fn(function MockView({ open, onClose }) {
      if (!open) return null;
      return (
        <div data-testid="ar-view-open">
          <button type="button" onClick={onClose}>
            Close AR
          </button>
        </div>
      );
    });

    vi.doMock("../components/ar/ARGovernanceView.jsx", () => ({
      default: viewSpy,
    }));

    // Injected view path (tests): still only mounts when arOpen.
    render(
      <App
        features={{ beyond: true, assistant: false, intro: false, preload: false }}
        beyondModules={{
          ...lightBeyond,
          ARGovernanceView: viewSpy,
        }}
      />,
    );

    expect(viewSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Beyond the CV" }));

    await waitFor(() => {
      expect(viewSpy).toHaveBeenCalled();
      expect(screen.getByTestId("ar-view-open")).toBeInTheDocument();
    });
  });
});

describe("observer / listener bounds (source contracts)", () => {
  it("shared ticker scheduler + iOS profile are wired from main", () => {
    const contracts = getSourceImportContracts();
    expect(contracts.mainAppliesIosStability).toBe(true);
    const scheduler = readFileSync(
      path.join(rootDir, "src/portfolio/createTickerScheduler.js"),
      "utf8",
    );
    expect(scheduler).toMatch(/IntersectionObserver/);
    expect(scheduler).toMatch(/activeSchedulerCount/);
    expect(scheduler).toMatch(/requestAnimationFrame/);
  });
});
