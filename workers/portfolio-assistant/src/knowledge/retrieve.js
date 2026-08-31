/**
 * Deterministic retrieval V2 for Portfolio Assistant.
 * Exact token / phrase / alias matching — no arbitrary substring scoring.
 */

import {
  MAX_RETRIEVED_ITEMS,
  MIN_RETRIEVAL_SCORE,
} from "../constants.js";
import { knowledgeItems } from "./pack.js";

const STOPWORDS = new Set([
  // English
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "your",
  "you",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "why",
  "when",
  "where",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "about",
  "from",
  "into",
  "as",
  "at",
  "by",
  "it",
  "this",
  "that",
  "these",
  "those",
  "me",
  "my",
  "i",
  "we",
  "our",
  "please",
  "tell",
  "explain",
  "his",
  "her",
  "their",
  "them",
  "he",
  "she",
  "has",
  "have",
  "had",
  "using",
  "based",
  "might",
  "may",
  "also",
  "any",
  "some",
  "such",
  "than",
  "then",
  "too",
  "very",
  "just",
  "only",
  "into",
  "over",
  "after",
  "before",
  "between",
  "through",
  "during",
  "without",
  "within",
  "across",
  "make",
  "makes",
  "made",
  "like",
  "know",
  "known",
  // Italian
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "uno",
  "una",
  "di",
  "da",
  "in",
  "su",
  "per",
  "con",
  "che",
  "chi",
  "come",
  "cosa",
  "qual",
  "quale",
  "quali",
  "del",
  "della",
  "dei",
  "delle",
  "degli",
  "nel",
  "nella",
  "nei",
  "nelle",
  "nell",
  "al",
  "alla",
  "ai",
  "alle",
  "è",
  "e",
  "ed",
  "o",
  "ma",
  "se",
  "non",
  "mi",
  "ti",
  "si",
  "ci",
  "vi",
  "loro",
  "sua",
  "sue",
  "suo",
  "suoi",
  "ha",
  "hanno",
  "sono",
  "sei",
  "siamo",
  "avete",
  "essere",
  "avere",
  "fare",
  "fa",
  "più",
  "meno",
  "molto",
  "anche",
  "già",
  "ancora",
  "dove",
  "quando",
  "perché",
  "perche",
  "quanto",
  "quanti",
]);

/** Tokens shorter than 3 kept only if in this allowlist (acronyms). */
const SHORT_TOKEN_ALLOW = new Set([
  "ai",
  "it",
  "ict",
  "eu",
  "iso",
  "aml",
  "kyc",
  "raf",
  "pd",
  "lgd",
  "ecl",
  "bia",
  "bcp",
  "drp",
  "sox",
]);

/**
 * Phrase → concept id. Longer phrases matched first against normalized query.
 * @type {Array<{ phrase: string, concept: string }>}
 */
