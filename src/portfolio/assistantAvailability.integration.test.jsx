/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import { ASSISTANT_ABOUT_TEXT } from "./assistantChatModel.js";
import { useAssistantAvailability } from "./useAssistantAvailability.js";

const ENDPOINT = "https://assistant.example";

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
    />,
  );
}

function openChat() {
  fireEvent.click(screen.getByRole("button", { name: "Ask the Assistant" }));
}

function availabilityDot() {
  const dot = document.querySelector("[data-assistant-availability]");
  if (!dot) throw new Error("missing availability dot");
  return dot;
}

function chatHeaderDot() {
  const dot = document
    .getElementById("portfolio-assistant-modal-title")
    ?.parentElement?.querySelector("[data-assistant-availability]");
  if (!dot) throw new Error("missing chat availability dot");
  return dot;
}

function futureReset(delayMs) {
  return new Date(Date.now() + delayMs).toISOString();
}

function availabilityResponse(state, resetsAt, status = 200) {
  return new Response(JSON.stringify({ ok: true, state, resets_at: resetsAt }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubEndpoint(endpoint = ENDPOINT) {
  vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", endpoint);
}

describe("assistant availability indicator integration", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("shows green, orange, and red from the availability states", async () => {
    stubEndpoint();
    const resetsAt = futureReset(60 * 60 * 1000);
    const states = ["available", "visitor_limit_reached", "global_limit_reached"];
    let call = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(String(url)).toBe(`${ENDPOINT}/availability`);
      expect(init?.method).toBe("GET");
      expect(String(url)).not.toContain("/health");
      expect(String(url)).not.toContain("/ask");
      call += 1;
      return availabilityResponse(states[Math.min(call, states.length) - 1], resetsAt);
    });

    renderAssistant();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant available"));
    expect(availabilityDot()).toHaveClass("bg-emerald-400");

    openChat();
    await waitFor(() =>
      expect(availabilityDot()).toHaveAttribute("aria-label", "Your daily question limit has been reached"),
    );
    expect(availabilityDot()).toHaveClass("bg-amber-400");
    expect(chatHeaderDot()).toHaveAttribute("data-assistant-availability", "visitor_limit");
    expect(chatHeaderDot().querySelector("[data-assistant-status-dot]")).toHaveClass("bg-amber-400");
    expect(chatHeaderDot()).toHaveAttribute("aria-label", "Your daily question limit has been reached");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    });
    openChat();
    await waitFor(() =>
      expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant daily capacity reached"),
    );
    expect(availabilityDot()).toHaveClass("bg-red-400/60");
    expect(chatHeaderDot()).toHaveAttribute("data-assistant-availability", "global_limit");
    expect(chatHeaderDot().querySelector("[data-assistant-status-dot]")).toHaveClass("bg-red-400/60");
    expect(chatHeaderDot()).toHaveAttribute("aria-label", "AI Assistant daily capacity reached");
    expect(call).toBe(3);
  });

  it.each([
    ["http error", () => Promise.resolve(new Response("{}", { status: 503 }))],
    ["network failure", () => Promise.reject(new Error("offline"))],
    ["malformed json", () => Promise.resolve(new Response("{", { status: 200 }))],
    [
      "invalid state",
      () => Promise.resolve(availabilityResponse("maybe", futureReset(60_000))),
    ],
    [
      "invalid reset timestamp",
      () => Promise.resolve(availabilityResponse("available", "tomorrow")),
    ],
  ])("stays gray after a failed availability check (%s)", async (_label, respond) => {
    stubEndpoint();
    let settled = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      settled = true;
      return respond();
    });
    renderAssistant();
    await waitFor(() => expect(settled).toBe(true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant status unknown");
    expect(availabilityDot()).toHaveClass("bg-slate-500");
  });

  it("makes no request and stays gray when the endpoint is absent or blank", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { unmount } = renderAssistant();
    openChat();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant status unknown");
    expect(chatHeaderDot().querySelector("[data-assistant-status-dot]")).toHaveClass("bg-slate-500");
    expect(chatHeaderDot()).toHaveAttribute("data-assistant-availability", "unknown");
    expect(chatHeaderDot()).toHaveAttribute("tabindex", "-1");
    expect(chatHeaderDot()).not.toHaveAttribute("title");
    expect(chatHeaderDot()).not.toHaveAttribute("aria-describedby");
    expect(availabilityDot()).not.toHaveAttribute("title");
    expect(availabilityDot()).not.toHaveAttribute("aria-describedby");
    expect(document.querySelector("[role='tooltip']")).toBeNull();
    unmount();

    stubEndpoint("   ");
    renderAssistant();
    openChat();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant status unknown");
  });

  it("refreshes when the chat opens and when the tab becomes visible", async () => {
    stubEndpoint(`${ENDPOINT}/`);
    const resetsAt = futureReset(60 * 60 * 1000);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      availabilityResponse("available", resetsAt),
    );

    renderAssistant();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(String(fetchSpy.mock.calls[0][0])).toBe(`${ENDPOINT}/availability`);

    openChat();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(chatHeaderDot().querySelector("[data-assistant-status-dot]")).toHaveClass("bg-emerald-400"),
    );
    expect(chatHeaderDot()).toHaveAttribute("data-assistant-availability", "available");
    expect(chatHeaderDot()).toHaveAttribute("aria-label", "AI Assistant available");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
  });

  it("refreshes when the returned UTC reset time is reached", async () => {
    vi.useFakeTimers();
    stubEndpoint();
    const firstReset = new Date(Date.now() + 30_000).toISOString();
    const nextReset = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      return availabilityResponse(calls === 1 ? "available" : "visitor_limit_reached", calls === 1 ? firstReset : nextReset);
    });

    const { result } = renderHook(() => useAssistantAvailability(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("available");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(result.current.status).toBe("visitor_limit");
    expect(calls).toBe(2);
  });

  it("clears the reset timer and visibility listener on unmount", async () => {
    stubEndpoint();
    const clearSpy = vi.spyOn(window, "clearTimeout");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      availabilityResponse("available", futureReset(60_000)),
    );

    const { result, unmount } = renderHook(() => useAssistantAvailability(false));
    await waitFor(() => expect(result.current.status).toBe("available"));
    clearSpy.mockClear();
    unmount();

    expect(removeSpy.mock.calls.some((call) => call[0] === "visibilitychange")).toBe(true);
    expect(clearSpy).toHaveBeenCalled();
  });

  it("ignores a stale availability response after a newer request", async () => {
    stubEndpoint();
    const resetsAt = futureReset(60_000);
    /** @type {(value: Response) => void} */
    let resolveFirst = () => {};
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      calls += 1;
      if (calls === 1) return first;
      return Promise.resolve(availabilityResponse("available", resetsAt));
    });

    renderAssistant();
    await waitFor(() => expect(calls).toBe(1));
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant available"));

    resolveFirst(availabilityResponse("global_limit_reached", resetsAt));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant available");
  });

  it("preserves the modal, disclaimer, capacity note, and local send behavior", async () => {
    stubEndpoint();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/ask")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({ question: "What is Lorenzo's background?" });
        return new Response(
          JSON.stringify({
            ok: true,
            answer: "Lorenzo's background is in internal audit.",
            evidence: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return availabilityResponse("available", futureReset(60_000));
    });
    renderAssistant();
    openChat();

    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveTextContent(ASSISTANT_ABOUT_TEXT);
    expect(screen.getByRole("button", { name: "About this assistant" })).toBeTruthy();
    expect(document.querySelector("[data-assistant-disclaimer]")).toBeNull();
    expect(screen.queryByRole("button", { name: "A quick note" })).toBeNull();
    expect(document.getElementById("assistant-how-it-works")).toBeNull();
    expect(screen.getByRole("dialog").textContent).not.toContain("Powered by OpenAI ·");
    expect(screen.getByRole("dialog").textContent).not.toContain("two or three questions");
    expect(screen.getByRole("dialog").textContent).not.toMatch(/OpenAI AI models|portfolio sections/);

    fireEvent.change(screen.getByRole("textbox", { name: "Your question" }), {
      target: { value: "What is Lorenzo's background?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("What is Lorenzo's background?")).toBeTruthy();
    expect(await screen.findByText("Lorenzo's background is in internal audit.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(screen.getByText("What is Lorenzo's background?")).toBeTruthy();
    expect(screen.getByText("Lorenzo's background is in internal audit.")).toBeTruthy();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.queryByRole("button", { name: "New conversation" })).toBeNull();

    const askCalls = fetchSpy.mock.calls.filter((call) => String(call[0]).endsWith("/ask"));
    expect(askCalls).toHaveLength(1);
    expect(fetchSpy.mock.calls.filter((call) => !String(call[0]).endsWith("/ask")).every((call) => String(call[0]).endsWith("/availability"))).toBe(true);
  });
});
