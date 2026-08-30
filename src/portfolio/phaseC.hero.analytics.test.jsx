/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();

vi.mock("./analytics/createPortfolioAnalytics.js", () => ({
  trackPortfolioEvent: (...args) => trackMock(...args),
}));

vi.mock("framer-motion", () => ({
  motion: {
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("../TickerStream.jsx", () => ({
  default: () => null,
}));

import HeroSection from "./sections/HeroSection.jsx";

describe("Phase C outbound_click Hero instrumentation", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("emits linkedin / github targets without changing navigation attributes", () => {
    render(<HeroSection />);
    const linkedin = screen.getByRole("link", { name: /Connect on LinkedIn/i });
    const github = screen.getByRole("link", { name: /GitHub Profile/i });

    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/natalilorenzo/");
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("href", "https://github.com/lorenzo-natali");

    fireEvent.click(linkedin);
    expect(trackMock).toHaveBeenCalledWith("outbound_click", {
      target: "linkedin",
    });

    fireEvent.click(github);
    expect(trackMock).toHaveBeenCalledWith("outbound_click", {
      target: "github",
    });
  });
});
