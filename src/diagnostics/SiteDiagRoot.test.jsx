import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SiteDiagRoot from "./SiteDiagRoot.jsx";
import {
  getSiteDiagInitLog,
  resetSiteDiagInitLog,
} from "./siteDiag.js";
import { installPortfolioLifecycleTrace } from "./createPortfolioLifecycleTrace.js";
import { getPortfolioRuntimeOwnerMatrix } from "./portfolioRuntimeOwners.js";
import { getFullVsEffectsDeltaMatrix } from "./fullVsEffectsDelta.js";
import {
  VARIANT_IMPORT_EXPECTATIONS,
  getSourceImportContracts,
} from "./importGraphAudit.js";

vi.mock("../App.jsx", () => ({
  default: function MockFullApp({ features, beyondModules }) {
    return (
      <div data-testid="full-portfolio-app">
        <span data-testid="feat-beyond">{String(features?.beyond)}</span>
        <span data-testid="feat-assistant">{String(features?.assistant)}</span>
        <span data-testid="feat-intro">{String(features?.intro)}</span>
        <span data-testid="feat-preload">{String(features?.preload)}</span>
        <span data-testid="beyond-modules">{beyondModules ? "yes" : "no"}</span>
      </div>
    );
  },
}));

vi.mock("../components/ar/beyondBundle.js", () => ({
  ARGovernanceCard: () => null,
  shouldLaunchBeyondCvFromLocation: () => false,
}));

vi.mock("../components/ar/beyondBundleDeferred.jsx", () => ({
  ARGovernanceCard: () => null,
  shouldLaunchBeyondCvFromLocation: () => false,
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
    expect(screen.queryByTestId("full-portfolio-app")).toBeNull();
  });

  it("effects enables ticker but not assistant/AR/full app", async () => {
    render(<SiteDiagRoot mode="effects" />);
    await waitFor(() => {
      expect(getSiteDiagInitLog().some((e) => e.startsWith("tickerRaf"))).toBe(
        true,
      );
    });
    const log = getSiteDiagInitLog().join("\n");
    expect(log).not.toMatch(/portfolioAssistant/);
    expect(log).not.toMatch(/arBeyond/);
    expect(log).not.toMatch(/fullPortfolioApp/);
  });

  it("full-no-beyond loads App without beyond modules", async () => {
    render(<SiteDiagRoot mode="full-no-beyond" />);
    await waitFor(() => {
      expect(screen.getByTestId("full-portfolio-app")).toBeTruthy();
    });
    expect(screen.getByTestId("feat-beyond").textContent).toBe("false");
    expect(screen.getByTestId("feat-assistant").textContent).toBe("true");
    expect(screen.getByTestId("beyond-modules").textContent).toBe("no");
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/fullPortfolioApp/);
    expect(log).not.toMatch(/arBeyond/);
    expect(log).not.toMatch(/arPreloadEager/);
  });

  it("full-no-assistant disables assistant flag", async () => {
    render(<SiteDiagRoot mode="full-no-assistant" />);
    await waitFor(() => {
      expect(screen.getByTestId("feat-assistant").textContent).toBe("false");
    });
    expect(screen.getByTestId("feat-beyond").textContent).toBe("true");
    expect(screen.getByTestId("beyond-modules").textContent).toBe("yes");
  });

  it("full-no-intro disables intro flag", async () => {
    render(<SiteDiagRoot mode="full-no-intro" />);
    await waitFor(() => {
      expect(screen.getByTestId("feat-intro").textContent).toBe("false");
    });
  });

  it("full-no-preload uses deferred beyond and skips eager preload marker", async () => {
    render(<SiteDiagRoot mode="full-no-preload" />);
    await waitFor(() => {
      expect(screen.getByTestId("feat-preload").textContent).toBe("false");
    });
    expect(screen.getByTestId("beyond-modules").textContent).toBe("yes");
    const log = getSiteDiagInitLog().join("\n");
    expect(log).toMatch(/arBeyond/);
    expect(log).not.toMatch(/arPreloadEager/);
  });

  it("full-core disables beyond, assistant, intro", async () => {
    render(<SiteDiagRoot mode="full-core" />);
    await waitFor(() => {
      expect(screen.getByTestId("full-portfolio-app")).toBeTruthy();
    });
    expect(screen.getByTestId("feat-beyond").textContent).toBe("false");
    expect(screen.getByTestId("feat-assistant").textContent).toBe("false");
    expect(screen.getByTestId("feat-intro").textContent).toBe("false");
    expect(screen.getByTestId("beyond-modules").textContent).toBe("no");
  });
});

describe("audits and import contracts", () => {
  it("lists homepage long-lived owners with cleanup notes", () => {
    const matrix = getPortfolioRuntimeOwnerMatrix();
    expect(matrix.length).toBeGreaterThan(8);
    const ticker = matrix.find((r) => r.subsystem.includes("TickerStream"));
    expect(ticker?.mountedOnHomepage).toBe("true");
  });

  it("publishes full-vs-effects delta rows", () => {
    const delta = getFullVsEffectsDeltaMatrix();
    expect(delta.some((r) => r.subsystem.includes("Beyond view host"))).toBe(
      true,
    );
    expect(delta.some((r) => r.subsystem.includes("Portfolio Assistant"))).toBe(
      true,
    );
  });

  it("keeps source import contracts for subtractive boots", () => {
    const contracts = getSourceImportContracts();
    expect(contracts.mainDoesNotStaticImportApp).toBe(true);
    expect(contracts.appHasNoStaticArGovernanceImports).toBe(true);
    expect(contracts.bootProductionImportsBeyondBundle).toBe(true);
    expect(VARIANT_IMPORT_EXPECTATIONS["full-no-beyond"].loadsBeyondBundle).toBe(
      false,
    );
  });
});
