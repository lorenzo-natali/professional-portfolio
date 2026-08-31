import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import CredentialsSection from "./CredentialsSection.jsx";
import { additionalTraining } from "../portfolioData.js";

function trainingCard(container, id) {
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

function expectNeutralOverview(el) {
  expect(el.className).not.toMatch(/role-lens-highlight/);
  expect(el.className).not.toMatch(/\bopacity-55\b/);
}

describe("CredentialsSection additional training Role Lens (per-item)", () => {
  afterEach(cleanup);

  it("keeps training cards neutral in Overview", () => {
    const { container } = render(<CredentialsSection selectedLens="Overview" />);
    const subsection = container.querySelector("[data-additional-training-subsection]");
    expect(subsection).not.toHaveClass("opacity-55");

    for (const item of additionalTraining.items) {
      expectNeutralOverview(trainingCard(container, item.id));
    }
  });

  it("highlights Digital Banking / eIDAS / AI Act for AI Governance, Technology Risk, and Banking Risk", () => {
    for (const lens of ["AI Governance", "Technology Risk", "Banking Risk"]) {
      const { container, unmount } = render(<CredentialsSection selectedLens={lens} />);
      expectHighlighted(
        trainingCard(container, "additional-training-digital-banking-eidas-ai-act")
      );
      unmount();
    }
  });

  it("does not map Digital Banking / eIDAS training to Information Security Governance", () => {
    const { container } = render(
      <CredentialsSection selectedLens="Information Security Governance" />
    );
    expectDimmed(
      trainingCard(container, "additional-training-digital-banking-eidas-ai-act")
    );
  });

  it("highlights GDPR / Banking / AI Governance training for InfoSec, AI Governance, and Banking Risk", () => {
    for (const lens of [
      "Information Security Governance",
      "AI Governance",
      "Banking Risk",
    ]) {
      const { container, unmount } = render(<CredentialsSection selectedLens={lens} />);
      expectHighlighted(trainingCard(container, "additional-training-gdpr-banking"));
      unmount();
    }
  });

  it("keeps Chinese Language and Healthcare / BLS unmapped (dimmed under active lenses)", () => {
    const { container } = render(<CredentialsSection selectedLens="AI Governance" />);
    expectDimmed(trainingCard(container, "additional-training-chinese-language"));
    expectDimmed(trainingCard(container, "additional-training-healthcare-transport"));
  });

  it("restores neutral training cards when the lens is cleared", () => {
    const { container, rerender } = render(
      <CredentialsSection selectedLens="Banking Risk" />
    );
    expectHighlighted(
      trainingCard(container, "additional-training-digital-banking-eidas-ai-act")
    );

    rerender(<CredentialsSection selectedLens="Overview" />);
    for (const item of additionalTraining.items) {
      expectNeutralOverview(trainingCard(container, item.id));
    }
  });

  it("keeps attestation links usable while unmapped cards are dimmed", () => {
    const { container } = render(
      <CredentialsSection selectedLens="IT Audit" />
    );
    const subsection = container.querySelector("[data-additional-training-subsection]");
    const links = within(subsection).getAllByRole("link", {
      name: "View attestation",
    });
    const expectedUrls = additionalTraining.items
      .map((item) => item.attestation?.url)
      .filter(Boolean);

    expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedUrls);
    expect(subsection).not.toHaveAttribute("aria-hidden");
    expect(subsection).not.toHaveAttribute("inert");

    for (const link of links) {
      expect(link.closest('[aria-hidden="true"]')).toBeNull();
      expect(link.closest("[inert]")).toBeNull();
      expect(link.closest(".pointer-events-none")).toBeNull();
    }

    links[0].focus();
    expect(links[0]).toHaveFocus();
    expect(screen.getByText(additionalTraining.label)).toBeTruthy();
  });

  it("keeps Role Lens glow room on the credentials rail without w-max width bomb", async () => {
    const { container } = render(<CredentialsSection selectedLens="IT Audit" />);
    const rail = container.querySelector(".credentials-rail");
    expect(rail).toHaveClass("role-lens-highlight-rail");
    expect(rail).toHaveClass("overflow-x-auto");

    const track = rail?.firstElementChild;
    expect(track.className).not.toMatch(/\bw-max\b/);

    const cisa = container.querySelector('[data-role-lens-id="credential-cisa"]');
    expect(cisa.className).toMatch(/role-lens-highlight-cyan/);
  });

  it("gives the attestation rail the same Role Lens glow room without w-max or % width cards", () => {
    const { container } = render(<CredentialsSection selectedLens="Banking Risk" />);
    const rail = container.querySelector(".attestation-rail");
    expect(rail).toHaveClass("role-lens-highlight-rail");
    expect(rail).toHaveClass("overflow-x-auto");
    expect(rail.className).toMatch(/-mx-5/);
    expect(rail.className).toMatch(/sm:-mx-8/);
    expect(rail.className).toMatch(/lg:-mx-10/);

    const track = rail?.firstElementChild;
    expect(track).toBeTruthy();
    expect(track.className).toMatch(/\bflex\b/);
    expect(track.className).not.toMatch(/\bw-max\b/);

    const first = container.querySelector(
      '[data-role-lens-id="additional-training-digital-banking-eidas-ai-act"]'
    );
    expect(first.className).toMatch(/role-lens-highlight-cyan/);
    expect(first.className).toMatch(/min-w-\[20rem\]/);
    expect(first.className).not.toMatch(/w-\[78%\]/);
  });
});
