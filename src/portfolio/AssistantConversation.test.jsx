import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantConversation } from "./AssistantConversation.jsx";
import { developmentConversationFixture } from "./assistantChatFixtures.js";
import {
  ASSISTANT_ERROR_MESSAGE,
  resolveVerifiedSignals,
} from "./assistantChatModel.js";
import { signalMap } from "./portfolioData.js";

function renderConversation(overrides = {}) {
  const props = {
    draft: "",
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    onReset: vi.fn(),
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
    expect(screen.getByText(/not used as context/)).toBeTruthy();
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
