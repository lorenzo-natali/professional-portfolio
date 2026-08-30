/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();

vi.mock("./analytics/createPortfolioAnalytics.js", () => ({
  trackPortfolioEvent: (...args) => trackMock(...args),
  installPortfolioAnalytics: vi.fn(() => ({ active: false, stop() {} })),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => {
      const safe = { ...props };
      delete safe.initial;
      delete safe.animate;
      delete safe.exit;
      delete safe.transition;
      delete safe.variants;
      delete safe.custom;
      return <div {...safe}>{children}</div>;
    },
  },
}));

vi.mock("../components/CodeiakMascotVideo", () => ({
  default: () => <div data-testid="mascot" />,
}));

import ProjectDeck from "./ProjectDeck.jsx";
import { projects } from "./portfolioData.js";

describe("Phase C project_view deck instrumentation", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not emit project_view on mount", () => {
    render(<ProjectDeck />);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("emits source:deck on Next / Previous with stable project_id", () => {
    render(<ProjectDeck />);
    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenLastCalledWith("project_view", {
      project_id: projects[1].id,
      source: "deck",
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous project" }));
    expect(trackMock).toHaveBeenLastCalledWith("project_view", {
      project_id: projects[0].id,
      source: "deck",
    });
  });

  it("emits project_repository_click with canonical project_id, not outbound_click", () => {
    render(<ProjectDeck />);
    trackMock.mockClear();
    const repo = screen.getByRole("link", { name: /View repository/i });
    expect(repo).toHaveAttribute("href", projects[0].link);
    expect(repo).toHaveAttribute("target", "_blank");
    fireEvent.click(repo);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("project_repository_click", {
      project_id: "project-ai-audit-workflow",
    });
    expect(trackMock.mock.calls.some(([name]) => name === "outbound_click")).toBe(
      false
    );
  });

  it("emits CodeIAK repository click with project-codeiak", () => {
    render(<ProjectDeck />);
    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    trackMock.mockClear();
    fireEvent.click(screen.getByRole("link", { name: /View repository/i }));
    expect(trackMock).toHaveBeenCalledWith("project_repository_click", {
      project_id: "project-codeiak",
    });
  });

  it("project_view does not emit project_repository_click", () => {
    render(<ProjectDeck />);
    trackMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expect(
      trackMock.mock.calls.every(([name]) => name !== "project_repository_click")
    ).toBe(true);
  });

  it("assistant activation emits no source:deck (assistant site owns the event)", () => {
    render(<ProjectDeck />);
    trackMock.mockClear();
    act(() => {
      window.dispatchEvent(
        new CustomEvent("assistant:activate-project", {
          detail: projects[1].id,
        })
      );
    });
    expect(trackMock).not.toHaveBeenCalled();
    expect(document.querySelector(`[data-role-lens-id="${projects[1].id}"]`)).toBeTruthy();
  });
});
