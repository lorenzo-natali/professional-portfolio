/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import {
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
  fireEvent.click(screen.getByRole("button", { name: "Chat" }));
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

    expect(
      screen.getByText(
        "Powered by OpenAI · Based on Lorenzo's portfolio · AI responses may contain inaccuracies.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "About this assistant" }));
    expect(screen.getByText(/Do not enter personal, confidential, or sensitive information/)).toBeTruthy();
    expect(screen.getByText("A quick note")).toBeTruthy();
    expect(
      screen.getByText(/consider focusing on two or three questions that matter most to you/),
    ).toBeTruthy();
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

  it("drops a late answer after New conversation", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
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

  it("does not show a timeout after New conversation or close", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
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
