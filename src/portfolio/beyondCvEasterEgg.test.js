/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { interpretAskResult } from "./assistantAsk.js";
import {
  BEYOND_CV_ACTION,
  BEYOND_CV_DESTINATION,
  detectInvitationLanguage,
  dismissBeyondCv,
  emptyBeyondCvSession,
  loadBeyondCvSession,
  offerBeyondCv,
  saveBeyondCvSession,
  unlockBeyondCv,
} from "./beyondCvEasterEgg.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

describe("Beyond CV invitation session", () => {
  it("detects Italian from the question and English otherwise", () => {
    expect(detectInvitationLanguage("Quali sono gli hobby di Lorenzo?")).toBe("it");
    expect(detectInvitationLanguage("Cosa piace fare a Lorenzo fuori dal lavoro?")).toBe("it");
    expect(detectInvitationLanguage("What are Lorenzo's hobbies?")).toBe("en");
    expect(detectInvitationLanguage("???")).toBe("en");
    expect(detectInvitationLanguage("???", "Gli interessi personali sono documentati.")).toBe("it");
  });

  it("offers once, then keeps dismissal and unlock", () => {
    const storage = memoryStorage();
    const offered = offerBeyondCv(emptyBeyondCvSession(), {
      question: "Quali sono gli interessi personali di Lorenzo?",
      answer: "Risposta.",
      anchorId: "assistant-1",
    });
    expect(offered).toEqual({ state: "offered", lang: "it", anchorId: "assistant-1" });
    saveBeyondCvSession(offered, storage);

    const again = offerBeyondCv(loadBeyondCvSession(storage), {
      question: "What are Lorenzo's hobbies?",
      answer: "English answer.",
      anchorId: "assistant-2",
    });
    expect(again.lang).toBe("it");
    expect(again.anchorId).toBe("assistant-1");

    const dismissed = dismissBeyondCv(again);
    expect(dismissed.state).toBe("dismissed");
    expect(offerBeyondCv(dismissed, { question: "hobbies", anchorId: "assistant-3" }).state).toBe("dismissed");
    expect(unlockBeyondCv(dismissed).state).toBe("dismissed");

    const unlocked = unlockBeyondCv(offered);
    expect(unlocked.state).toBe("unlocked");
    expect(unlockBeyondCv(unlocked).state).toBe("unlocked");
  });

  it("accepts only the allowlisted action token", () => {
    const base = {
      ok: true,
      answer: "A grounded answer.",
      evidence: [],
    };
    expect(interpretAskResult(200, { ...base, action: BEYOND_CV_ACTION }).action).toBe(BEYOND_CV_ACTION);
    expect(interpretAskResult(200, { ...base, action: "https://evil.example" }).action).toBeUndefined();
    expect(interpretAskResult(200, base).action).toBeUndefined();
    expect(BEYOND_CV_DESTINATION).toBe(
      "https://lorenzo-natali.github.io/professional-portfolio/?beyond=1",
    );
  });
});
