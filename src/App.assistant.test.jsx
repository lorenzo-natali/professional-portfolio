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
  return render(
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
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    vi.restoreAllMocks();
  });

  it("progressively reveals topics, questions, and the selected answer", async () => {
    renderAssistant();

    const openButton = screen.getByRole("button", { name: "Open Assistant" });
    fireEvent.click(openButton);

    expect(
      screen.getByText(
        "Explore my experience through curated questions and guided answers."
      )
    ).toBeTruthy();
    expect(screen.getByText("Explore by topic")).toBeTruthy();
    expect(screen.queryByText("Suggested questions")).toBeNull();
    expect(screen.queryByText("Guided answer", { exact: true })).toBeNull();
    expect(screen.queryByText("Continue exploring")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    const overlay = document.querySelector('[data-assistant-overlay="document"]');
    const dialog = screen.getByRole("dialog");
    const modalContent = dialog.querySelector("[data-assistant-modal-content]");
    expect(overlay).toHaveClass("absolute");
    expect(overlay).toHaveStyle({ top: `${window.scrollY}px` });
    expect(overlay).not.toHaveClass("fixed", "overscroll-none");
    expect(dialog).not.toHaveClass("max-h-[92vh]", "overflow-hidden");
    expect(modalContent).not.toHaveClass(
      "overflow-y-auto",
      "overflow-y-scroll",
      "overscroll-contain"
    );

    const topicRail = screen.getByRole("group", { name: "Explore by topic" });
    expect(topicRail).toHaveAttribute("data-assistant-rail", "topic");
    expect(topicRail).toHaveClass("overflow-x-auto");
    for (const category of assistantCategories) {
      expect(screen.getByRole("button", { name: category })).toHaveAttribute(
        "data-assistant-card-variant",
        "topic"
      );
    }

    const firstCategory = assistantCategories[0];
    const firstCategoryPrompts = assistantPrompts.filter((prompt) =>
      prompt.categories.includes(firstCategory)
    );
    fireEvent.click(screen.getByRole("button", { name: firstCategory }));

    expect(
      screen.getByRole("button", { name: firstCategory })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: firstCategory })).toHaveClass(
      "border-violet-300/50",
      "bg-violet-400/10"
    );
    expect(screen.getByText("Suggested questions")).toBeTruthy();
    const questionRail = screen.getByRole("group", {
      name: "Suggested questions",
    });
    expect(questionRail).toHaveAttribute("data-assistant-rail", "question");
    expect(questionRail).toHaveClass("overflow-x-auto");
    expect(screen.queryByText("Continue exploring")).toBeNull();
    for (const prompt of firstCategoryPrompts) {
      expect(
        screen.getByRole("button", { name: prompt.question })
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", { name: prompt.question })
      ).toHaveAttribute("data-assistant-card-variant", "question");
    }

    const firstPrompt = firstCategoryPrompts[0];
    fireEvent.click(
      screen.getByRole("button", { name: firstPrompt.question })
    );
    await waitFor(() => expectGuidedAnswer(firstPrompt));
    expect(
      screen.getByRole("button", { name: firstPrompt.question })
    ).toHaveClass("border-cyan-300/50", "bg-cyan-400/10");
    expect(screen.getByText("Continue exploring")).toBeTruthy();
    expect(screen.queryByText("Guided answer", { exact: true })).toBeNull();

    const nextPrompt = firstCategoryPrompts[1];
    fireEvent.click(
      screen.getByRole("button", { name: nextPrompt.question })
    );
    await waitFor(() => expectGuidedAnswer(nextPrompt));
    expect(
      screen.getByRole("button", { name: firstCategory })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: nextPrompt.question })
    ).toHaveAttribute("aria-pressed", "true");

    const secondCategory = assistantCategories[1];
    const secondCategoryPrompts = assistantPrompts.filter((prompt) =>
      prompt.categories.includes(secondCategory)
    );
    fireEvent.click(screen.getByRole("button", { name: secondCategory }));

    expect(screen.queryByRole("heading", { name: nextPrompt.question })).toBeNull();
    expect(screen.queryByText("Continue exploring")).toBeNull();
    expect(
      screen.queryByRole("button", { name: firstPrompt.question })
    ).toBeNull();
    for (const prompt of secondCategoryPrompts) {
      expect(
        screen.getByRole("button", { name: prompt.question })
      ).toHaveAttribute("aria-pressed", "false");
    }

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    });
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(openButton).toHaveFocus();

    fireEvent.click(openButton);
    expect(screen.getByText("Explore by topic")).toBeTruthy();
    expect(screen.queryByText("Suggested questions")).toBeNull();
    expect(screen.queryByText("Continue exploring")).toBeNull();
  });

  it("closes through a related link and restores document scrolling", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: "Open Assistant" }));

    const category = assistantCategories[1];
    const categoryPrompts = assistantPrompts.filter((prompt) =>
      prompt.categories.includes(category)
    );
    expect(categoryPrompts.length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: category }));
    fireEvent.click(
      screen.getByRole("button", { name: categoryPrompts[1].question })
    );
    await waitFor(() => expectGuidedAnswer(categoryPrompts[1]));

    const relatedSignal = categoryPrompts[1].signalIds
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
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");

    target.remove();
  });

  it("leaves document scrolling styles untouched while open and on unmount", () => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "scroll";
    document.body.style.paddingRight = "7px";

    const { unmount } = renderAssistant();
    fireEvent.click(screen.getByRole("button", { name: "Open Assistant" }));

    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("7px");

    unmount();

    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("7px");
  });
});
