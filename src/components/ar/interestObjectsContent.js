/**
 * Production copy for Beyond the CV interest miniatures.
 * Keys match `INTEREST_OBJECTS` ids.
 */
export const INTEREST_OBJECT_CARDS = {
  robot: {
    title: "AI & Intelligent Systems",
    body: "Building intelligent systems is one of my main long-term interests, with a focus on trustworthy AI, governance and real-world applications.",
  },
  "evil-eye": {
    title: "Horror & Psychological Fiction",
    body: "Great horror explores uncertainty, human behavior and the unknown — themes that also inspire analytical thinking and risk exploration.",
  },
  book: {
    title: "Reading",
    body: "I enjoy books spanning technology, history, philosophy and speculative fiction, continuously expanding both technical knowledge and perspective.",
  },
  fossil: {
    title: "History",
    body: "History reveals how complex systems evolve over time, helping me better understand institutions, societies and decision-making.",
  },
  plant: {
    title: "Gardening",
    body: "Gardening teaches patience, observation and continuous improvement — small actions that produce meaningful long-term results.",
  },
  backpack: {
    title: "Travel",
    body: "Travelling exposes me to different cultures and ways of thinking, broadening the perspective I bring to both work and life.",
  },
};

/**
 * @param {string} id
 * @returns {{ title: string, body: string } | null}
 */
export function getInterestObjectCard(id) {
  return INTEREST_OBJECT_CARDS[id] ?? null;
}
