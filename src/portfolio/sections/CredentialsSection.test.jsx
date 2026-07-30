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
});
