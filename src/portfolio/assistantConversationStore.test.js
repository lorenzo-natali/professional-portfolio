import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ASSISTANT_CONVERSATION_STORAGE_KEY,
  highestAssistantMessageSeq,
  loadAssistantConversation,
  sanitizeAssistantConversation,
  saveAssistantConversation,
} from "./assistantConversationStore.js";

function memoryStorage() {
  /** @type {Map<string, string>} */
  const entries = new Map();
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
    dump: () => entries,
  };
}

describe("assistant conversation session store", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips completed messages in order and ignores extra fields", () => {
    const storage = memoryStorage();
    saveAssistantConversation(
      [
        { id: "user-1", role: "user", text: " First question " },
        {
          id: "assistant-1",
          role: "assistant",
          text: "First **answer**.",
          signalIds: ["exp-boc", 12, "exp-boc"],
          phase: "loading",
          apiKey: "secret",
        },
        { id: "user-2", role: "user", text: "Second question" },
        { id: "assistant-2", role: "assistant", text: "Second answer." },
      ],
      storage,
    );

    expect(loadAssistantConversation(storage)).toEqual([
      { id: "user-1", role: "user", text: "First question" },
      { id: "assistant-1", role: "assistant", text: "First **answer**.", signalIds: ["exp-boc"] },
      { id: "user-2", role: "user", text: "Second question" },
      { id: "assistant-2", role: "assistant", text: "Second answer." },
    ]);
    const stored = JSON.parse(storage.dump().get(ASSISTANT_CONVERSATION_STORAGE_KEY));
    expect(stored.v).toBe(1);
    expect(JSON.stringify(stored)).not.toMatch(/apiKey|secret|loading/);
    expect(localStorage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY)).toBeNull();
  });

  it("rejects a bad version, corrupt JSON, and unsafe entries", () => {
    const storage = memoryStorage();
    storage.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, "{");
    expect(loadAssistantConversation(storage)).toEqual([]);

    storage.setItem(
      ASSISTANT_CONVERSATION_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        messages: [{ id: "user-1", role: "user", text: "Kept" }],
      }),
    );
    expect(loadAssistantConversation(storage)).toEqual([]);

    expect(
      sanitizeAssistantConversation([
        { id: "user-1", role: "user", text: "Kept" },
        { id: "x", role: "system", text: "nope" },
        { id: "user-2", role: "user", text: "   " },
        null,
      ]),
    ).toEqual([{ id: "user-1", role: "user", text: "Kept" }]);
  });

  it("continues when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadAssistantConversation(storage)).toEqual([]);
    expect(() => saveAssistantConversation([{ id: "user-1", role: "user", text: "Hi" }], storage)).not.toThrow();
  });

  it("reads the highest message sequence", () => {
    expect(highestAssistantMessageSeq([{ id: "user-2" }, { id: "assistant-7" }, { id: "note" }])).toBe(7);
  });
});
