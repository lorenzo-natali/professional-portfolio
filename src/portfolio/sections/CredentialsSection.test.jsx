import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import CredentialsSection from "./CredentialsSection.jsx";
import { additionalTraining, lensRelevance } from "../portfolioData.js";
import { lensOptions } from "../portfolioLens.js";

function getAdditionalTrainingSubsection(container) {
  return container.querySelector("[data-additional-training-subsection]");
}

describe("CredentialsSection additional training Role Lens state", () => {
  afterEach(cleanup);

  it("keeps the subsection at normal brightness in Overview", () => {
    const { container } = render(
      <CredentialsSection selectedLens="Overview" />
    );

    expect(getAdditionalTrainingSubsection(container)).not.toHaveClass(
      "opacity-55"
    );
  });

  it.each(lensOptions.map((lens) => lens.name))(
    "dims the entire subsection for the %s lens",
    (selectedLens) => {
      const { container } = render(
        <CredentialsSection selectedLens={selectedLens} />
      );

      expect(getAdditionalTrainingSubsection(container)).toHaveClass(
        "opacity-55"
      );
    }
  );

  it("restores normal brightness when the active lens is cleared", () => {
    const { container, rerender } = render(
      <CredentialsSection selectedLens="IT Audit" />
    );
    const subsection = getAdditionalTrainingSubsection(container);
    expect(subsection).toHaveClass("opacity-55");

    rerender(<CredentialsSection selectedLens="Overview" />);
    expect(subsection).not.toHaveClass("opacity-55");
  });

  it("keeps every unmapped training card inside the dimmed wrapper", () => {
    const { container } = render(
      <CredentialsSection selectedLens="AI Governance" />
    );
    const subsection = getAdditionalTrainingSubsection(container);
    const trainingCards = additionalTraining.items.map((item) =>
      container.querySelector(`[data-role-lens-id="${item.id}"]`)
    );

    expect(subsection).toHaveClass("opacity-55");
    expect(trainingCards).toHaveLength(additionalTraining.items.length);
    for (const card of trainingCards) {
      expect(card).toBeTruthy();
      expect(subsection.contains(card)).toBe(true);
    }

    const mappedValues = Object.values(lensRelevance).flatMap((groups) =>
      Object.values(groups).flat()
    );
    for (const item of additionalTraining.items) {
      expect(mappedValues).not.toContain(item.id);
    }
  });

  it("keeps attestation links usable while the subsection is dimmed", () => {
    const { container } = render(
      <CredentialsSection selectedLens="Technology Risk" />
    );
    const subsection = getAdditionalTrainingSubsection(container);
    const links = within(subsection).getAllByRole("link", {
      name: "View attestation",
    });
    const expectedUrls = additionalTraining.items
      .map((item) => item.attestation?.url)
      .filter(Boolean);

    expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedUrls);
    expect(subsection).not.toHaveAttribute("aria-hidden");
    expect(subsection).not.toHaveAttribute("inert");
    expect(subsection).not.toHaveClass("pointer-events-none");

    for (const link of links) {
      expect(link).not.toHaveAttribute("disabled");
      expect(link.closest('[aria-hidden="true"]')).toBeNull();
      expect(link.closest("[inert]")).toBeNull();
      expect(link.closest(".pointer-events-none")).toBeNull();
    }

    links[0].focus();
    expect(links[0]).toHaveFocus();
    expect(screen.getByText(additionalTraining.label)).toBeTruthy();
  });

  it("keeps Role Lens glow room without shifting cards off the content column", async () => {
    const { container } = render(<CredentialsSection selectedLens="IT Audit" />);
    const rail = container.querySelector(".credentials-rail");

    expect(rail).toBeTruthy();
    expect(rail).toHaveClass("overflow-x-auto");
    expect(rail).toHaveClass("role-lens-highlight-rail");
    // Bleed matches Section padding so cards align with attestation / titles.
    expect(rail.className).toMatch(/-mx-5/);
    expect(rail.className).toMatch(/sm:-mx-8/);
    expect(rail.className).toMatch(/lg:-mx-10/);

    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const css = readFileSync(resolve("src/index.css"), "utf8");
    expect(css).toMatch(
      /\.role-lens-highlight-rail\s*\{[^}]*padding-inline:\s*1\.25rem/s
    );
    expect(css).toMatch(
      /\.role-lens-highlight-rail\s*\{[^}]*scroll-padding-inline:\s*1\.25rem/s
    );

    const cisa = container.querySelector('[data-role-lens-id="credential-cisa"]');
    const attestation = container.querySelector(".attestation-rail");
    expect(cisa).toBeTruthy();
    expect(cisa.className).toMatch(/role-lens-highlight-cyan/);
    expect(rail.contains(cisa)).toBe(true);
    expect(attestation).toBeTruthy();
  });

  it("does not put percentage-width cards inside a w-max track (mobile width bomb)", () => {
    const { container } = render(<CredentialsSection />);
    const rail = container.querySelector(".credentials-rail");
    const track = rail?.firstElementChild;
    const cards = [...container.querySelectorAll("[data-role-lens-id^=\"credential-\"]")];

    expect(track).toBeTruthy();
    // Inner track may be flex+snap, but must not be w-max while cards use w-[78%].
    expect(track.className).not.toMatch(/\bw-max\b/);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.className).toMatch(/w-\[78%\]/);
      expect(card.className).toMatch(/sm:w-\[20rem\]/);
    }
  });
});