const PHRASE_ALIASES = [
  { phrase: "ruolo attuale", concept: "current_role" },
  { phrase: "lavoro attuale", concept: "current_role" },
  { phrase: "current role", concept: "current_role" },
  { phrase: "currently work", concept: "current_role" },
  { phrase: "currently works", concept: "current_role" },
  { phrase: "where does lorenzo currently", concept: "current_role" },
  { phrase: "esperienza professionale", concept: "experience" },
  { phrase: "professional experience", concept: "experience" },
  { phrase: "internal audit", concept: "internal_audit" },
  { phrase: "it audit", concept: "it_audit" },
  { phrase: "technology risk", concept: "technology_risk" },
  { phrase: "ict risk", concept: "technology_risk" },
  { phrase: "rischio tecnologico", concept: "technology_risk" },
  { phrase: "rischio ict", concept: "technology_risk" },
  { phrase: "information security", concept: "information_security" },
  { phrase: "security governance", concept: "information_security" },
  { phrase: "sicurezza informatica", concept: "information_security" },
  { phrase: "governance della sicurezza", concept: "information_security" },
  { phrase: "ai governance", concept: "ai_governance" },
  { phrase: "governance dell'ai", concept: "ai_governance" },
  { phrase: "governance dell ai", concept: "ai_governance" },
  { phrase: "governance ai", concept: "ai_governance" },
  { phrase: "eu ai act", concept: "eu_ai_act" },
  { phrase: "bank of china", concept: "bank_of_china" },
  { phrase: "banca profilo", concept: "banca_profilo" },
  { phrase: "cognitive behavior intelligence", concept: "project_cbi" },
  { phrase: "software development", concept: "software_dev" },
  { phrase: "software engineer", concept: "software_dev" },
  { phrase: "goldman sachs", concept: "unsupported_employer" },
  { phrase: "home address", concept: "private_info" },
  { phrase: "phone number", concept: "private_info" },
  { phrase: "bank account", concept: "private_info" },
  { phrase: "system prompt", concept: "injection" },
  { phrase: "environment variables", concept: "injection" },
  { phrase: "api key", concept: "injection" },
  { phrase: "ignore previous", concept: "injection" },
  { phrase: "ignore everything", concept: "injection" },
  { phrase: "career direction", concept: "career_narrative" },
  { phrase: "long-term goals", concept: "career_narrative" },
  { phrase: "long term goals", concept: "career_narrative" },
  { phrase: "long-term professional goals", concept: "career_narrative" },
  { phrase: "professional goals", concept: "career_narrative" },
  { phrase: "interested in ai governance", concept: "ai_gov_why" },
  { phrase: "useful for ai governance", concept: "ai_gov_why" },
  { phrase: "utile per l ai governance", concept: "ai_gov_why" },
  { phrase: "utile per lai governance", concept: "ai_gov_why" },
  { phrase: "banking professional", concept: "career_narrative" },
  { phrase: "technology-risk professional", concept: "career_narrative" },
  { phrase: "technology risk professional", concept: "career_narrative" },
  { phrase: "traditional it auditor", concept: "career_narrative" },
  { phrase: "profilo professionale", concept: "career_narrative" },
  { phrase: "settore bancario", concept: "career_narrative" },
  { phrase: "ti interessa l ai governance", concept: "ai_gov_why" },
  { phrase: "ti interessa lai governance", concept: "ai_gov_why" },
  { phrase: "ti interessa l'ai governance", concept: "ai_gov_why" },
  { phrase: "career goals", concept: "career_narrative" },
  { phrase: "career trajectory", concept: "career_narrative" },
  { phrase: "career path", concept: "career_narrative" },
  { phrase: "future direction", concept: "career_narrative" },
  { phrase: "next step", concept: "career_narrative" },
  { phrase: "professional evolution", concept: "career_narrative" },
  { phrase: "common thread", concept: "career_narrative" },
  { phrase: "professional positioning", concept: "career_narrative" },
  { phrase: "hybrid profile", concept: "career_narrative" },
  { phrase: "outside banking", concept: "cross_sector" },
  { phrase: "other industries", concept: "cross_sector" },
  { phrase: "other sectors", concept: "cross_sector" },
  { phrase: "why ai governance", concept: "ai_gov_why" },
  { phrase: "why governance", concept: "career_narrative" },
  { phrase: "why audit", concept: "audit_why" },
  { phrase: "from audit", concept: "audit_why" },
  { phrase: "into governance", concept: "career_narrative" },
  { phrase: "direzione professionale", concept: "career_narrative" },
  { phrase: "obiettivi di carriera", concept: "career_narrative" },
  { phrase: "obiettivi a lungo termine", concept: "career_narrative" },
  { phrase: "percorso professionale", concept: "career_narrative" },
  { phrase: "evoluzione professionale", concept: "career_narrative" },
  { phrase: "prossimo passo", concept: "career_narrative" },
  { phrase: "filo conduttore", concept: "career_narrative" },
  { phrase: "profilo ibrido", concept: "career_narrative" },
  { phrase: "fuori dal settore bancario", concept: "cross_sector" },
  { phrase: "altri settori", concept: "cross_sector" },
  { phrase: "perche ai governance", concept: "ai_gov_why" },
  { phrase: "perche governance", concept: "career_narrative" },
  { phrase: "perche audit", concept: "audit_why" },
  { phrase: "perche vuoi passare", concept: "career_narrative" },
  { phrase: "dove vuoi arrivare", concept: "career_narrative" },
  { phrase: "come ti stai preparando", concept: "development_strategy" },
  { phrase: "how are you preparing", concept: "development_strategy" },
  { phrase: "logical next step", concept: "career_narrative" },
  { phrase: "career heading", concept: "career_narrative" },
  { phrase: "where is your career", concept: "career_narrative" },
  { phrase: "are you lorenzo", concept: "identity_probe" },
  { phrase: "talking to lorenzo", concept: "identity_probe" },
  { phrase: "pretend you are lorenzo", concept: "injection" },
  { phrase: "answer as lorenzo", concept: "injection" },
  { phrase: "unrestricted first person", concept: "injection" },
];

