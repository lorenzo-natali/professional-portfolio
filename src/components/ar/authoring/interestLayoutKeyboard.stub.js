/**
 * Production stub for the authoring keyboard loader.
 * Must not contain editor UI strings, debug globals, or calibrate markers.
 * Wired via Vite resolve.alias in the public production config only.
 */
export function loadInterestLayoutKeyboard() {
  return { enabled: false, create: null };
}
