import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import EducationSection from "./EducationSection.jsx";
import { education } from "../portfolioData.js";

function card(container, id) {
  return container.querySelector(`[data-role-lens-id="${id}"]`);
}

function expectHighlighted(el) {
  expect(el.className).toMatch(/role-lens-highlight-cyan/);
  expect(el.className).not.toMatch(/\bopacity-55\b/);
}

function expectDimmed(el) {
  expect(el.className).toMatch(/\bopacity-55\b/);
  expect(el.className).not.toMatch(/role-lens-highlight/);
}

function expectNeutral(el) {
  expect(el.className).not.toMatch(/role-lens-highlight/);
  expect(el.className).not.toMatch(/\bopacity-55\b/);
}

describe("EducationSection Role Lens relevance", () => {
  afterEach(cleanup);

  it("keeps all education cards neutral under Overview", () => {
    const { container } = render(<EducationSection selectedLens="Overview" />);
    for (const item of education) {
      expectNeutral(card(container, item.id));
    }
  });

  it("highlights ALTIS/EY Master's for IT Audit", () => {
    const { container } = render(<EducationSection selectedLens="IT Audit" />);
    expectHighlighted(card(container, "education-altis-ey"));
    expectDimmed(card(container, "education-banking-sciences"));
    expectDimmed(card(container, "education-international-cooperation"));
    expectDimmed(card(container, "education-languages"));
  });

  it("highlights ALTIS/EY Master's and Banking Sciences for Banking Risk", () => {
    const { container } = render(<EducationSection selectedLens="Banking Risk" />);
    expectHighlighted(card(container, "education-altis-ey"));
    expectHighlighted(card(container, "education-banking-sciences"));
    expectDimmed(card(container, "education-international-cooperation"));
    expectDimmed(card(container, "education-languages"));
  });

  it("does not map ALTIS/EY Master's to Technology Risk, InfoSec, or AI Governance", () => {
    for (const lens of [
      "Technology Risk",
      "Information Security Governance",
      "AI Governance",
    ]) {
      const { container, unmount } = render(<EducationSection selectedLens={lens} />);
      expectDimmed(card(container, "education-altis-ey"));
      expectDimmed(card(container, "education-banking-sciences"));
      unmount();
    }
  });

  it("restores neutral education cards when the lens is cleared", () => {
    const { container, rerender } = render(
      <EducationSection selectedLens="Banking Risk" />
    );
    expectHighlighted(card(container, "education-altis-ey"));

    rerender(<EducationSection selectedLens="Overview" />);
    for (const item of education) {
      expectNeutral(card(container, item.id));
    }
  });

  it("uses the credentials Role Lens glow-rail pattern without w-max or card-width changes", async () => {
    const { container } = render(<EducationSection selectedLens="IT Audit" />);
    const rail = container.querySelector(".education-rail");
    expect(rail).toHaveClass("role-lens-highlight-rail");
    expect(rail).toHaveClass("overflow-x-auto");
    expect(rail.className).toMatch(/-mx-5/);
    expect(rail.className).toMatch(/sm:-mx-8/);
    expect(rail.className).toMatch(/lg:-mx-10/);

    const track = rail?.firstElementChild;
    expect(track).toBeTruthy();
    expect(track.className).toMatch(/\bflex\b/);
    expect(track.className).toMatch(/snap-x/);
    expect(track.className).not.toMatch(/\bw-max\b/);

    const cards = [...container.querySelectorAll("[data-role-lens-id^=\"education-\"]")];
    expect(cards.length).toBe(education.length);
    for (const el of cards) {
      expect(el.className).toMatch(/w-\[78%\]/);
      expect(el.className).toMatch(/sm:w-\[20rem\]/);
    }

    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const css = readFileSync(resolve("src/index.css"), "utf8");
    expect(css).toMatch(
      /\.role-lens-highlight-rail\s*\{[^}]*padding-inline:\s*1\.25rem/s
    );
    expect(css).toMatch(
      /\.role-lens-highlight-rail\s*\{[^}]*scroll-padding-inline:\s*1\.25rem/s
    );
  });
});
