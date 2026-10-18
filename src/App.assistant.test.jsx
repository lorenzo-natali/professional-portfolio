import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App.jsx";
import {
  ASSISTANT_ABOUT_NOTE,
  ASSISTANT_HEADER_SUBTITLE,
} from "./portfolio/assistantChatModel.js";

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

function openChat() {
  fireEvent.click(screen.getByRole("button", { name: "Chat" }));
}

describe("Portfolio Assistant guided modal", () => {
  beforeEach(() => {
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

  it("presents the preview card as a chat entry without claiming the assistant is online", () => {
    renderAssistant();

    expect(screen.getByRole("img", { name: "Lorenzo Natali" })).toBeTruthy();
    expect(
      screen.getByText(
        "Ask about my professional background, expertise, and projects."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Suggested question")).toBeNull();
    expect(screen.queryByRole("button", { name: /Use example question/ })).toBeNull();
    expect(document.querySelector("[data-assistant-preview-root]")).toBeNull();
    expect(document.querySelector("[data-assistant-preview-question]")).toBeNull();
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
      "text-slate-50",
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

    const chatButton = screen.getByRole("button", { name: "Chat" });
    expect(chatButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(chatButton.textContent?.replace(/\s+/g, " ").trim()).toBe("Chat");
    expect(document.querySelector("[data-assistant-availability]")).toHaveAttribute(
      "data-assistant-availability",
      "unknown"
    );
  });

  it("opens the chat, keeps focus inside the dialog, and restores scrolling on close", async () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(480);
    renderAssistant();

    const openButton = screen.getByRole("button", { name: "Chat" });
    fireEvent.click(openButton);

    expect(screen.getByText(ASSISTANT_HEADER_SUBTITLE)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "What would you like to know about Lorenzo?" })).toBeNull();
    expect(screen.queryByRole("button", { name: "What is Lorenzo's professional background?" })).toBeNull();
    expect(document.querySelector("[data-assistant-transcript]")?.textContent?.trim()).toBe("");
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveAttribute(
      "placeholder",
      "Ask me something..."
    );
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
    expect(dialog).toHaveClass("overflow-hidden", "max-h-[100dvh]", "sm:max-h-[80vh]", "sm:h-[78vh]");
    expect(dialog.parentElement).toHaveClass("flex", "h-[100dvh]");
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
    expect(document.querySelector("[data-assistant-transcript]")?.textContent?.trim()).toBe("");
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

    const openButton = screen.getByRole("button", { name: "Chat" });
    fireEvent.click(openButton);

    expect(applicationRoot.inert).toBe(true);
    expect(applicationRoot).toHaveAttribute("inert");
    const closeButton = screen.getByRole("button", { name: "Close" });
    const textarea = screen.getByRole("textbox", { name: "Your question" });

    textarea.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

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

    const openButton = screen.getByRole("button", { name: "Chat" });
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
    expect(screen.getByText("0/500")).toBeTruthy();

    fireEvent.change(textarea, { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();

    fireEvent.change(textarea, { target: { value: "a".repeat(640) } });
    expect(textarea).toHaveValue("a".repeat(500));
    expect(screen.getByText("500/500")).toBeTruthy();
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
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByText(/not used as context/)).toBeNull();
    expect(screen.queryByRole("button", { name: "New conversation" })).toBeNull();
    expect(screen.queryByText(/Development preview/)).toBeNull();
    expect(screen.queryByText(/Development-only sample answer/)).toBeNull();
    expect(textarea).toHaveValue("");
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(document.querySelector("[data-assistant-transcript]")?.textContent?.trim()).toBe("");
    expect(screen.queryByText("What is Lorenzo's background?")).toBeNull();
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });

  it("explains the assistant without a model name and keeps the chat available when AI is unavailable", () => {
    renderAssistant();
    openChat();
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(screen.getByText(ASSISTANT_HEADER_SUBTITLE)).toBeTruthy();
    const about = screen.getByRole("button", { name: "About this assistant" });
    expect(about).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(ASSISTANT_ABOUT_NOTE)).toBeNull();
    expect(screen.queryByText(/OpenAI AI models/)).toBeNull();
    expect(screen.queryByText(/Please refer to the portfolio sections/)).toBeNull();
    expect(screen.queryByRole("button", { name: "A quick note" })).toBeNull();
    fireEvent.click(about);
    const disclosure = document.getElementById("assistant-how-it-works");
    expect(about).toHaveAttribute("aria-expanded", "true");
    expect(disclosure?.textContent).toBe(ASSISTANT_ABOUT_NOTE);
    expect(disclosure?.textContent).not.toMatch(/OpenAI AI models|portfolio sections|personal, confidential/);
    expect(screen.getByRole("dialog").textContent).not.toMatch(/gpt-|luna/i);

    const textarea = screen.getByRole("textbox", { name: "Your question" });
    fireEvent.change(textarea, { target: { value: "A question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Your question" })).toBeTruthy();
    expect(screen.getByText("A question")).toBeTruthy();
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy();
  });

  it("keeps keyboard focus inside the chat dialog", () => {
    renderAssistant();
    openChat();
    const closeButton = screen.getByRole("button", { name: "Close" });
    const textarea = screen.getByRole("textbox", { name: "Your question" });
    textarea.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(textarea).toHaveFocus();
  });
});

describe("Portfolio Assistant preview without question rotation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not render suggested questions or start a preview timer", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderAssistant();

    expect(screen.queryByText("Suggested question")).toBeNull();
    expect(screen.queryByRole("button", { name: /Use example question/ })).toBeNull();
    expect(document.querySelector("[data-assistant-preview-root]")).toBeNull();
    expect(setIntervalSpy.mock.calls.map((call) => call[1])).not.toContain(3600);

    openChat();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Explore curated questions" })).toBeNull();
    expect(screen.queryByText("Suggested question")).toBeNull();
  });
});
