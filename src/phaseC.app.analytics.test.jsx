/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();

vi.mock("./portfolio/analytics/createPortfolioAnalytics.js", () => ({
  trackPortfolioEvent: (...args) => trackMock(...args),
  installPortfolioAnalytics: vi.fn(() => ({ active: false, stop() {} })),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  },
}));

import App from "./App.jsx";

function HeroHarness({ sidebarSlot }) {
  return <section id="hero">{sidebarSlot}</section>;
}

function ExperienceProbe({
  toggleExperienceDetails,
  expandedExperiences,
}) {
  const id = "experience-boc";
  const open = Boolean(expandedExperiences?.[id]);
  return (
    <section id="experience">
      <button type="button" onClick={() => toggleExperienceDetails(id)}>
        {open ? "Show less" : "View details"}
      </button>
    </section>
  );
}

describe("Phase C App interaction instrumentation", () => {
  beforeEach(() => {
    trackMock.mockClear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    vi.restoreAllMocks();
  });

  it("experience expand emits experience_open; collapse does not", () => {
    render(
      <App
        features={{
          assistant: false,
          beyond: false,
          intro: false,
          preload: false,
        }}
        eagerSectionModules={{
          hero: HeroHarness,
          experience: ExperienceProbe,
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(trackMock).toHaveBeenCalledWith("experience_open", {
      experience_id: "experience-boc",
    });

    trackMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(trackMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(trackMock).toHaveBeenCalledWith("experience_open", {
      experience_id: "experience-boc",
    });
  });

  it("assistant open emits a privacy-safe event", () => {
    render(
      <App
        features={{
          assistant: true,
          beyond: false,
          intro: false,
          preload: false,
        }}
        eagerSectionModules={{ hero: HeroHarness }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(trackMock).toHaveBeenCalledWith("assistant_open");
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    const payload = JSON.stringify(trackMock.mock.calls);
    expect(payload).not.toMatch(/What kind of roles/);
  });

  it("Beyond CV card emits source:card", () => {
    function BeyondCard({ onLaunch }) {
      return (
        <button type="button" onClick={onLaunch}>
          Beyond CV
        </button>
      );
    }

    render(
      <App
        features={{
          assistant: false,
          beyond: true,
          intro: false,
          preload: false,
        }}
        beyondModules={{
          ARGovernanceCard: BeyondCard,
          shouldLaunchBeyondCvFromLocation: () => false,
        }}
        eagerSectionModules={{ hero: HeroHarness }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Beyond CV" }));
    expect(trackMock).toHaveBeenCalledWith("beyond_cv_open", {
      source: "card",
    });
  });

  it("Beyond CV deeplink emits source:deeplink once", () => {
    render(
      <App
        features={{
          assistant: false,
          beyond: true,
          intro: false,
          preload: false,
        }}
        beyondModules={{
          ARGovernanceCard: () => null,
          ARGovernanceView: () => null,
          shouldLaunchBeyondCvFromLocation: () => true,
        }}
        eagerSectionModules={{ hero: HeroHarness }}
      />
    );

    const deeplinkCalls = trackMock.mock.calls.filter(
      ([name, props]) =>
        name === "beyond_cv_open" && props?.source === "deeplink"
    );
    expect(deeplinkCalls).toHaveLength(1);
  });
});