/** Single-token / short alias → concept */
const TOKEN_ALIASES = {
  current: "current_role",
  currently: "current_role",
  present: "current_role",
  now: "current_role",
  attualmente: "current_role",
  attuale: "current_role",
  experience: "experience",
  experiences: "experience",
  esperienza: "experience",
  esperienze: "experience",
  audit: "audit",
  auditing: "audit",
  risk: "risk",
  risks: "risk",
  rischio: "risk",
  rischi: "risk",
  banking: "banking",
  bank: "banking",
  banks: "banking",
  banca: "banking",
  bancario: "banking",
  bancaria: "banking",
  certification: "certification",
  certifications: "certification",
  certified: "certification",
  certificazione: "certification",
  certificazioni: "certification",
  certificato: "certification",
  certificata: "certification",
  credential: "certification",
  credentials: "certification",
  project: "project",
  projects: "project",
  progetto: "project",
  progetti: "project",
  built: "project",
  sviluppato: "project",
  sviluppata: "project",
  education: "education",
  study: "education",
  studies: "education",
  studied: "education",
  training: "education",
  formazione: "education",
  studi: "education",
  master: "education",
  masters: "education",
  degree: "education",
  relocation: "mobility",
  relocate: "mobility",
  abroad: "mobility",
  trasferimento: "mobility",
  trasferirsi: "mobility",
  estero: "mobility",
  mobility: "mobility",
  languages: "language",
  language: "language",
  lingue: "language",
  lingua: "language",
  profile: "profile",
  background: "profile",
  summarize: "profile",
  summary: "profile",
  cisa: "cisa",
  crisc: "crisc",
  aair: "aair",
  frm: "frm",
  dora: "dora",
  nis2: "nis2",
  cobit: "cobit",
  nist: "nist",
  codeiak: "codeiak",
  ciso: "unsupported_title",
  salary: "private_info",
  iban: "private_info",
  password: "private_info",
  passwords: "private_info",
  secrets: "injection",
  lorenzo: "person_name",
  natali: "person_name",
  pharma: "cross_sector",
  pharmaceutical: "cross_sector",
  farmaceutico: "cross_sector",
  trajectory: "career_narrative",
  heading: "career_narrative",
  differentiates: "career_narrative",
  differentiate: "career_narrative",
  motivation: "psychology",
  personality: "psychology",
  ambitious: "psychology",
  stress: "psychology",
};

