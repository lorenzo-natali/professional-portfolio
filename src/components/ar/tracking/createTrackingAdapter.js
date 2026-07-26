/**
 * Lightweight tracking contract.
 * UI / business logic must depend only on this shape — never on MindAR APIs.
 *
 * @typedef {object} TrackingCallbacks
 * @property {() => void} [onReady]
 * @property {() => void} [onTargetFound]
 * @property {() => void} [onTargetLost]
 * @property {(error: Error) => void} [onError]
 * @property {(reason: string) => void} [onUnsupported]
 *
 * @typedef {object} TrackingAdapter
 * @property {(container: HTMLElement, callbacks: TrackingCallbacks) => Promise<void>} start
 * @property {() => Promise<void>} stop
 * @property {() => boolean} isRunning
 */

export const TRACKING_EVENTS = {
  READY: "ready",
  TARGET_FOUND: "targetFound",
  TARGET_LOST: "targetLost",
  ERROR: "error",
  UNSUPPORTED: "unsupported",
};
