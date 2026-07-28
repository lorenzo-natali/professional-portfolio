import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SiteDiagRoot from "./SiteDiagRoot.jsx";
import {
  getSiteDiagInitLog,
  resetSiteDiagInitLog,
} from "./siteDiag.js";
import { installPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace.js";
import { getPortfolioRuntimeOwnerMatrix } from "./portfolioRuntimeOwners.js";

vi.mock("../App.jsx", () => ({
  default: function MockFullApp() {
    return <div data-testid="full-portfolio-app">full-app</div>;
  },
}));

describe("SiteDiagRoot subsystem contracts", () => {
  beforeEach(() => {
    resetSiteDiagInitLog();
    sessionStorage.clear();
    if (window.__portfolioLifecycleTrace) {
      try {
        window.__portfolioLifecycleTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__portfolioLifecycleTrace;
    }
    installPortfolioLifecycleTrace({ enabled: true, force: true });
  });

  afterEach(() => {
    resetSiteDiagInitLog();
    if (window.__portfolioLifecycleTrace) {
      try {
        window.__portfolioLifecycleTrace.dispose();
      } catch {
        // ignore
      }
      delete window.__portfolioLifecycleTrace;
    }
    sessionStorage.clear();
  });

  it("blank does not initialize motion/ticker/assistant/AR/full app", async () => {
    render(<SiteDiagRoot mode="blank" />);
    await waitFor(() => {
      expect(getSiteDiagInitLog().some((e) => e.startsWith("staticText"))).toBe(
        true,
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).not.toMatch(/framerMotion/);
    expect(log).not.toMatch(/tickerRaf/);
    expect(log).not.toMatch(/portfolioAssistant/);
    expect(log).not.toMatch(/fullPortfolioApp/);
    expect(log).not.toMatch(/arBeyond/);
    expect(document.querySelector('[data-site-diag-blank="1"]')).toBeTruthy();
    expect(document.querySelector('[data-site-diag-ticker="1"]')).toBeNull();
    expect(screen.queryByTestId("full-portfolio-app")).toBeNull();

    const matrix = document.querySelector('[data-site-diag-matrix="blank"]');
    expect(matrix).toBeTruthy();
    expect(
      matrix.querySelector('[data-site-diag-subsystem="framerMotion"]')?.dataset
        .enabled,
    ).toBe("0");
  });

  it("shell enables staticShell but not motion or ticker", async () => {
    render(<SiteDiagRoot mode="shell" />);
    await waitFor(() => {
      expect(getSiteDiagInitLog().some((e) => e.startsWith("staticShell"))).toBe(
        true,
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).not.toMatch(/framerMotion/);
    expect(log).not.toMatch(/tickerRaf/);
    expect(document.querySelector('[data-site-diag-shell="shell"]')).toBeTruthy();
    expect(document.querySelector('[data-site-diag-ticker="1"]')).toBeNull();
  });

  it("motion enables framerMotion but not ticker or assistant", async () => {
    render(<SiteDiagRoot mode="motion" />);
    await waitFor(() => {
      expect(getSiteDiagInitLog().some((e) => e.startsWith("framerMotion"))).toBe(
        true,
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).not.toMatch(/tickerRaf/);
    expect(log).not.toMatch(/portfolioAssistant/);
    expect(log).not.toMatch(/framerMotionInfinite/);
    expect(document.querySelector('[data-site-diag-ticker="1"]')).toBeNull();
  });

  it("effects enables ticker + infinite motion but not assistant/AR", async () => {
    render(<SiteDiagRoot mode="effects" />);
    await waitFor(() => {
      expect(getSiteDiagInitLog().some((e) => e.startsWith("tickerRaf"))).toBe(
        true,
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/framerMotionInfinite/);
    expect(log).toMatch(/cssInfiniteAnimations/);
    expect(log).not.toMatch(/portfolioAssistant/);
    expect(log).not.toMatch(/arBeyond/);
    expect(document.querySelector('[data-site-diag-ticker="1"]')).toBeTruthy();
  });

  it("full mounts portfolio app probe path", async () => {
    render(<SiteDiagRoot mode="full" />);
    await waitFor(() => {
      expect(screen.getByTestId("full-portfolio-app")).toBeTruthy();
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/fullPortfolioApp/);
  });
});

describe("portfolio runtime owner audit", () => {
  it("lists homepage long-lived owners with cleanup notes", () => {
    const matrix = getPortfolioRuntimeOwnerMatrix();
    expect(matrix.length).toBeGreaterThan(8);
    const ticker = matrix.find((r) => r.subsystem.includes("TickerStream"));
    expect(ticker?.mountedOnHomepage).toBe("true");
    expect(ticker?.suspectedRisk).toBe("high");
    const sw = matrix.find((r) => r.subsystem.includes("Service worker"));
    expect(sw?.mountedOnHomepage).toBe("false");
  });
});