/** Concept → keyword/token boosts against item keyword+text tokens */
const CONCEPT_MATCH_TERMS = {
  current_role: ["current", "currently", "present", "ruolo attuale", "attualmente", "banca profilo"],
  experience: ["experience", "esperienza", "role", "employment"],
  internal_audit: ["internal audit", "audit"],
  it_audit: ["it audit", "audit"],
  audit: ["audit", "internal audit", "it audit"],
  technology_risk: ["technology", "ict", "technology risk", "ict risk", "rischio tecnologico"],
  risk: ["risk", "rischio"],
  information_security: [
    "information security",
    "security",
    "sicurezza",
    "iso",
    "nist",
    "cobit",
  ],
  ai_governance: ["ai governance", "ai", "governance"],
  eu_ai_act: ["eu ai act", "ai act", "ai"],
  banking: ["banking", "bank", "banca", "bancario"],
  certification: ["certification", "credential", "certificazione", "certificato", "cisa"],
  project: ["project", "progetto", "codeiak", "cognitive"],
  education: ["education", "degree", "master", "university", "formazione", "study"],
  mobility: ["mobility", "relocation", "abroad", "estero", "trasferimento"],
  language: ["language", "languages", "lingue", "italian", "english", "french", "mandarin", "chinese"],
  profile: ["profile", "positioning", "background"],
  cisa: ["cisa"],
  crisc: ["crisc"],
  aair: ["aair"],
  frm: ["frm"],
  dora: ["dora"],
  nis2: ["nis2"],
  cobit: ["cobit"],
  nist: ["nist"],
  codeiak: ["codeiak"],
  bank_of_china: ["bank of china", "china", "boc", "中国银行"],
  banca_profilo: ["banca profilo", "profilo"],
  project_cbi: ["cognitive", "behavior", "intelligence", "cbi"],
  software_dev: ["software", "development", "coding", "codeiak", "agent"],
  career_narrative: [
    "career direction",
    "long-term",
    "trajectory",
    "governance",
    "professional narrative",
    "direzione",
    "obiettivi",
    "percorso",
  ],
  cross_sector: ["outside banking", "pharma", "pharmaceutical", "big tech", "altri settori", "farmaceutico"],
  ai_gov_why: ["ai governance", "rationale", "intersection", "technology", "risk", "controls"],
  audit_why: ["audit foundation", "controls", "governance", "it audit", "internal audit"],
  development_strategy: ["preparing", "transition", "certification", "cisa", "project", "development strategy"],
};

/**
 * @param {string} text
 */
export function normalizeQuery(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fff\s/+_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return normalizeQuery(text)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (!t || STOPWORDS.has(t)) return false;
      if (t.length >= 3) return true;
      return SHORT_TOKEN_ALLOW.has(t);
    });
}

/**
 * @param {string} question
 * @returns {{ tokens: string[], concepts: string[], phrases: string[], normalized: string }}
 */
export function analyzeQuery(question) {
  const normalized = normalizeQuery(question);
  const tokens = tokenize(question);
  /** @type {Set<string>} */
  const concepts = new Set();
  /** @type {string[]} */
  const phrases = [];

  const sorted = [...PHRASE_ALIASES].sort((a, b) => b.phrase.length - a.phrase.length);
  let cursor = normalized;
  for (const { phrase, concept } of sorted) {
    if (cursor.includes(phrase)) {
      concepts.add(concept);
      phrases.push(phrase);
    }
  }
  for (const token of tokens) {
    const mapped = TOKEN_ALIASES[token];
    if (mapped) concepts.add(mapped);
  }
  return { tokens, concepts: [...concepts], phrases, normalized };
}

/**
 * @param {string} question
 * @param {{ tokens: string[], concepts: string[], normalized: string }} analysis
 */
