import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SiteDiagRoot from "./SiteDiagRoot.jsx";
import {
  getSiteDiagInitLog,
  resetSiteDiagInitLog,
} from "./siteDiag.js";
import { installPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace.js";
import {
  SITE_DIAG_SECTION_SETS,
  getSectionsForSiteDiagMode,
} from "../portfolio/sectionCatalog.js";
import { getPortfolioSectionRuntimeAudit } from "./sectionRuntimeAudit.js";
import { installPortfolioRuntimeCounters } from "./createPortfolioRuntimeCounters.js";

vi.mock("../App.jsx", () => ({
  default: function MockFullApp({ features }) {
    return (
      <div data-testid="full-portfolio-app">
        <span data-testid="feat-beyond">{String(features?.beyond)}</span>
        <span data-testid="feat-assistant">{String(features?.assistant)}</span>
        <span data-testid="sections">
          {Array.isArray(features?.sections)
            ? features.sections.join(",")
            : "all"}
        </span>
      </div>
    );
  },
}));

vi.mock("../components/ar/beyondBundle.js", () => ({
  ARGovernanceCard: () => null,
  ARGovernanceView: () => null,
  shouldLaunchBeyondCvFromLocation: () => false,
}));

vi.mock("../components/ar/beyondBundleDeferred.jsx", () => ({
  ARGovernanceCard: () => null,
  ARGovernanceView: () => null,
  shouldLaunchBeyondCvFromLocation: () => false,
}));

describe("siteDiag section bisection", () => {
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
    if (window.__portfolioRuntimeCounters) {
      try {
        window.__portfolioRuntimeCounters.dispose();
      } catch {
        // ignore
      }
    }
    sessionStorage.clear();
  });

  it("catalog halves and quarters are disjoint and cover all sections", () => {
    const top = getSectionsForSiteDiagMode("full-top-half");
    const bottom = getSectionsForSiteDiagMode("full-bottom-half");
    expect(top).toEqual([
      "hero",
      "role-lens",
      "capabilities",
      "credentials",
    ]);
    expect(bottom).toEqual([
      "experience",
      "projects",
      "education",
      "risk-radar",
    ]);
    expect(new Set([...top, ...bottom]).size).toBe(8);
    expect(top.some((id) => bottom.includes(id))).toBe(false);

    const q = ["full-q1", "full-q2", "full-q3", "full-q4"].flatMap((m) => [
      ...SITE_DIAG_SECTION_SETS[m],
    ]);
    expect(new Set(q).size).toBe(8);
  });

  it("full-top-half mounts App with only top sections and no Beyond/assistant", async () => {
    render(<SiteDiagRoot mode="full-top-half" />);
    await waitFor(() => {
      expect(screen.getByTestId("full-portfolio-app")).toBeTruthy();
    });
    expect(screen.getByTestId("feat-beyond").textContent).toBe("false");
    expect(screen.getByTestId("feat-assistant").textContent).toBe("false");
    expect(screen.getByTestId("sections").textContent).toBe(
      "hero,role-lens,capabilities,credentials",
    );
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/sectionBisect/);
    expect(log).toMatch(/section:hero/);
    expect(log).not.toMatch(/section:risk-radar/);
    expect(log).not.toMatch(/arBeyond/);
  });

  it("full-bottom-half mounts only bottom sections", async () => {
    render(<SiteDiagRoot mode="full-bottom-half" />);
    await waitFor(() => {
      expect(screen.getByTestId("sections").textContent).toBe(
        "experience,projects,education,risk-radar",
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/section:risk-radar/);
    expect(log).not.toMatch(/section:hero/);
  });

  it("full-q1 only enables hero + role-lens", async () => {
    render(<SiteDiagRoot mode="full-q1" />);
    await waitFor(() => {
      expect(screen.getByTestId("sections").textContent).toBe("hero,role-lens");
    });
  });

  it("publishes section runtime audit rows", () => {
    const rows = getPortfolioSectionRuntimeAudit();
    expect(rows.find((r) => r.section === "hero")?.risk).toBe("high");
    expect(rows.find((r) => r.section === "risk-radar")?.risk).toBe("high");
    expect(rows.length).toBe(8);
  });

  it("runtime counters expose a bounded snapshot", () => {
    const api = installPortfolioRuntimeCounters({ force: true });
    const snap = api.getSnapshot();
    expect(snap.enabled).toBe(true);
    expect(typeof snap.liveRaf).toBe("number");
    expect(typeof snap.domNodes).toBe("number");
    expect(document.querySelector("[data-portfolio-runtime-counters]")).toBeTruthy();
    api.dispose();
  });
});
