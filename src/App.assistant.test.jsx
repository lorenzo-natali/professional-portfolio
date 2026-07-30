import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App.jsx";
import {
  assistantCategories,
  assistantPrompts,
  signalMap,
} from "./portfolio/portfolioData.js";

function HeroHarness({ sidebarSlot }) {
  return <section id="hero">{sidebarSlot}</section>;
}

function renderAssistant() {
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
}

function expectGuidedAnswer(prompt) {
  const heading = screen.getByRole("heading", { name: prompt.question });
  const answer = heading.parentElement?.querySelector(".max-w-3xl");
  expect(answer?.textContent).toBe(prompt.answer);
}

describe("Portfolio Assistant guided modal", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens and closes with the approved guided-flow hierarchy", async () => {
    renderAssistant();

    fireEvent.click(screen.getByRole("button", { name: "Open Assistant" }));

    expect(
      screen.getByText(
        "Explore my experience through curated questions and guided answers."
      )
    ).toBeTruthy();
    expect(screen.getByText("Explore by topic")).toBeTruthy();
    expect(screen.getByText("Suggested questions")).toBeTruthy();
    expect(screen.getByText("Guided answer")).toBeTruthy();
    expect(screen.getByText("Continue exploring")).toBeTruthy();

    const initialPrompt = assistantPrompts[0];
    expectGuidedAnswer(initialPrompt);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    });
  });

  it("keeps topic, question, answer, and related-link behaviour intact", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: "Open Assistant" }));

    const category = assistantCategories[1];
    const categoryPrompts = assistantPrompts.filter((prompt) =>
      prompt.categories.includes(category)
    );
    expect(categoryPrompts.length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: category }));
    await waitFor(() => expectGuidedAnswer(categoryPrompts[0]));

    const nextPrompt = categoryPrompts[1];
    fireEvent.click(
      screen.getByRole("button", { name: nextPrompt.question })
    );
    await waitFor(() => expectGuidedAnswer(nextPrompt));

    const relatedSignal = nextPrompt.signalIds
      .map((id) => ({ id, ...signalMap[id] }))
      .find((signal) => signal.target && signal.target.type !== "project");
    expect(relatedSignal).toBeTruthy();

    const target = document.createElement("div");
    if (relatedSignal.target.type === "section") {
      target.id = relatedSignal.target.id;
    } else {
      target.dataset.roleLensId = relatedSignal.target.id;
    }
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    fireEvent.click(
      screen.getByRole("link", { name: relatedSignal.label })
    );
    await waitFor(() => {
      expect(target.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });
    expect(warn).not.toHaveBeenCalled();

    target.remove();
  });
});