export function classifyIntent(question, analysis = analyzeQuery(question)) {
  const { concepts, normalized, tokens } = analysis;
  const c = new Set(concepts);

  if (c.has("private_info") || /\b(salary|iban|password|ssn|codice fiscale|date of birth|dob|phone|home address|bank account)\b/.test(normalized)) {
    return "unsupported_private_information";
  }
  if (c.has("psychology") || c.has("identity_probe")) {
    return "unknown";
  }
  if (c.has("unsupported_employer") || c.has("unsupported_title")) {
    return "unknown";
  }
  if (
    c.has("career_narrative") ||
    c.has("cross_sector") ||
    c.has("ai_gov_why") ||
    c.has("audit_why") ||
    c.has("development_strategy") ||
    /\b(career (direction|heading|goals?|path|trajectory)|long[- ]term|professional goals?|next step|common thread|hybrid profile|outside banking|other industr|other sector|why (ai )?governance|why audit|interested in ai|useful for ai|preparing for|logical next|banking professional|technology[- ]risk professional|traditional it auditor|direzione professionale|obiettivi|filo conduttore|profilo (ibrido|professionale)|altri settori|settore bancario|perche|dove vuoi arrivare|come definiresti|vuoi rimanere|ti interessano|ti interessa)\b/.test(
      normalized,
    )
  ) {
    return "career_narrative";
  }
  if (
    c.has("certification") ||
    c.has("cisa") ||
    c.has("crisc") ||
    c.has("aair") ||
    c.has("frm") ||
    /\b(certif|cisa|crisc|aair|frm)\b/.test(normalized)
  ) {
    return "certification";
  }
  if (
    c.has("current_role") ||
    /\b(current role|currently work|ruolo attuale|lavoro attuale|attualmente)\b/.test(normalized) ||
    (/\bcurrently\b/.test(normalized) && /\b(role|work|works|employer|job)\b/.test(normalized))
  ) {
    return "current_role";
  }
  if (c.has("language") || /\b(languages?|lingue|lingua)\b/.test(normalized)) {
    return "language";
  }
  if (c.has("mobility") || /\b(relocation|relocate|abroad|estero|trasferimento)\b/.test(normalized)) {
    return "mobility";
  }
  if (
    c.has("project") ||
    c.has("codeiak") ||
    c.has("project_cbi") ||
    c.has("software_dev") ||
    /\b(codeiak|cognitive behavior|progetto|projects?)\b/.test(normalized)
  ) {
    return "project";
  }
  if (c.has("education") || /\b(stud|degree|master|education|formazione|universit)\b/.test(normalized)) {
    return "education";
  }
  if (
    c.has("dora") ||
    c.has("nis2") ||
    c.has("eu_ai_act") ||
    c.has("cobit") ||
    c.has("nist") ||
    /\b(dora|nis2|ai act|basel|ifrs)\b/.test(normalized)
  ) {
    return "regulatory";
  }
  if (
    /\b(suitable|relevant|strongest|fit|why might|transferable|orientation)\b/.test(normalized) ||
    /\b(adatto|rilevante|punti di forza)\b/.test(normalized)
  ) {
    return "role_fit";
  }
  // Audit/banking experience questions should surface employment before abstract lenses.
  if (
    (c.has("experience") || /\b(experience|esperienza)\b/.test(normalized)) &&
    (c.has("audit") ||
      c.has("internal_audit") ||
      c.has("it_audit") ||
      c.has("banking") ||
      c.has("bank_of_china") ||
      c.has("banca_profilo"))
  ) {
    return "professional_experience";
  }
  if (
    c.has("ai_governance") ||
    c.has("information_security") ||
    c.has("technology_risk") ||
    c.has("audit") ||
    c.has("internal_audit") ||
    c.has("it_audit") ||
    c.has("risk")
  ) {
    return "skill_or_capability";
  }
  if (c.has("bank_of_china") || /\b(bank of china|prelios|toplife|past|previous|did .+ do)\b/.test(normalized)) {
    return "past_experience";
  }
  if (c.has("experience") || c.has("banking") || c.has("banca_profilo")) {
    return "professional_experience";
  }
  if (c.has("profile") || /\b(summarize|profile|background|about lorenzo)\b/.test(normalized)) {
    return "profile_summary";
  }
  if (tokens.length <= 1 && c.has("person_name")) {
    return "unknown";
  }
  return "unknown";
}

/**
 * @param {string[]} tokens
 * @param {string} blob
 */
function countExactTokenHits(tokens, blob) {
  const set = new Set(blob.split(/\s+/).filter(Boolean));
  let n = 0;
  for (const t of tokens) {
    if (set.has(t)) n += 1;
  }
  return n;
}

/**
 * @param {object} item
 * @param {{ tokens: string[], concepts: string[], phrases: string[] }} analysis
 * @param {string} intent
 */
