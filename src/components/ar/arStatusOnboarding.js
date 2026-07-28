/**
 * Tracking-responsive AR status:
 * searching → detected → prompt
 *
 * Brief MindAR target gaps (< loss grace) must not flicker the UI.
 * Confirmed loss returns to searching and cancels a pending prompt timer.
 * A new ARCameraView mount creates a fresh controller (new session).
 */

export const AR_DISCOVERY_PROMPT_DELAY_MS = 1250;
export const AR_TARGET_LOSS_GRACE_MS = 500;

export const AR_STATUS_COPY = {
  searching: "Point your camera at the first page of my CV",
  detected: "CV detected",
  promptTitle: "A few things I love beyond work",
  promptHint: "Tap an object to discover more",
  promptHintSecondary: "Drag to rotate",
};

/**
 * @typedef {"searching" | "detected" | "prompt"} ArStatusPhase
 *
 * @param {{
 *   delayMs?: number,
 *   lossGraceMs?: number,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 * }} [options]
 */
export function createArStatusOnboarding(options = {}) {
  const delayMs = options.delayMs ?? AR_DISCOVERY_PROMPT_DELAY_MS;
  const lossGraceMs = options.lossGraceMs ?? AR_TARGET_LOSS_GRACE_MS;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  /** @type {ArStatusPhase} */
  let phase = "searching";
  let promptTimer = 0;
  let lossTimer = 0;
  /** Target considered present for UI purposes (found, or within loss grace). */
  let targetPresent = false;
  /** @type {Set<(phase: ArStatusPhase) => void>} */
  const listeners = new Set();

  function emit() {
    listeners.forEach((listener) => listener(phase));
  }

  /** @param {ArStatusPhase} next */
  function setPhase(next) {
    if (phase === next) return;
    phase = next;
    emit();
  }

  function clearPromptTimer() {
    if (promptTimer) {
      clearTimeoutFn(promptTimer);
      promptTimer = 0;
    }
  }

  function clearLossTimer() {
    if (lossTimer) {
      clearTimeoutFn(lossTimer);
      lossTimer = 0;
    }
  }

  function clearAllTimers() {
    clearPromptTimer();
    clearLossTimer();
  }

  function startPromptTimer() {
    clearPromptTimer();
    promptTimer = setTimeoutFn(() => {
      promptTimer = 0;
      // Advance while target is still considered present (including loss-grace window).
      if (phase === "detected" && targetPresent) {
        setPhase("prompt");
      }
    }, delayMs);
  }

  return {
    /** @returns {ArStatusPhase} */
    getPhase: () => phase,

    /**
     * @param {(phase: ArStatusPhase) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      listeners.add(listener);
      listener(phase);
      return () => listeners.delete(listener);
    },

    onTargetFound() {
      clearLossTimer();
      const wasPresent = targetPresent;
      targetPresent = true;

      // Brief gap reacquire: keep the current visible phase (detected or prompt).
      if (wasPresent && (phase === "detected" || phase === "prompt")) {
        return;
      }

      // Fresh acquire from searching (or initial) — restart detected → prompt.
      setPhase("detected");
      startPromptTimer();
    },

    onTargetLost() {
      if (!targetPresent && !lossTimer) return;
      if (lossTimer) return;

      lossTimer = setTimeoutFn(() => {
        lossTimer = 0;
        targetPresent = false;
        clearPromptTimer();
        setPhase("searching");
      }, lossGraceMs);
    },

    dispose() {
      clearAllTimers();
      targetPresent = false;
      listeners.clear();
    },
  };
}
