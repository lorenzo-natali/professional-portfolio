import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App.jsx";
import {
  ASSISTANT_ABOUT_PARAGRAPHS,
  ASSISTANT_ABOUT_TEXT,
  ASSISTANT_WELCOME_MESSAGE,
} from "./portfolio/assistantChatModel.js";
import { ASSISTANT_PREVIEW_QUESTIONS } from "./portfolio/useAssistantPreviewRotation.js";

function HeroHarness({ sidebarSlot }) {
  return <section id="hero">{sidebarSlot}</section>;
}

function renderAssistant({ strict = false } = {}) {
  const app = (
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
  return render(strict ? <StrictMode>{app}</StrictMode> : app);
}

function openChat() {
  fireEvent.click(screen.getByRole("button", { name: /Chat/ }));
}

describe("Portfolio Assistant guided modal", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    vi.restoreAllMocks();
  });

  it("presents the preview card as a chat entry without claiming the assistant is online", () => {
    renderAssistant();

    expect(screen.getByRole("img", { name: "Lorenzo Natali" })).toBeTruthy();
    const description = screen.getByText(
      "Ask about my professional background, expertise, and projects."
    );
    expect(description).toHaveClass("w-full", "text-center", "sm:max-w-[30ch]", "sm:mx-auto");
    expect(description.closest("aside")).toHaveClass("assistant-theme", "assistant-surface");
    expect(description.parentElement?.firstElementChild).toHaveClass("max-sm:justify-center");
    expect(screen.queryByText("Suggested question")).toBeNull();
    expect(screen.queryByRole("button", { name: /Use example question/ })).toBeNull();
    expect(document.querySelector("[data-assistant-preview-root]")).toHaveClass("hidden", "lg:block");
    expect(document.querySelector("[data-assistant-preview-question='true']")).toHaveTextContent(
      ASSISTANT_PREVIEW_QUESTIONS[0],
    );
    expect(screen.queryByText("Status unknown")).toBeNull();
    expect(screen.queryByText("Available")).toBeNull();
    expect(screen.queryByText("Unavailable")).toBeNull();

    const dot = screen.getByRole("img", { name: "AI Assistant status unknown" });
    const title = dot.closest("p");
    expect(title).toHaveClass(
      "text-base",
      "font-semibold",
      "leading-tight",
      "tracking-tight",
      "assistant-text",
      "sm:text-sm"
    );
    expect(title?.textContent?.replace(/\s+/g, " ").trim().startsWith("AI Portfolio Assistant")).toBe(true);
    expect(title.parentElement?.querySelector("svg")).toBeNull();

    expect(dot.closest("p")).toBe(title);
    expect(dot.parentElement).toHaveClass("whitespace-nowrap");
    expect(dot.parentElement?.textContent?.startsWith("Assistant")).toBe(true);
    expect(dot).toHaveAttribute("data-assistant-availability", "unknown");
    expect(dot).toHaveClass("ml-2", "bg-slate-500", "inline-block");
    expect(dot.tagName).not.toBe("BUTTON");

    const chatButton = screen.getByRole("button", { name: /Chat/ });
    expect(chatButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(chatButton.textContent?.replace(/\s+/g, " ").trim()).toBe("ChatAsk the Assistant");
    expect(chatButton.querySelector("span.lg\\:hidden")?.textContent).toBe("Chat");
    expect(chatButton.querySelector("span.hidden")?.textContent).toBe("Ask the Assistant");
    expect(document.querySelector("[data-assistant-availability]")).toHaveAttribute(
      "data-assistant-availability",
      "unknown"
    );
  });

  it("opens the chat, keeps focus inside the dialog, and restores scrolling on close", async () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(480);
    renderAssistant();

    const openButton = screen.getByRole("button", { name: /Chat/ });
    fireEvent.click(openButton);

    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveClass("sr-only");
    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveTextContent(ASSISTANT_ABOUT_TEXT);
    expect(document.querySelector("[data-assistant-header]")?.textContent).not.toMatch(/Powered by OpenAI/);
    expect(screen.queryByRole("heading", { name: "What would you like to know about Lorenzo?" })).toBeNull();
    expect(screen.queryByRole("button", { name: "What is Lorenzo's professional background?" })).toBeNull();
    expect(document.querySelector("[data-assistant-transcript] [role='log']")?.textContent?.trim()).toBe("");
    expect(screen.getByText(ASSISTANT_WELCOME_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveAttribute(
      "placeholder",
      "Ask me something..."
    );
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveClass("text-[16px]", "sm:text-sm");
    expect(screen.queryByText("Explore by topic")).toBeNull();
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-480px");
    expect(document.body.style.width).toBe("100%");
    expect(document.documentElement.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    const overlay = document.querySelector('[data-assistant-overlay="scroll"]');
    const dialog = screen.getByRole("dialog");
    const modalContent = dialog.querySelector("[data-assistant-modal-content]");
    const transcript = dialog.querySelector("[data-assistant-transcript]");
    expect(overlay).toHaveClass("fixed", "inset-0", "overflow-hidden");
    expect(overlay).not.toHaveClass("absolute", "overflow-y-auto");
    expect(dialog).toHaveClass("assistant-theme", "assistant-surface", "overflow-hidden", "rounded-2xl", "min-h-0", "sm:max-h-[80vh]", "sm:h-[78vh]");
    expect(dialog).not.toHaveClass("rounded-none", "h-[100dvh]");
    expect(dialog.parentElement).toHaveClass("flex", "h-dvh", "min-h-0", "sm:h-[100dvh]");
    expect(modalContent).not.toHaveClass("overflow-y-auto", "overflow-y-scroll");
    expect(transcript).toHaveClass("overflow-y-auto", "overscroll-y-contain");
    expect(dialog.querySelector("[data-assistant-curated]")).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    });
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.width).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 480);
    expect(openButton).toHaveFocus();

    fireEvent.click(openButton);
    expect(document.querySelector("[data-assistant-transcript] [role='log']")?.textContent?.trim()).toBe("");
    expect(screen.getByText(ASSISTANT_WELCOME_MESSAGE)).toBeTruthy();
    expect(screen.queryByText("Explore by topic")).toBeNull();
    expect(screen.queryByText("Suggested questions")).toBeNull();
    expect(screen.queryByText("Continue exploring")).toBeNull();
  });

  it("freezes the body and restores its styles and scroll position on unmount", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(240);
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "scroll";
    document.body.style.paddingRight = "7px";
    document.body.style.position = "relative";
    document.body.style.top = "3px";
    document.body.style.width = "75%";

    const { unmount } = renderAssistant();
    openChat();

    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("7px");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-240px");
    expect(document.body.style.width).toBe("100%");

    unmount();

    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("7px");
    expect(document.body.style.position).toBe("relative");
    expect(document.body.style.top).toBe("3px");
    expect(document.body.style.width).toBe("75%");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it("contains focus, makes the application inert, and restores both on close", () => {
    renderAssistant();
    const applicationRoot = document.querySelector("main");
    Object.defineProperty(applicationRoot, "inert", {
      configurable: true,
      value: false,
      writable: true,
    });

    const openButton = screen.getByRole("button", { name: /Chat/ });
    fireEvent.click(openButton);

    expect(applicationRoot.inert).toBe(true);
    expect(applicationRoot).toHaveAttribute("inert");
    const closeButton = screen.getByRole("button", { name: "Close" });
    const aboutButton = screen.getByRole("button", { name: "About this assistant" });
    const textarea = screen.getByRole("textbox", { name: "Your question" });

    textarea.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(aboutButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(textarea).toHaveFocus();

    fireEvent.click(closeButton);
    expect(applicationRoot.inert).toBe(false);
    expect(applicationRoot).not.toHaveAttribute("inert");
    expect(openButton).toHaveFocus();
  });

  it("uses aria-hidden as the inert fallback and cleans it up on Escape", async () => {
    renderAssistant();
    const applicationRoot = document.querySelector("main");
    expect("inert" in applicationRoot).toBe(false);

    const openButton = screen.getByRole("button", { name: /Chat/ });
    fireEvent.click(openButton);
    expect(applicationRoot).toHaveAttribute("inert");
    expect(applicationRoot).toHaveAttribute("aria-hidden", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(applicationRoot).not.toHaveAttribute("inert");
    expect(applicationRoot).not.toHaveAttribute("aria-hidden");
    expect(openButton).toHaveFocus();
  });

  it("limits the question to 500 characters and ignores empty sends", () => {
    renderAssistant();
    openChat();
    const textarea = screen.getByRole("textbox", { name: "Your question" });
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    expect(document.getElementById("assistant-question-count")).toHaveClass("sr-only");

    fireEvent.change(textarea, { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();

    fireEvent.change(textarea, { target: { value: "a".repeat(399) } });
    expect(document.getElementById("assistant-question-count")).toHaveClass("sr-only");
    fireEvent.change(textarea, { target: { value: "a".repeat(640) } });
    expect(textarea).toHaveValue("a".repeat(500));
    expect(document.getElementById("assistant-question-count")).toHaveTextContent("500/500");
    expect(document.getElementById("assistant-question-count")).not.toHaveClass("sr-only");
    expect(send).toBeEnabled();
  });

  it("sends on Enter, keeps Shift+Enter in the draft, and resets the transcript", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAssistant();
    openChat();
    const textarea = screen.getByRole("textbox", { name: "Your question" });

    fireEvent.change(textarea, { target: { value: "First line" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(textarea).toHaveValue("First line");
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();

    fireEvent.change(textarea, { target: { value: "What is Lorenzo's background?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(screen.getByText("What is Lorenzo's background?")).toBeTruthy();
    expect(screen.getAllByText(ASSISTANT_WELCOME_MESSAGE)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Current Role" })).toBeNull();
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByText(/not used as context/)).toBeNull();
    expect(screen.queryByRole("button", { name: "New conversation" })).toBeNull();
    expect(screen.queryByText(/Development preview/)).toBeNull();
    expect(screen.queryByText(/Development-only sample answer/)).toBeNull();
    expect(textarea).toHaveValue("");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("portfolio-assistant-conversation-v1") ?? "").not.toContain(ASSISTANT_WELCOME_MESSAGE);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(screen.getByText("What is Lorenzo's background?")).toBeTruthy();
    expect(screen.getAllByText(ASSISTANT_WELCOME_MESSAGE)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Current Role" })).toBeNull();
    expect(screen.queryByText(/Preparing a response/)).toBeNull();
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });

  it("explains the assistant without a model name and keeps the chat available when AI is unavailable", () => {
    renderAssistant();
    openChat();
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveTextContent(ASSISTANT_ABOUT_TEXT);
    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveClass("sr-only");
    expect(document.querySelector("[data-assistant-disclaimer]")).toBeNull();
    expect(document.getElementById("assistant-how-it-works")).toBeNull();
    expect(ASSISTANT_ABOUT_PARAGRAPHS.join(" ")).toBe(ASSISTANT_ABOUT_TEXT);
    fireEvent.click(screen.getByRole("button", { name: "About this assistant" }));
    const about = document.querySelector("[data-assistant-disclaimer]");
    const aboutDialog = about.querySelector("[role='dialog']");
    expect(aboutDialog).toHaveAccessibleName("About this assistant");
    expect(about.querySelector("#assistant-disclaimer-title")).toHaveTextContent("About this assistant");
    expect(about.querySelector("#assistant-disclaimer-title")).not.toHaveClass("sr-only");
    const paragraphs = [...about.querySelectorAll("h2 ~ div p, .space-y-3 p")];
    expect(paragraphs.map((node) => node.textContent)).toEqual(ASSISTANT_ABOUT_PARAGRAPHS);
    for (const paragraph of ASSISTANT_ABOUT_PARAGRAPHS) {
      expect(about.textContent.split(paragraph).length - 1).toBe(1);
    }
    expect(about.textContent).not.toContain("AI Assistant status unknown");
    expect(about.querySelector("[class*='pr-16']")).toBeNull();
    const aboutClose = about.querySelector("button");
    expect(aboutClose).toHaveAccessibleName("Close");
    expect(aboutClose.className).toContain("h-11");
    expect(aboutClose.className).toContain("w-11");
    expect(aboutClose).toHaveFocus();
    fireEvent.click(aboutClose);
    expect(document.querySelector("[data-assistant-disclaimer]")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "About this assistant" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "About this assistant" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector("[data-assistant-disclaimer]")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "About this assistant" })).toHaveFocus();
    expect(screen.queryByText(/OpenAI AI models/)).toBeNull();
    expect(screen.queryByText(/Please refer to the portfolio sections/)).toBeNull();
    expect(screen.queryByRole("button", { name: "A quick note" })).toBeNull();
    expect(screen.getByRole("dialog").querySelector("[data-assistant-availability]")).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).not.toMatch(/gpt-|luna/i);

    const textarea = screen.getByRole("textbox", { name: "Your question" });
    fireEvent.change(textarea, { target: { value: "A question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Your question" })).toBeTruthy();
    expect(screen.getByText("A question")).toBeTruthy();
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy();
  });

  it("omits starter boxes and keeps the welcome out of storage", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAssistant();
    openChat();
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll("[data-assistant-welcome]")).toHaveLength(1);
    expect(dialog.querySelector("[data-assistant-starters]")).toBeNull();
    const labels = [...dialog.querySelectorAll("button")].map((button) => button.textContent.trim());
    expect(labels).not.toContain("Current Role");
    expect(labels).not.toContain("DORA & IT Audit");
    expect(labels).not.toContain("AI Governance");
    expect(labels).not.toContain("Projects");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("portfolio-assistant-conversation-v1") ?? "").not.toContain(ASSISTANT_WELCOME_MESSAGE);
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
  });

  it("skips dialog entrance movement when reduced motion is requested", () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: String(query),
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
    try {
      renderAssistant();
      openChat();
      expect(screen.getByRole("dialog")).toHaveAttribute("data-assistant-motion", "reduced");
    } finally {
      window.matchMedia = original;
    }
  });

  it("keeps keyboard focus inside the chat dialog", () => {
    renderAssistant();
    openChat();
    const aboutButton = screen.getByRole("button", { name: "About this assistant" });
    const textarea = screen.getByRole("textbox", { name: "Your question" });
    textarea.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(aboutButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(textarea).toHaveFocus();
  });
});

const APPROVED_PREVIEW_QUESTIONS = [
  "How do the different parts of your profile fit together?",
  "What is your exposure to AI Governance?",
  "What is Cognitive Behavior Intelligence?",
  "How did your studies lead you into audit?",
  "What interests you beyond your professional work?",
];

describe("Portfolio Assistant desktop preview rotation", () => {
  /** @type {Array<{ cb: Function, el?: Element, disconnected: boolean }>} */
  let ioInstances = [];
  /** @type {typeof window.matchMedia | undefined} */
  let originalMatchMedia;
  /** @type {PropertyDescriptor | undefined} */
  let originalHidden;
  /** @type {PropertyDescriptor | undefined} */
  let originalVisibility;

  function installMedia({ desktop = true, reduced = false } = {}) {
    window.matchMedia = (query) => ({
      matches: String(query).includes("prefers-reduced-motion")
        ? reduced
        : String(query).includes("min-width: 1024px")
          ? desktop
          : false,
      media: String(query),
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }

  function installObserver({ visibleOnObserve = true } = {}) {
    ioInstances = [];
    class MockIO {
      constructor(cb) {
        this.cb = cb;
        this.disconnected = false;
        ioInstances.push(this);
      }
      observe(el) {
        this.el = el;
        if (!visibleOnObserve) return;
        this.cb([
          { isIntersecting: true, intersectionRatio: 1, target: el },
        ]);
      }
      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
    }
    vi.stubGlobal("IntersectionObserver", MockIO);
  }

  function firePreviewVisibility(visible) {
    for (const instance of ioInstances) {
      instance.cb([
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
          target: instance.el,
        },
      ]);
    }
  }

  function activeQuestion() {
    return document.querySelector("[data-assistant-preview-question='true']")?.textContent ?? "";
  }

  function setDocumentHidden(hidden) {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
    originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    if (originalHidden) Object.defineProperty(document, "hidden", originalHidden);
    if (originalVisibility) Object.defineProperty(document, "visibilityState", originalVisibility);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
  });

  it("shows the approved questions one at a time and wraps after 5000ms", () => {
    installMedia({ desktop: true });
    installObserver();
    renderAssistant();

    expect(ASSISTANT_PREVIEW_QUESTIONS).toEqual(APPROVED_PREVIEW_QUESTIONS);
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    expect(document.querySelectorAll("[data-assistant-preview-question='true']")).toHaveLength(1);
    expect(document.querySelector("[data-assistant-preview-question='true']")).not.toHaveClass(
      "assistant-preview-question-in",
    );
    expect(screen.queryByText("What connects your audit experience with AI?")).toBeNull();
    expect(screen.queryByText("A shared focus on technology, risk and responsible governance.")).toBeNull();
    expect(screen.queryByText("Example question")).toBeNull();
    expect(screen.queryByText("Suggested question")).toBeNull();
    expect(screen.queryByText("Conversation preview")).toBeNull();
    expect(screen.queryByText(/The common thread is understanding/)).toBeNull();

    for (let step = 1; step <= APPROVED_PREVIEW_QUESTIONS.length; step += 1) {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const expected = APPROVED_PREVIEW_QUESTIONS[step % APPROVED_PREVIEW_QUESTIONS.length];
      expect(activeQuestion()).toBe(expected);
      expect(document.querySelectorAll("[data-assistant-preview-question='true']")).toHaveLength(1);
      for (const question of APPROVED_PREVIEW_QUESTIONS) {
        const node = [...document.querySelectorAll("[data-assistant-preview-question]")].find(
          (item) => item.textContent === question,
        );
        expect(node?.getAttribute("aria-hidden")).toBe(question === expected ? null : "true");
        expect(node?.classList.contains("invisible")).toBe(question !== expected);
      }
    }
  });

  it("pauses offscreen, resumes on the same question, and waits a full interval", () => {
    installMedia({ desktop: true });
    installObserver();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000)).toHaveLength(1);

    act(() => {
      firePreviewVisibility(true);
    });
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000)).toHaveLength(1);

    act(() => {
      firePreviewVisibility(false);
    });
    act(() => {
      vi.advanceTimersByTime(5000 * 4);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);

    act(() => {
      firePreviewVisibility(true);
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[1]);
  });

  it("pauses while the tab is hidden and resumes only when the preview is intersecting", () => {
    installMedia({ desktop: true });
    installObserver();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();

    act(() => {
      setDocumentHidden(true);
    });
    act(() => {
      vi.advanceTimersByTime(5000 * 3);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);

    act(() => {
      firePreviewVisibility(false);
      setDocumentHidden(false);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);

    const intervalsWhileOffscreen = setIntervalSpy.mock.calls.filter((call) => call[1] === 5000).length;
    act(() => {
      firePreviewVisibility(true);
    });
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000).length).toBe(
      intervalsWhileOffscreen + 1,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[1]);
  });

  it("does not rotate when reduced motion is requested", () => {
    installMedia({ desktop: true, reduced: true });
    installObserver();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();

    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    expect(ioInstances.some((instance) => instance.el?.hasAttribute("data-assistant-preview-root"))).toBe(
      false,
    );
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000)).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(5000 * 4);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    expect(document.querySelector("[data-assistant-preview-question='true']")).not.toHaveClass(
      "assistant-preview-question-in",
    );
  });

  it("does not rotate when IntersectionObserver is unavailable", () => {
    installMedia({ desktop: true });
    vi.stubGlobal("IntersectionObserver", undefined);
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();

    act(() => {
      vi.advanceTimersByTime(5000 * 4);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000)).toHaveLength(0);
  });

  it("clears the timer and observer on unmount, including under Strict Mode", () => {
    installMedia({ desktop: true });
    installObserver();
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderAssistant({ strict: true });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);

    unmount();
    expect(clearSpy).toHaveBeenCalled();
    expect(ioInstances.some((instance) => instance.disconnected)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000 * 3);
    });
    expect(document.querySelector("[data-assistant-preview-root]")).toBeNull();
    expect(activeQuestion()).toBe("");
  });

  it("keeps one interval when Strict Mode remounts the preview", () => {
    installMedia({ desktop: true });
    installObserver();
    renderAssistant({ strict: true });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[1]);
  });

  it("opens the chat from the desktop control without sending the preview question", () => {
    installMedia({ desktop: true });
    installObserver();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAssistant();

    fireEvent.click(screen.getByRole("button", { name: /Chat/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveValue("");
    expect(document.querySelector("[data-assistant-transcript] [role='log']")?.textContent?.trim()).toBe("");
    expect(screen.getByText(ASSISTANT_WELCOME_MESSAGE)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(screen.queryByText("Suggested questions")).toBeNull();
  });

  it("leaves the mobile preview free of a rotation timer", () => {
    installMedia({ desktop: false });
    installObserver();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();

    expect(ioInstances.some((instance) => instance.el?.hasAttribute("data-assistant-preview-root"))).toBe(
      false,
    );
    expect(setIntervalSpy.mock.calls.filter((call) => call[1] === 5000)).toHaveLength(0);
    expect(document.querySelector("[data-assistant-preview-root]")).toHaveClass("hidden", "lg:block");
    expect(screen.getByText("Ask about my professional background, expertise, and projects.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Chat/ }).querySelector("span.lg\\:hidden")?.textContent).toBe(
      "Chat",
    );
    expect(screen.queryByText("What connects your audit experience with AI?")).toBeNull();
    expect(screen.queryByText("A shared focus on technology, risk and responsible governance.")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000 * 3);
    });
    expect(activeQuestion()).toBe(APPROVED_PREVIEW_QUESTIONS[0]);
  });
});
