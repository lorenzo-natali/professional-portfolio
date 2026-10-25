/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import { ASSISTANT_CONVERSATION_STORAGE_KEY } from "./assistantConversationStore.js";
import {
  ASSISTANT_ABOUT_TEXT,
  ASSISTANT_ASK_TIMEOUT_MS,
  ASSISTANT_BURST_MESSAGE,
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_GLOBAL_LIMIT_MESSAGE,
  ASSISTANT_UNAVAILABLE_MESSAGE,
  ASSISTANT_VISITOR_LIMIT_MESSAGE,
} from "./assistantChatModel.js";

const ENDPOINT = "https://assistant.example";
const RESET = "2026-10-19T00:00:00.000Z";

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
  fireEvent.click(screen.getByRole("button", { name: /Chat/ }));
}

function availabilityDot() {
  const dot = document.querySelector("[data-assistant-availability]");
  if (!dot) throw new Error("missing availability dot");
  return dot;
}

function availabilityResponse(state) {
  return new Response(
    JSON.stringify({ ok: true, state, resets_at: RESET }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function askResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * @param {{
 *   availability?: string | ((asks: number) => string | "fail" | "http"),
 *   ask?: Response | Promise<Response> | ((call: number) => Response | Promise<Response>),
 * }} routes
 */
function mockWorker(routes) {
  /** @type {Array<{ url: string, init: RequestInit | undefined }>} */
  const asks = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const href = String(url);
    if (href.endsWith("/availability")) {
      const state = typeof routes.availability === "function"
        ? routes.availability(asks.length)
        : routes.availability || "available";
      if (state === "fail") throw new Error("offline");
      if (state === "http") return new Response("{}", { status: 503 });
      return availabilityResponse(state);
    }
    if (href.endsWith("/ask")) {
      asks.push({ url: href, init });
      const next = typeof routes.ask === "function" ? routes.ask(asks.length) : routes.ask;
      if (!next) throw new Error("unexpected ask");
      return next;
    }
    throw new Error(`unexpected ${href}`);
  });
  return { spy, asks };
}

function send(question) {
  fireEvent.change(screen.getByRole("textbox", { name: "Your question" }), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

function askBody(call) {
  return JSON.parse(String(call.init?.body));
}

describe("assistant chat POST /ask", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows a grounded answer and only public portfolio links", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", `${ENDPOINT}/`);
    const { asks } = mockWorker({
      ask: askResponse({
        ok: true,
        answer: "Lorenzo's audit background includes control testing.",
        evidence: [
          {
            id: "evidence-internal-id",
            topic: "secret-topic",
            claimType: "employment_past",
            narrativeType: "career_direction",
            signalIds: ["exp-boc", "not-a-real-signal"],
          },
        ],
      }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "available"));
    send("What is Lorenzo's audit background?");

    expect(await screen.findByText("Lorenzo's audit background includes control testing.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bank of China — Internal Audit" })).toBeTruthy();
    expect(screen.queryByText("evidence-internal-id")).toBeNull();
    expect(screen.queryByText("secret-topic")).toBeNull();
    expect(screen.queryByText("employment_past")).toBeNull();
    expect(screen.queryByText("not-a-real-signal")).toBeNull();
    expect(asks).toHaveLength(1);
    expect(asks[0].init?.method).toBe("POST");
    expect(asks[0].init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(askBody(asks[0])).toEqual({ question: "What is Lorenzo's audit background?" });
    expect(String(asks[0].url)).toBe(`${ENDPOINT}/ask`);

    expect(document.getElementById("portfolio-assistant-modal-description")).toHaveTextContent(ASSISTANT_ABOUT_TEXT);
    expect(screen.getByRole("button", { name: "About this assistant" })).toBeTruthy();
    expect(document.querySelector("[data-assistant-disclaimer]")).toBeNull();
    expect(document.getElementById("assistant-how-it-works")).toBeNull();
    expect(screen.queryByRole("button", { name: "A quick note" })).toBeNull();
    expect(screen.getByRole("dialog").textContent).not.toContain("Powered by OpenAI ·");
    expect(screen.getByRole("dialog").textContent).not.toContain("two or three questions");
    expect(screen.getByRole("dialog").textContent).not.toMatch(/OpenAI AI models|portfolio sections/);
  });

  it("shows a local refusal when evidence is empty", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      ask: askResponse({
        ok: true,
        answer: "That's not something Lorenzo's public portfolio covers in detail.",
        evidence: [],
      }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "available"));
    send("How does Lorenzo approach challenging professional situations?");
    expect(
      await screen.findByText("That's not something Lorenzo's public portfolio covers in detail."),
    ).toBeTruthy();
    expect(screen.queryByText("Explore related portfolio content")).toBeNull();
  });

  it("shows a loading state and ignores a duplicate send", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {(value: Response) => void} */
    let resolveAsk = () => {};
    const pending = new Promise((resolve) => {
      resolveAsk = resolve;
    });
    const { asks } = mockWorker({ ask: () => pending });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "available"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByText("Preparing a response…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Your question" }), { key: "Enter" });
    expect(asks).toHaveLength(1);
    expect(screen.getAllByText("What is Lorenzo's current role?")).toHaveLength(1);

    resolveAsk(askResponse({ ok: true, answer: "Lorenzo is an internal auditor.", evidence: [] }));
    expect(await screen.findByText("Lorenzo is an internal auditor.")).toBeTruthy();
  });

  it("does not call POST /ask when the visitor daily limit is already reached", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({ availability: "visitor_limit_reached" });
    renderAssistant();
    openChat();
    await waitFor(() =>
      expect(availabilityDot()).toHaveAttribute("aria-label", "Your daily question limit has been reached"),
    );
    send("What is Lorenzo's current role?");
    expect(screen.getByText(ASSISTANT_VISITOR_LIMIT_MESSAGE)).toBeTruthy();
    expect(asks).toHaveLength(0);
    expect(availabilityDot()).toHaveClass("bg-amber-400");
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveValue(
      "What is Lorenzo's current role?",
    );
  });

  it("does not call POST /ask when the shared daily capacity is already reached", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({ availability: "global_limit_reached" });
    renderAssistant();
    openChat();
    await waitFor(() =>
      expect(availabilityDot()).toHaveAttribute("aria-label", "AI Assistant daily capacity reached"),
    );
    send("What is Lorenzo's current role?");
    expect(screen.getByText(ASSISTANT_GLOBAL_LIMIT_MESSAGE)).toBeTruthy();
    expect(asks).toHaveLength(0);
    expect(availabilityDot()).toHaveClass("bg-red-400/60");
  });

  it("uses a fresh availability read after HTTP 429", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const cases = [
      ["visitor_limit_reached", ASSISTANT_VISITOR_LIMIT_MESSAGE, "bg-amber-400"],
      ["global_limit_reached", ASSISTANT_GLOBAL_LIMIT_MESSAGE, "bg-red-400/60"],
      ["available", ASSISTANT_BURST_MESSAGE, "bg-emerald-400"],
    ];
    for (const [next, message, color] of cases) {
      cleanup();
      vi.restoreAllMocks();
      vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
      const { asks } = mockWorker({
        availability: (sent) => (sent > 0 ? next : "available"),
        ask: askResponse({ ok: false, error: "quota_exceeded" }, 429),
      });
      renderAssistant();
      openChat();
      await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
      send("What is Lorenzo's current role?");
      expect(await screen.findByText(message)).toBeTruthy();
      expect(asks).toHaveLength(1);
      await waitFor(() => expect(availabilityDot()).toHaveClass(color));
    }
  });

  it("shows a neutral unavailable message when the post-429 availability refresh fails", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      availability: (sent) => (sent > 0 ? "fail" : "available"),
      ask: askResponse({ ok: false, error: "quota_exceeded" }, 429),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-slate-500"));
    expect(screen.queryByText(ASSISTANT_VISITOR_LIMIT_MESSAGE)).toBeNull();
    expect(screen.queryByText(ASSISTANT_GLOBAL_LIMIT_MESSAGE)).toBeNull();
  });

  it.each(["openai_timeout", "openai_unavailable", "invalid_provider_response"])(
    "hides provider diagnostics for %s",
    async (error) => {
      vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
      mockWorker({
        ask: askResponse({ ok: false, error }, error === "openai_timeout" ? 504 : 503),
      });
      renderAssistant();
      openChat();
      await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
      send("What is Lorenzo's current role?");
      expect(await screen.findByRole("alert")).toHaveTextContent(ASSISTANT_ERROR_MESSAGE);
      expect(screen.queryByText(error)).toBeNull();
      expect(document.body.textContent).not.toMatch(/invalid_provider_response|openai_timeout|openai_unavailable/);
    },
  );

  it("treats an empty HTTP 200 as an error", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      ask: () => new Response("", { status: 200, headers: { "Content-Type": "application/json" } }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByRole("alert")).toHaveTextContent(ASSISTANT_ERROR_MESSAGE);
    expect(screen.queryByText("Preparing a response…")).toBeNull();
  });

  it("treats a malformed success payload as an error", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      ask: askResponse({ ok: true, answer: "Do not render this partial answer" }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByRole("alert")).toHaveTextContent(ASSISTANT_ERROR_MESSAGE);
    expect(screen.queryByText("Do not render this partial answer")).toBeNull();
  });

  it("shows a temporary unavailable message when the Worker cannot be reached", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      availability: (sent) => (sent > 0 ? "fail" : "available"),
      ask: () => Promise.reject(new Error("offline")),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-slate-500"));
  });

  it("lets an unknown availability state try one question", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      availability: "http",
      ask: askResponse({ ok: true, answer: "Lorenzo studies technology risk.", evidence: [] }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(asks).toHaveLength(0));
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "unknown"));
    send("What is Lorenzo developing?");
    expect(await screen.findByText("Lorenzo studies technology risk.")).toBeTruthy();
    expect(asks).toHaveLength(1);
  });

  it("does not call the Worker when no endpoint is configured", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAssistant();
    openChat();
    send("What is Lorenzo's background?");
    expect(screen.getByText("What is Lorenzo's background?")).toBeTruthy();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("drops a late answer after the assistant is closed and reopened", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {(value: Response) => void} */
    let resolveAsk = () => {};
    const { asks } = mockWorker({
      ask: () =>
        new Promise((resolve) => {
          resolveAsk = resolve;
        }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByText("Preparing a response…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(screen.queryByText("What is Lorenzo's current role?")).toBeNull();
    resolveAsk(askResponse({ ok: true, answer: "LATE_AFTER_RESET_9f3a", evidence: [] }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("LATE_AFTER_RESET_9f3a")).toBeNull();
    expect(asks).toHaveLength(1);
  });

  it("drops a late answer after the modal closes", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {(value: Response) => void} */
    let resolveAsk = () => {};
    mockWorker({
      ask: () =>
        new Promise((resolve) => {
          resolveAsk = resolve;
        }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's current role?");
    expect(await screen.findByText("Preparing a response…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    resolveAsk(askResponse({ ok: true, answer: "LATE_AFTER_CLOSE_9f3a", evidence: [] }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("LATE_AFTER_CLOSE_9f3a")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close" })).toBeNull());
    openChat();
    expect(screen.queryByText("LATE_AFTER_CLOSE_9f3a")).toBeNull();
    expect(screen.queryByText("What is Lorenzo's current role?")).toBeNull();
  });

  it("sends only the current question", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      ask: (call) =>
        askResponse({
          ok: true,
          answer: call === 1 ? "First answer." : "Second answer.",
          evidence: [],
        }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("First question about Lorenzo?");
    expect(await screen.findByText("First answer.")).toBeTruthy();
    send("Second question about projects?");
    expect(await screen.findByText("Second answer.")).toBeTruthy();
    expect(asks).toHaveLength(2);
    expect(askBody(asks[0])).toEqual({ question: "First question about Lorenzo?" });
    expect(askBody(asks[1])).toEqual({ question: "Second question about projects?" });
    expect(Object.keys(askBody(asks[1]))).toEqual(["question"]);
  });

  it("keeps completed messages after close, related links, and a later cancelled question", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {(value: Response) => void} */
    let resolveSecond = () => {};
    const { asks } = mockWorker({
      ask: (call) => {
        if (call === 1) {
          return askResponse({
            ok: true,
            answer: "Lorenzo's audit background includes **control testing**.",
            evidence: [{ id: "evidence-1", signalIds: ["exp-boc"] }],
          });
        }
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      },
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What is Lorenzo's audit background?");
    expect(await screen.findByText("control testing")).toBeTruthy();
    expect(screen.getByText("control testing").tagName).toBe("STRONG");

    fireEvent.click(screen.getByRole("link", { name: "Bank of China — Internal Audit" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close" })).toBeNull());
    openChat();
    expect(screen.getByText("What is Lorenzo's audit background?")).toBeTruthy();
    expect(screen.getByText("control testing")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bank of China — Internal Audit" })).toBeTruthy();

    send("What is still pending?");
    expect(await screen.findByText("Preparing a response…")).toBeTruthy();
    const whilePending = JSON.parse(sessionStorage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY) || "{}");
    expect(whilePending.messages.map((message) => message.text)).toEqual([
      "What is Lorenzo's audit background?",
      "Lorenzo's audit background includes **control testing**.",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.queryByText("What is still pending?")).toBeNull();
    expect(screen.getByText("What is Lorenzo's audit background?")).toBeTruthy();
    expect(screen.getByText("control testing")).toBeTruthy();

    resolveSecond(askResponse({ ok: true, answer: "LATE_SECOND_ANSWER", evidence: [] }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("LATE_SECOND_ANSWER")).toBeNull();
    expect(asks).toHaveLength(2);
    expect(askBody(asks[1])).toEqual({ question: "What is still pending?" });
  });

  it("restores a saved conversation on reload without sending it again", async () => {
    sessionStorage.setItem(
      ASSISTANT_CONVERSATION_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        messages: [
          { id: "user-4", role: "user", text: "Saved question" },
          {
            id: "assistant-4",
            role: "assistant",
            text: "Saved **answer**.",
            signalIds: ["exp-boc"],
          },
          { id: "user-5", role: "user", text: "Later saved question" },
          { id: "assistant-5", role: "assistant", text: "Later saved answer." },
        ],
      }),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAssistant();
    openChat();

    const transcript = document.querySelector("[data-assistant-transcript]");
    expect(transcript?.textContent?.indexOf("Saved question")).toBeLessThan(
      transcript?.textContent?.indexOf("Later saved question") ?? -1,
    );
    expect(screen.getByText("answer").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "Bank of China — Internal Audit" })).toBeTruthy();
    expect(screen.getByText("Later saved answer.")).toBeTruthy();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    cleanup();
    const { asks } = mockWorker({
      ask: askResponse({ ok: true, answer: "Fresh answer.", evidence: [] }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("A new independent question?");
    expect(await screen.findByText("Fresh answer.")).toBeTruthy();
    expect(screen.getByText("Saved question")).toBeTruthy();
    expect(asks).toHaveLength(1);
    expect(askBody(asks[0])).toEqual({ question: "A new independent question?" });
  });

  it("ignores corrupt session storage and keeps working when storage is blocked", async () => {
    sessionStorage.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, "{not-json");
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      ask: askResponse({ ok: true, answer: "Assistant answer.", evidence: [] }),
    });
    renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    send("What is Lorenzo's background?");
    expect(await screen.findByText("Assistant answer.")).toBeTruthy();
    cleanup();

    sessionStorage.clear();
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockWorker({
      ask: askResponse({ ok: true, answer: "Still answered.", evidence: [] }),
    });
    expect(() => renderAssistant()).not.toThrow();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveClass("bg-emerald-400"));
    send("What remains available?");
    expect(await screen.findByText("Still answered.")).toBeTruthy();
  });

  it("leaves loading when fetch does not settle within the deadline", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      ask: () =>
        new Promise((_resolve, reject) => {
          const signal = asks.at(-1)?.init?.signal;
          const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        }),
    });
    renderAssistant();
    openChat();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    send("What is Lorenzo's current role?");
    expect(screen.getByText("Preparing a response…")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASSISTANT_ASK_TIMEOUT_MS - 1);
    });
    expect(screen.getByText("Preparing a response…")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
    expect(asks).toHaveLength(1);
  });

  it("leaves loading when response.json() does not settle within the deadline", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {() => void} */
    let releaseJson = () => {};
    mockWorker({
      ask: () => ({
        status: 200,
        json: () =>
          new Promise((resolve) => {
            releaseJson = () => resolve({ ok: true, answer: "LATE_JSON_ANSWER", evidence: [] });
          }),
      }),
    });
    renderAssistant();
    openChat();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    send("What is Lorenzo's current role?");
    expect(screen.getByText("Preparing a response…")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASSISTANT_ASK_TIMEOUT_MS);
    });
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();

    releaseJson();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText("LATE_JSON_ANSWER")).toBeNull();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
  });

  it("does not let a late response overwrite the timeout state", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    /** @type {(value: Response) => void} */
    let releaseAsk = () => {};
    mockWorker({
      ask: () =>
        new Promise((resolve) => {
          releaseAsk = resolve;
        }),
    });
    renderAssistant();
    openChat();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    send("What is Lorenzo's current role?");
    expect(screen.getByText("Preparing a response…")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASSISTANT_ASK_TIMEOUT_MS);
    });
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();

    releaseAsk(askResponse({ ok: true, answer: "LATE_AFTER_TIMEOUT", evidence: [] }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText("LATE_AFTER_TIMEOUT")).toBeNull();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeTruthy();
  });

  it("does not show a timeout after the assistant is closed and reopened", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      ask: () =>
        new Promise((_resolve, reject) => {
          const signal = asks.at(-1)?.init?.signal;
          const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        }),
    });
    renderAssistant();
    openChat();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    send("What is Lorenzo's current role?");
    expect(screen.getByText("Preparing a response…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
    expect(screen.queryByText("What is Lorenzo's current role?")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASSISTANT_ASK_TIMEOUT_MS);
    });
    expect(screen.queryByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeNull();
    expect(screen.queryByText(ASSISTANT_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText("Preparing a response…")).toBeNull();

    send("What is Lorenzo's background?");
    expect(screen.getByText("Preparing a response…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASSISTANT_ASK_TIMEOUT_MS);
    });
    openChat();
    expect(screen.queryByText(ASSISTANT_UNAVAILABLE_MESSAGE)).toBeNull();
    expect(screen.queryByText(ASSISTANT_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText("Preparing a response…")).toBeNull();
  });
});

