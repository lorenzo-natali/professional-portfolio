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

/** Same public profile used by the homepage “Request CV” LinkedIn action. */
export const BEYOND_CV_LINKEDIN_URL = "https://www.linkedin.com/in/natalilorenzo/";

export const BEYOND_CV_COPY = Object.freeze({
  en: Object.freeze({
    invite:
      "You asked about the person behind the professional profile. There's a more personal side to discover, beyond the CV. Would you like to explore it?",
    accept: "Show me",
    dismiss: "Maybe later",
    unlocked:
      "Discover five objects that reveal some of my interests and passions beyond work. You'll need the first page of my CV to bring them to life. Don't have a copy? You can request one directly from me.",
    qr: "Discover five objects that reveal some of my interests and passions beyond work. Scan the QR code with your phone to explore the experience. You'll need the first page of my CV. Don't have a copy? You can request one directly from me.",
    requestLink: "request one directly from me",
    launch: "Explore Beyond the CV",
    qrAlt: "QR code to open Beyond the CV on a smartphone.",
  }),
  it: Object.freeze({
    invite:
      "La tua domanda va oltre il profilo professionale. C'è un lato più personale da scoprire, oltre il CV. Ti va di esplorarlo?",
    accept: "Mostrami",
    dismiss: "Magari più tardi",
    unlocked:
      "Scopri cinque oggetti che raccontano alcuni dei miei interessi e delle mie passioni al di fuori del lavoro. Ti servirà la prima pagina del mio CV per dar loro vita. Non ne hai una copia? Puoi richiedermela direttamente.",
    qr: "Scopri cinque oggetti che raccontano alcuni dei miei interessi e delle mie passioni al di fuori del lavoro. Scansiona il QR code con il telefono per esplorare l'esperienza. Ti servirà la prima pagina del mio CV. Non ne hai una copia? Puoi richiedermela direttamente.",
    requestLink: "richiedermela direttamente",
    launch: "Esplora Beyond the CV",
    qrAlt: "Codice QR per aprire Beyond the CV su uno smartphone.",
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
