/**
 * Session-scoped AR status onboarding:
 * idle → detected ("CV detected") → prompt (discovery, remains until unmount)
 *
 * Temporary target loss must not restart the sequence.
 * A new ARCameraView mount creates a fresh controller (new session).
 */

export const AR_DISCOVERY_PROMPT_DELAY_MS = 1250;

export const AR_STATUS_COPY = {
  detected: "CV detected",
  promptTitle: "A few things I love beyond work",
  promptHint: "Tap an object to discover more",
};

/**
 * @typedef {"idle" | "detected" | "prompt"} ArStatusPhase
 *
 * @param {{
 *   delayMs?: number,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 * }} [options]
 */
export function createArStatusOnboarding(options = {}) {
  const delayMs = options.delayMs ?? AR_DISCOVERY_PROMPT_DELAY_MS;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  /** @type {ArStatusPhase} */
  let phase = "idle";
  let timer = 0;
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

  function clearTimer() {
    if (timer) {
      clearTimeoutFn(timer);
      timer = 0;
    }
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
      // Already running or prompted — never restart on reacquire.
      if (phase !== "idle") return;
      setPhase("detected");
      clearTimer();
      timer = setTimeoutFn(() => {
        timer = 0;
        if (phase === "detected") setPhase("prompt");
      }, delayMs);
    },

    onTargetLost() {
      // Intentionally no-op: keep current phase across temporary tracking gaps.
    },

    dispose() {
      clearTimer();
      listeners.clear();
    },
  };
}