function scoreItem(item, analysis, intent) {
  const { tokens, concepts, phrases } = analysis;
  if (!tokens.length && !concepts.length && !phrases.length) return 0;

  const kwNorm = normalizeQuery((item.keywords || []).join(" "));
  const textNorm = normalizeQuery(item.text || "");
  const kwTokens = new Set(tokenize(kwNorm));
  const textTokens = new Set(tokenize(textNorm));
  const claimType = item.claimType || "";

  let score = 0;

  // Exact token ↔ keyword token
  for (const t of tokens) {
    if (kwTokens.has(t)) score += 3;
    else if (textTokens.has(t)) score += 1.25;
  }

  // Phrase boost when phrase appears in keywords or text
  for (const phrase of phrases) {
    if (kwNorm.includes(phrase) || textNorm.includes(phrase)) score += 4;
  }

  // Concept → known terms exact-ish presence
  for (const concept of concepts) {
    if (concept === "person_name" || concept === "injection" || concept === "private_info") continue;
    if (concept === "unsupported_employer" || concept === "unsupported_title") continue;
    const terms = CONCEPT_MATCH_TERMS[concept] || [];
    for (const term of terms) {
      const tn = normalizeQuery(term);
      if (!tn) continue;
      if (kwNorm.includes(tn) || textNorm.includes(tn)) {
        score += tn.includes(" ") ? 3.5 : 2;
        break;
      }
      const parts = tokenize(tn);
      if (parts.length && parts.every((p) => kwTokens.has(p) || textTokens.has(p))) {
        score += 2;
        break;
      }
    }
  }

  // Intent / claim-type ranking (not answer generation)
  score += intentClaimBoost(intent, claimType, item);

  if (
    intent === "certification" &&
    claimType === "credential_in_progress" &&
    /\b(pursuing|preparing|in progress|exam planned)\b/.test(analysis.normalized || "")
  ) {
    score += 4;
  }

  // Light id/domain exact boosts
  if (concepts.includes("codeiak") && item.id === "project-codeiak") score += 6;
  if (concepts.includes("project_cbi") && item.id === "project-ai-audit-workflow") score += 6;
  if (concepts.includes("cisa") && item.id === "credential-cisa") score += 5;
  if (concepts.includes("bank_of_china") && item.id === "experience-boc") score += 6;
  if (concepts.includes("banca_profilo") && item.id === "experience-banca-profilo") score += 6;
  if (concepts.includes("dora") && (textNorm.includes("dora") || kwNorm.includes("dora"))) score += 4;
  if (concepts.includes("nis2") && (textNorm.includes("nis2") || kwNorm.includes("nis2"))) score += 4;

  // Demote timeline/journey when stronger employment evidence exists for experience intents
  if (
    (intent === "current_role" ||
      intent === "past_experience" ||
      intent === "professional_experience") &&
    claimType === "timeline_context"
  ) {
    score -= 2;
  }

  void countExactTokenHits;
  return score;
}

/**
 * @param {string} intent
 * @param {string} claimType
 * @param {object} item
 */
function intentClaimBoost(intent, claimType, item) {
  let boost = 0;
  switch (intent) {
    case "current_role":
      if (claimType === "employment_current") boost += 10;
      else if (claimType === "profile") boost += 6;
      else if (claimType === "employment_past") boost -= 8;
      else if (claimType === "timeline_context") boost -= 4;
      else boost -= 2;
      break;
    case "past_experience":
      if (claimType === "employment_past") boost += 8;
      else if (claimType === "timeline_context" && /boc|china|prelios|toplife/i.test(item.id))
        boost += 3;
      else if (claimType === "employment_current") boost += 1;
      break;
    case "professional_experience":
      if (claimType === "employment_current" || claimType === "employment_past") boost += 6;
      else if (claimType === "capability_demonstrated") boost += 3;
      else if (claimType === "project_personal") boost -= 3;
      break;
    case "certification":
      if (
        claimType === "credential_in_progress" ||
        claimType === "credential_planned" ||
        claimType === "credential_completed"
      ) {
        boost += 8;
      } else if (claimType === "timeline_context" && /cisa/i.test(item.id)) boost += 2;
      else boost -= 1;
      break;
    case "project":
      if (claimType === "project_personal") boost += 10;
      else if (claimType === "employment_current" || claimType === "employment_past") boost -= 6;
      else if (claimType === "skill") boost += 1;
      break;
    case "education":
      if (claimType === "education") boost += 8;
      else if (claimType === "training") boost += 3;
      break;
    case "mobility":
      if (claimType === "mobility") boost += 10;
      else if (claimType === "language") boost += 2;
      else boost -= 3;
      break;
    case "language":
      if (claimType === "language") boost += 10;
      else if (claimType === "education" && /language/i.test(item.id)) boost += 4;
      else if (claimType === "profile") boost -= 2;
      break;
    case "regulatory":
      if (
        claimType === "regulatory_knowledge" ||
        claimType === "capability_demonstrated" ||
        claimType === "capability_developing" ||
        claimType === "employment_past" ||
        claimType === "skill"
      ) {
        boost += 5;
      }
      break;
    case "skill_or_capability":
      if (
        claimType === "capability_demonstrated" ||
        claimType === "capability_developing" ||
        claimType === "career_direction" ||
        claimType === "regulatory_knowledge" ||
        claimType === "skill"
      ) {
        boost += 5;
      }
      if (claimType === "employment_past" || claimType === "employment_current") boost += 2;
      if (claimType === "project_personal") boost += 2;
      break;
    case "role_fit":
      if (
        claimType === "career_direction" ||
        claimType === "capability_demonstrated" ||
        claimType === "capability_developing" ||
        claimType === "profile" ||
        claimType === "employment_current" ||
        claimType === "employment_past"
      ) {
        boost += 4;
      }
      break;
    case "career_narrative":
      if (claimType === "career_direction") boost += 12;
      else if (item.narrativeType) boost += 4;
      else if (
        claimType === "employment_current" ||
        claimType === "employment_past" ||
        claimType === "capability_demonstrated" ||
        claimType === "capability_developing" ||
        claimType === "project_personal" ||
        claimType === "credential_in_progress" ||
        claimType === "education"
      ) {
        boost += 3;
      } else if (claimType === "timeline_context" || claimType === "role_lens") {
        boost -= 2;
      }
      // Prefer authorized professional_narrative topic over radar/role-lens direction text.
      if (item.topic === "professional_narrative") boost += 6;
      break;
    case "profile_summary":
      if (claimType === "profile") boost += 8;
      if (claimType === "employment_current") boost += 5;
      if (claimType === "language") boost += 2;
      break;
    default:
      break;
  }
  return boost;
}