describe("Beyond CV Easter egg", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function eligibleAsk(answer = "He enjoys history, reading and travel.") {
    return askResponse({
      ok: true,
      answer,
      evidence: [],
      action: "beyond-cv",
    });
  }

  async function openReadyChat() {
    const view = renderAssistant();
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "available"));
    return view;
  }

  it("shows the English invitation once and ignores a later token", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      ask: (call) => eligibleAsk(call === 1 ? "First answer." : "Second answer."),
    });
    await openReadyChat();
    send("What are Lorenzo's hobbies?");
    expect(await screen.findByRole("button", { name: "Show me" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Maybe later" })).toBeTruthy();
    expect(screen.getByText("There's a little more to this portfolio than meets the eye.")).toBeTruthy();
    expect(screen.getByText("Would you like to take a closer look?")).toBeTruthy();
    expect(screen.getByText("First answer.")).toBeTruthy();
    expect(document.querySelectorAll("[data-beyond-cv-easter-egg]")).toHaveLength(1);

    send("What does he enjoy outside work?");
    expect(await screen.findByText("Second answer.")).toBeTruthy();
    expect(document.querySelectorAll("[data-beyond-cv-easter-egg]")).toHaveLength(1);
    expect(asks).toHaveLength(2);
  });

  it("uses the question language for equivalent Beyond CV phrasings", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({ ask: eligibleAsk("Grounded answer.") });
    await openReadyChat();
    send("Can you tell me something about Lorenzo beyond his CV?");
    expect(await screen.findByRole("button", { name: "Show me" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mostrami" })).toBeNull();
  });

  it("shows the Italian invitation from an Italian question", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({ ask: eligibleAsk("Gli piace la storia.") });
    await openReadyChat();
    send("Quali sono gli hobby di Lorenzo?");
    expect(await screen.findByRole("button", { name: "Mostrami" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Magari più tardi" })).toBeTruthy();
    expect(screen.getByText("Questo portfolio nasconde qualcosa in più di ciò che si vede.")).toBeTruthy();
    expect(screen.getByText("Ti va di dare un'occhiata più da vicino?")).toBeTruthy();
  });

  it("dismisses without another request and does not offer again", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({ ask: eligibleAsk() });
    await openReadyChat();
    send("What are Lorenzo's hobbies?");
    fireEvent.click(await screen.findByRole("button", { name: "Maybe later" }));
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(asks).toHaveLength(1);

    send("What are Lorenzo's personal interests?");
    await waitFor(() => expect(asks).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(document.querySelector("[data-beyond-cv-easter-egg]")).toBeNull();
  });

  it("unlocks a desktop QR without calling /ask or navigating", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({ ask: eligibleAsk() });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    await openReadyChat();
    send("What are Lorenzo's hobbies?");
    fireEvent.click(await screen.findByRole("button", { name: "Show me" }));
    const qr = await screen.findByRole("img", { name: "QR code to open the Beyond CV experience on a smartphone." });
    expect(qr.getAttribute("src")).toBeTruthy();
    expect(screen.getByText("Have Lorenzo's CV nearby? Scan this QR code with your phone and see what happens.")).toBeTruthy();
    expect(screen.getByText("https://lorenzo-natali.github.io/professional-portfolio/?beyond=1")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /beyond/i })).toBeNull();
    expect(asks).toHaveLength(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("keeps the invitation usable after the question quota is exhausted", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({
      availability: (askCount) => (askCount >= 1 ? "visitor_limit_reached" : "available"),
      ask: eligibleAsk(),
    });
    await openReadyChat();
    send("What are Lorenzo's hobbies?");
    expect(await screen.findByRole("button", { name: "Show me" })).toBeTruthy();
    await waitFor(() =>
      expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "visitor_limit"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeTruthy();
    expect(asks).toHaveLength(1);
    send("What else can you tell me?");
    expect(screen.getByText(ASSISTANT_VISITOR_LIMIT_MESSAGE)).toBeTruthy();
    expect(asks).toHaveLength(1);
    expect(screen.getByRole("img", { name: /QR code/ })).toBeTruthy();
  });

  it("restores one unlocked card after the chat closes and the page remounts", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({ ask: eligibleAsk() });
    const view = await openReadyChat();
    send("What are Lorenzo's hobbies?");
    fireEvent.click(await screen.findByRole("button", { name: "Show me" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openChat();
    expect(document.querySelectorAll("[data-beyond-cv-easter-egg='unlocked']")).toHaveLength(1);

    view.unmount();
    mockWorker({ ask: eligibleAsk("Should not be requested.") });
    renderAssistant();
    openChat();
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeTruthy();
    expect(document.querySelectorAll("[data-beyond-cv-easter-egg]")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
  });

  it("launches the existing AR view from a phone without requesting the camera", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    const { asks } = mockWorker({ ask: eligibleAsk() });
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", mediaDevices: { getUserMedia } });
    render(
      <App
        features={{ assistant: true, beyond: true, intro: false, preload: false }}
        beyondModules={{
          ARGovernanceCard: () => <button type="button">Beyond CV</button>,
          ARGovernanceView: ({ open }) => (open ? <div>AR experience</div> : null),
          shouldLaunchBeyondCvFromLocation: () => false,
        }}
        eagerSectionModules={{ hero: HeroHarness }}
      />,
    );
    openChat();
    await waitFor(() => expect(availabilityDot()).toHaveAttribute("data-assistant-availability", "available"));
    send("What are Lorenzo's hobbies?");
    fireEvent.click(await screen.findByRole("button", { name: "Show me" }));
    fireEvent.click(await screen.findByRole("button", { name: "Launch Beyond CV" }));
    expect(screen.getByText("Have Lorenzo's CV nearby? Open the experience and point your camera at its first page.")).toBeTruthy();
    expect(screen.getByText("AR experience")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Beyond CV" })).toBeNull();
    expect(asks).toHaveLength(1);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("does not show an invitation for an ordinary or untrusted action", async () => {
    vi.stubEnv("VITE_PORTFOLIO_ASSISTANT_ENDPOINT", ENDPOINT);
    mockWorker({
      ask: askResponse({
        ok: true,
        answer: "Lorenzo works in internal audit.",
        evidence: [],
        action: "https://evil.example/?beyond=1",
      }),
    });
    await openReadyChat();
    send("What is Lorenzo's audit background?");
    expect(await screen.findByText("Lorenzo works in internal audit.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(screen.queryByText("evil.example")).toBeNull();
  });
});

