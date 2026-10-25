/**
 * Beyond CV invitation state for the current tab.
 * sessionStorage only. Never sent to the assistant API.
 *
 * The QR destination is the GitHub Pages project path verified from
 * docs/navigation-ux-refactor-plan.md and the analytics landing path.
 * Vite `base` is relative (`./`), so the deep link keeps `?beyond=1`.
 */

export const BEYOND_CV_ACTION = "beyond-cv";

export const BEYOND_CV_DESTINATION =
  "https://lorenzo-natali.github.io/professional-portfolio/?beyond=1";

export const BEYOND_CV_SESSION_KEY = "portfolio-assistant-beyond-cv-v1";

export const BEYOND_CV_COPY = Object.freeze({
  en: Object.freeze({
    title: "There's a little more to this portfolio than meets the eye.",
    body: "Would you like to take a closer look?",
    accept: "Show me",
    dismiss: "Maybe later",
    qr: "Have Lorenzo's CV nearby? Scan this QR code with your phone and see what happens.",
    launchText: "Have Lorenzo's CV nearby? Open the experience and point your camera at its first page.",
    launch: "Launch Beyond CV",
    qrAlt: "QR code to open the Beyond CV experience on a smartphone.",
  }),
  it: Object.freeze({
    title: "Questo portfolio nasconde qualcosa in più di ciò che si vede.",
    body: "Ti va di dare un'occhiata più da vicino?",
    accept: "Mostrami",
    dismiss: "Magari più tardi",
    qr: "Hai il CV di Lorenzo a portata di mano? Scansiona questo QR code con il telefono e scopri cosa succede.",
    launchText: "Hai il CV di Lorenzo a portata di mano? Apri l'esperienza e inquadra la prima pagina con la fotocamera.",
    launch: "Avvia Beyond CV",
    qrAlt: "Codice QR per aprire l'esperienza Beyond CV su uno smartphone.",
  }),
});

const ITALIAN_QUESTION = /\b(quali|quale|cosa|fuori|interessi|passioni|passione|piace|carriera|tempo|libero|sono|oltre|degli|della|nel|alla|sua|suo|gli|puoi|qualcosa|raccontami|curriculum)\b/gi;
const ENGLISH_QUESTION = /\b(what|who|how|does|are|his|beyond|outside|hobbies|hobby|interests|interest|free|enjoy|like|doing)\b/gi;

/**
 * @param {string} value
 * @param {RegExp} pattern
 */
function countMatches(value, pattern) {
  pattern.lastIndex = 0;
  return [...String(value || "").matchAll(pattern)].length;
}

/**
 * Question language wins. The answer is used only when the question has no signal.
 * @param {string} question
 * @param {string} [answer]
 * @returns {"en" | "it"}
 */
export function detectInvitationLanguage(question, answer = "") {
  const italianQ = countMatches(question, ITALIAN_QUESTION);
  const englishQ = countMatches(question, ENGLISH_QUESTION);
  if (italianQ > englishQ) return "it";
  if (englishQ > italianQ) return "en";
  if (countMatches(answer, ITALIAN_QUESTION) > countMatches(answer, ENGLISH_QUESTION)) return "it";
  return "en";
}

/**
 * @returns {{ state: "not_offered" }}
 */
export function emptyBeyondCvSession() {
  return { state: "not_offered" };
}

/**
 * @param {Storage | null | undefined} [storage]
 */
export function loadBeyondCvSession(storage = globalThis.sessionStorage) {
  try {
    if (!storage) return emptyBeyondCvSession();
    const raw = storage.getItem(BEYOND_CV_SESSION_KEY);
    if (!raw) return emptyBeyondCvSession();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return emptyBeyondCvSession();
    if (parsed.state !== "offered" && parsed.state !== "dismissed" && parsed.state !== "unlocked") {
      return emptyBeyondCvSession();
    }
    if (parsed.lang !== "en" && parsed.lang !== "it") return emptyBeyondCvSession();
    if (typeof parsed.anchorId !== "string" || !parsed.anchorId) return emptyBeyondCvSession();
    return {
      state: parsed.state,
      lang: parsed.lang,
      anchorId: parsed.anchorId,
    };
  } catch {
    return emptyBeyondCvSession();
  }
}

/**
 * @param {{ state: string, lang?: string, anchorId?: string }} session
 * @param {Storage | null | undefined} [storage]
 */
export function saveBeyondCvSession(session, storage = globalThis.sessionStorage) {
  try {
    if (!storage) return;
    if (!session || session.state === "not_offered") {
      storage.removeItem(BEYOND_CV_SESSION_KEY);
      return;
    }
    storage.setItem(
      BEYOND_CV_SESSION_KEY,
      JSON.stringify({
        v: 1,
        state: session.state,
        lang: session.lang === "it" ? "it" : "en",
        anchorId: String(session.anchorId || "").slice(0, 40),
      }),
    );
  } catch {
    // Private mode must not break the chat.
  }
}

/**
 * @param {{ state: string, lang?: string, anchorId?: string }} current
 * @param {{ question: string, answer?: string, anchorId: string }} offer
 */
export function offerBeyondCv(current, offer) {
  if (!current || current.state !== "not_offered") return current;
  return {
    state: "offered",
    lang: detectInvitationLanguage(offer.question, offer.answer),
    anchorId: offer.anchorId,
  };
}

/**
 * @param {{ state: string, lang?: string, anchorId?: string }} current
 */
export function dismissBeyondCv(current) {
  if (!current || current.state !== "offered") return current;
  return { ...current, state: "dismissed" };
}

/**
 * @param {{ state: string, lang?: string, anchorId?: string }} current
 */
export function unlockBeyondCv(current) {
  if (!current || current.state !== "offered") return current;
  return { ...current, state: "unlocked" };
}

/**
 * One card. Prefer the original answer. If that message was trimmed, use the latest assistant message.
 * @param {Array<{ id?: string, role?: string }>} messages
 * @param {{ state?: string, anchorId?: string } | null | undefined} session
 */
export function beyondCvAnchorId(messages, session) {
  if (!session || (session.state !== "offered" && session.state !== "unlocked")) return null;
  if (messages.some((message) => message.id === session.anchorId)) return session.anchorId;
  const latest = [...messages].reverse().find((message) => message.role === "assistant");
  return latest?.id || null;
}