/**
 * @param {string} question
 * @param {{ limit?: number, minScore?: number, items?: typeof knowledgeItems }} [options]
 */
export function retrieveKnowledge(question, options = {}) {
  const limit = options.limit ?? MAX_RETRIEVED_ITEMS;
  const minScore = options.minScore ?? MIN_RETRIEVAL_SCORE;
  const corpus = options.items ?? knowledgeItems;
  const analysis = analyzeQuery(question);
  const intent = classifyIntent(question, analysis);

  const ranked = corpus
    .map((item) => {
      const score = scoreItem(item, analysis, intent);
      return {
        id: item.id,
        topic: item.topic,
        claimType: item.claimType,
        text: item.text,
        ...(item.employer ? { employer: item.employer } : {}),
        ...(item.status ? { status: item.status } : {}),
        ...(item.domain ? { domain: item.domain } : {}),
        ...(item.narrativeType ? { narrativeType: item.narrativeType } : {}),
        ...(item.signalIds ? { signalIds: item.signalIds } : {}),
        score,
        intent,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Current-role: hard prefer employment_current then profile over past
      if (intent === "current_role") {
        const rank = (ct) =>
          ct === "employment_current" ? 0 : ct === "profile" ? 1 : ct === "employment_past" ? 9 : 5;
        const d = rank(a.claimType) - rank(b.claimType);
        if (d !== 0) return d;
      }
      return a.id.localeCompare(b.id);
    });

  // Career narrative: keep room for supporting facts (avoid 6× narrative-only saturation).
  if (intent === "career_narrative") {
    const maxNarrative = Math.min(4, limit);
    const supportRank = (item) => {
      if (item.topic === "professional_narrative") return 0;
      const order = {
        employment_current: 1,
        employment_past: 2,
        capability_demonstrated: 3,
        capability_developing: 4,
        project_personal: 5,
        credential_in_progress: 6,
        education: 7,
        profile: 8,
      };
      return order[item.claimType] ?? 20;
    };
    const narratives = ranked
      .filter((i) => i.topic === "professional_narrative")
      .slice(0, maxNarrative);
    const support = ranked
      .filter((i) => i.topic !== "professional_narrative")
      .sort((a, b) => {
        const d = supportRank(a) - supportRank(b);
        if (d !== 0) return d;
        if (b.score !== a.score) return b.score - a.score;
        return a.id.localeCompare(b.id);
      });
    const selected = [...narratives];
    for (const item of support) {
      if (selected.length >= limit) break;
      selected.push(item);
    }
    return selected.slice(0, limit);
  }

  return ranked.slice(0, limit);
}

export { STOPWORDS, PHRASE_ALIASES, TOKEN_ALIASES };
