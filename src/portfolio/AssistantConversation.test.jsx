import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantConversation } from "./AssistantConversation.jsx";
import { developmentConversationFixture } from "./assistantChatFixtures.js";
import {
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_WELCOME_MESSAGE,
  resolveVerifiedSignals,
} from "./assistantChatModel.js";
import { signalMap } from "./portfolioData.js";

function renderConversation(overrides = {}) {
  const props = {
    draft: "",
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    ...overrides,
  };
  return { ...render(<AssistantConversation {...props} />), props };
}

describe("assistant chat presentation", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows loading and error states without treating them as answers", () => {
    const { rerender, props } = renderConversation({ status: "loading", draft: "Pending" });
    expect(screen.getByRole("status").textContent).toMatch(/Preparing a response/);
    expect(screen.queryByRole("heading", { name: "What would you like to know about Lorenzo?" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Your question" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    rerender(
      <AssistantConversation {...props} status="error" draft="" />
    );
    expect(screen.getByRole("alert").textContent).toBe(ASSISTANT_ERROR_MESSAGE);
    expect(screen.queryByText(developmentConversationFixture.messages[1].text)).toBeNull();
  });

  it("renders a development-only transcript and only verified portfolio links", () => {
    renderConversation({
      messages: developmentConversationFixture.messages,
      signalMap,
      draft: "",
    });

    expect(screen.getByText("Development preview — not a live AI response")).toBeTruthy();
    expect(screen.getByText(developmentConversationFixture.messages[1].text)).toBeTruthy();
    expect(screen.getByRole("link", { name: signalMap["exp-boc"].label })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "missing-signal-id" })).toBeNull();
    expect(screen.getByText("Explore related portfolio content")).toBeTruthy();
    expect(screen.queryByText(/not used as context/)).toBeNull();
    expect(screen.queryByRole("button", { name: "New conversation" })).toBeNull();
  });

  it("omits related links when no verified mapping exists", () => {
    renderConversation({
      messages: [
        {
          id: "assistant-unmapped",
          role: "assistant",
          developmentOnly: true,
          text: "Development-only sample answer. This is not a live model response.",
          signalIds: ["not-a-real-signal"],
        },
      ],
      signalMap,
    });
    expect(screen.queryByText("Explore related portfolio content")).toBeNull();
  });

  it("formats assistant answers and leaves questions as plain text", () => {
    const { container } = renderConversation({
      messages: [
        { id: "user-md", role: "user", text: "**Not bold** <script>alert(1)</script>" },
        {
          id: "assistant-md",
          role: "assistant",
          text: "Lorenzo is an **IT Audit Specialist**.",
        },
      ],
    });

    const user = container.querySelector('[data-assistant-message-role="user"]');
    const assistant = container.querySelector('[data-assistant-message-role="assistant"]');
    expect(user?.textContent).toContain("**Not bold** <script>alert(1)</script>");
    expect(user?.querySelector("strong, script")).toBeNull();
    expect(assistant?.querySelector("strong")?.textContent).toBe("IT Audit Specialist");
    expect(assistant?.textContent).not.toContain("**");
    expect(container.querySelector("script")).toBeNull();
  });

  it("keeps message bubbles on their sides and caps them at 85% and 42rem", () => {
    const { container } = renderConversation({
      messages: [
        { id: "user-short", role: "user", text: "Hi" },
        {
          id: "assistant-long",
          role: "assistant",
          text: "Lorenzo is an IT Audit Specialist at Banca Profilo.\n\n- Risk-based IT audits\n- DORA Pillar I",
        },
      ],
    });
    const user = container.querySelector('[data-assistant-message-role="user"]');
    const assistant = container.querySelector('[data-assistant-message-role="assistant"]');
    const welcome = container.querySelector("[data-assistant-welcome]");
    expect(user.className).toContain("w-fit");
    expect(user.className).toContain("max-w-[min(85%,42rem)]");
    expect(user.className).toContain("ml-auto");
    expect(user.className).not.toContain("mr-auto");
    expect(user.className).not.toMatch(/text-center|text-right/);
    expect(assistant.className).toContain("w-fit");
    expect(assistant.className).toContain("max-w-[min(85%,42rem)]");
    expect(assistant.className).toContain("mr-auto");
    expect(assistant.className).not.toContain("ml-auto");
    expect(assistant.className).not.toMatch(/text-center|text-right/);
    expect(user.querySelector("p").className).not.toMatch(/text-center|text-right/);
    expect(assistant.querySelector("ul")).toBeTruthy();
    expect(assistant.querySelector("li").textContent).toContain("Risk-based IT audits");
    expect(welcome.className).toContain("max-w-[42rem]");
    expect(welcome.className).not.toContain("min(85%");
    expect(welcome.querySelector("p").className).toContain("assistant-text");
  });

  it("keeps an unboxed welcome first and does not show starter boxes", () => {
    const onSend = vi.fn();
    const { rerender, props } = renderConversation({ onSend });
    const welcome = document.querySelector("[data-assistant-welcome]");
    expect(welcome?.textContent).toContain(ASSISTANT_WELCOME_MESSAGE);
    expect(welcome?.textContent).not.toContain("AI Portfolio Assistant");
    expect(welcome?.className ?? "").not.toMatch(/border|bg-/);
    expect(welcome?.querySelector("[class*='border'], [class*='bg-']")).toBeNull();
    expect(document.querySelector("[role='log']")?.textContent).not.toContain(ASSISTANT_WELCOME_MESSAGE);
    expect(document.querySelector("[data-assistant-transcript]")?.firstElementChild).toBe(welcome);
    expect(document.querySelector("[data-assistant-starters]")).toBeNull();
    for (const label of ["Current Role", "DORA & IT Audit", "AI Governance", "Projects"]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
    expect(onSend).not.toHaveBeenCalled();

    rerender(
      <AssistantConversation
        {...props}
        messages={[
          { id: "user-1", role: "user", text: "What is Lorenzo's current professional role?" },
          { id: "assistant-1", role: "assistant", text: "Lorenzo is an IT Audit Specialist." },
        ]}
      />
    );
    const restoredWelcome = document.querySelector("[data-assistant-welcome]");
    const userMessage = document.querySelector("[data-assistant-message-role='user']");
    expect(document.querySelectorAll("[data-assistant-welcome]")).toHaveLength(1);
    expect(screen.getByText(ASSISTANT_WELCOME_MESSAGE)).toBeTruthy();
    expect(document.querySelector("[data-assistant-transcript]")?.firstElementChild).toBe(restoredWelcome);
    expect(restoredWelcome.compareDocumentPosition(userMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector("[role='log']")?.textContent).not.toContain(ASSISTANT_WELCOME_MESSAGE);
  });

  it("grows the textarea with content and reveals the counter near the limit", () => {
    const composerRef = { current: null };
    const { rerender, props } = renderConversation({ draft: "", composerRef });
    const textarea = screen.getByRole("textbox", { name: "Your question" });
    composerRef.current = textarea;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 96 });
    rerender(<AssistantConversation {...props} draft={"Line\n".repeat(4)} composerRef={composerRef} />);
    expect(textarea.style.height).toBe("96px");
    expect(document.getElementById("assistant-question-count")).toHaveClass("sr-only");

    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => 240 });
    rerender(<AssistantConversation {...props} draft={"a".repeat(400)} composerRef={composerRef} />);
    expect(textarea.style.height).toBe("128px");
    expect(document.getElementById("assistant-question-count")).toHaveTextContent("400/500");
    expect(document.getElementById("assistant-question-count")).not.toHaveClass("sr-only");
  });

  it("scrolls new user messages into view and leaves a reader of earlier messages in place", () => {
    const messages = [
      { id: "user-1", role: "user", text: "Earlier question" },
      { id: "assistant-1", role: "assistant", text: "Earlier answer" },
    ];
    const { rerender, props } = renderConversation({ messages });
    const scroller = document.querySelector("[data-assistant-transcript]");
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 200 });
    scroller.scrollTop = 0;
    fireEvent.scroll(scroller);

    rerender(
      <AssistantConversation
        {...props}
        messages={[...messages, { id: "assistant-2", role: "assistant", text: "A later answer" }]}
      />
    );
    expect(scroller.scrollTop).toBe(0);

    rerender(
      <AssistantConversation
        {...props}
        messages={[
          ...messages,
          { id: "assistant-2", role: "assistant", text: "A later answer" },
          { id: "user-2", role: "user", text: "A new question" },
        ]}
      />
    );
    expect(scroller.scrollTop).toBe(800);
  });

  it("does not send on Shift+Enter and does send on Enter", () => {
    const onSend = vi.fn();
    renderConversation({ draft: "A grounded question", onSend });
    const textarea = screen.getByRole("textbox", { name: "Your question" });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});

describe("resolveVerifiedSignals", () => {
  it("drops unknown ids and keeps portfolio targets", () => {
    expect(resolveVerifiedSignals(["exp-boc", "missing-signal-id", "exp-boc"], signalMap)).toEqual([
      {
        id: "exp-boc",
        label: signalMap["exp-boc"].label,
        href: signalMap["exp-boc"].href,
        target: signalMap["exp-boc"].target,
      },
    ]);
    expect(resolveVerifiedSignals("exp-boc", signalMap)).toEqual([]);
  });
});
