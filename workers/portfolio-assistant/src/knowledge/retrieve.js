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
  { phrase: "professional direction", concept: "career_narrative" },
  { phrase: "technology risk manager", concept: "role_boundary" },
  { phrase: "ict risk manager", concept: "role_boundary" },
  { phrase: "incident management", concept: "ict_incident" },
  { phrase: "ict incident", concept: "ict_incident" },
  { phrase: "incidenti ict", concept: "ict_incident" },
  { phrase: "gestione degli incidenti", concept: "ict_incident" },
  { phrase: "change management", concept: "ict_change" },
  { phrase: "ict change", concept: "ict_change" },
  { phrase: "cambiamenti ict", concept: "ict_change" },
  { phrase: "gestione dei cambiamenti", concept: "ict_change" },
  { phrase: "ict outsourcing", concept: "ict_outsourcing" },
  { phrase: "esternalizzazione ict", concept: "ict_outsourcing" },
  { phrase: "third-party ict", concept: "third_party" },
  { phrase: "third party ict", concept: "third_party" },
  { phrase: "third-party", concept: "third_party" },
  { phrase: "terze parti", concept: "third_party" },
  { phrase: "rischio di terze parti", concept: "third_party" },
  { phrase: "fornitori terzi", concept: "third_party" },
  { phrase: "ai policy", concept: "ai_policy" },
  { phrase: "policy ai", concept: "ai_policy" },
  { phrase: "politica ai", concept: "ai_policy" },
  { phrase: "operational resilience", concept: "operational_resilience" },
  { phrase: "resilienza operativa", concept: "operational_resilience" },
  { phrase: "audit informatico", concept: "it_audit" },
  { phrase: "regolamento dora", concept: "dora" },
  { phrase: "certificazione in corso", concept: "certification" },
  { phrase: "obiettivi professionali", concept: "future_aspirations" },
  { phrase: "future aspirations", concept: "future_aspirations" },
  { phrase: "long-term career", concept: "future_aspirations" },
  { phrase: "long term career", concept: "future_aspirations" },
  { phrase: "career choices", concept: "career_choices" },
  { phrase: "professional motivations", concept: "career_choices" },
  { phrase: "professional motivation", concept: "career_choices" },
  { phrase: "academic choices", concept: "academic_motivation" },
  { phrase: "academic path", concept: "academic_motivation" },
  { phrase: "scelte accademiche", concept: "academic_motivation" },
  { phrase: "percorso accademico", concept: "academic_motivation" },
  { phrase: "ha motivato", concept: "academic_motivation" },
  { phrase: "choose internal audit", concept: "audit_choice" },
  { phrase: "why did lorenzo choose", concept: "audit_choice" },
  { phrase: "why did he choose", concept: "audit_choice" },
  { phrase: "perche ha scelto", concept: "audit_choice" },
  { phrase: "perche lorenzo ha scelto", concept: "audit_choice" },
  { phrase: "scelto l internal audit", concept: "audit_choice" },
  { phrase: "scelto l'internal audit", concept: "audit_choice" },
  { phrase: "learn a new", concept: "learning_method" },
  { phrase: "learning approach", concept: "learning_method" },
  { phrase: "learning method", concept: "learning_method" },
  { phrase: "come affronta", concept: "learning_method" },
  { phrase: "apprendimento di una nuova", concept: "learning_method" },
  { phrase: "metodo di apprendimento", concept: "learning_method" },
  { phrase: "interested in technology", concept: "technical_interest" },
  { phrase: "interest in technology", concept: "technical_interest" },
  { phrase: "interessato alla tecnologia", concept: "technical_interest" },
  { phrase: "agenti ai", concept: "technical_interest" },
  { phrase: "esperienza pratica con", concept: "technical_interest" },
  { phrase: "professional strengths", concept: "skills" },
  { phrase: "punti di forza", concept: "skills" },
  { phrase: "ai policy audit", concept: "ai_policy_audit" },
  { phrase: "audit sulla policy", concept: "ai_policy_audit" },
  { phrase: "audit of the ai policy", concept: "ai_policy_audit" },
  { phrase: "connections between", concept: "experience_connections" },
  { phrase: "what connects", concept: "experience_connections" },
  { phrase: "different professional experiences", concept: "experience_connections" },
  { phrase: "transferable capabilities", concept: "transferable" },
  { phrase: "transferable skills", concept: "transferable" },
  { phrase: "competenze professionali", concept: "skills" },
  { phrase: "professional skills", concept: "skills" },
  { phrase: "professional competencies", concept: "skills" },
  { phrase: "technology interests", concept: "technology_risk" },
  { phrase: "professional development", concept: "development_strategy" },
  { phrase: "development plans", concept: "development_strategy" },
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
  competenze: "skills",
  competenza: "skills",
  skills: "skills",
  skill: "skills",
  competencies: "skills",
  competency: "skills",
  lorenzo: "person_name",
  natali: "person_name",
  pharma: "cross_sector",
  pharmaceutical: "cross_sector",
  farmaceutico: "cross_sector",
  trajectory: "career_narrative",
  heading: "career_narrative",
  differentiates: "career_narrative",
  differentiate: "career_narrative",
  distinctive: "distinctive_profile",
  personality: "psychology",
  ambitious: "psychology",
  stress: "psychology",
  consulting: "cross_sector",
  consulenza: "cross_sector",
  cursor: "technical_interest",
  cline: "technical_interest",
  rag: "technical_interest",
  llm: "technical_interest",
  llms: "technical_interest",
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
  ict_incident: ["incident management", "incident"],
  ict_change: ["change management", "ict change"],
  ict_outsourcing: ["outsourcing", "ict outsourcing"],
  third_party: ["third-party", "third party", "outsourcing"],
  ai_policy: ["ai policy"],
  operational_resilience: ["operational resilience"],
  role_boundary: ["not a role already held", "career direction"],
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
  cross_sector: ["outside banking", "pharma", "pharmaceutical", "big tech", "altri settori", "farmaceutico", "consulting", "consulenza"],
  academic_motivation: ["academic path", "academic choices", "scelte accademiche", "international cooperation", "financial sciences", "sustainability reporting"],
  audit_choice: ["why internal audit", "choose internal audit", "prelios", "preferred direction"],
  learning_method: ["learning approach", "learning method", "apprendimento", "prototypes"],
  technical_interest: ["cursor", "cline", "rag", "personal projects", "codeiak", "local-first"],
  ai_policy_audit: ["ai policy", "dedicated internal audit", "dedicated audit engagement"],
  ai_gov_why: ["ai governance", "rationale", "intersection", "technology", "risk", "controls"],
  audit_why: ["audit foundation", "controls", "governance", "it audit", "internal audit"],
  development_strategy: ["preparing", "transition", "certification", "cisa", "project", "development strategy"],
  future_aspirations: ["longer-term", "long-term", "trajectory", "aspirations"],
  career_choices: ["career direction", "rationale", "motivation", "interest"],
  experience_connections: ["common thread", "common-thread", "foundation", "trajectory"],
  distinctive_profile: ["differentiator", "hybrid", "intersection", "positioning"],
  transferable: ["transferable", "capability", "capabilities", "skill"],
  skills: ["skills", "skill", "capability", "capabilities", "competencies", "competency"],
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
 * Narrow Italian/English equivalents. Values are English pack tokens, not broad concepts.
 * Generic words such as "gestione" are intentionally absent.
 */
const TOKEN_EXPANSIONS = {
  incidenti: ["incident"],
  incidente: ["incident"],
  incidents: ["incident"],
  cambiamenti: ["change"],
  cambiamento: ["change"],
  esternalizzazione: ["outsourcing"],
  verifiche: ["audit"],
  verifica: ["audit"],
  verificato: ["audit"],
  verificati: ["audit"],
  verificata: ["audit"],
  verificate: ["audit"],
  svolto: ["performed"],
  svolte: ["performed"],
  svolta: ["performed"],
  proprietario: ["ownership"],
  responsabile: ["ownership"],
  own: ["ownership"],
  owned: ["ownership"],
};

/**
 * @param {string[]} tokens
 */
function expandTokens(tokens) {
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  const add = (token) => {
    if (!token || STOPWORDS.has(token) || seen.has(token)) return;
    if (token.length < 3 && !SHORT_TOKEN_ALLOW.has(token)) return;
    seen.add(token);
    out.push(token);
  };
  for (const token of tokens) {
    add(token);
    if (token.includes("-")) {
      for (const part of token.split("-")) add(part);
    }
    const extras = TOKEN_EXPANSIONS[token];
    if (extras) {
      for (const extra of extras) add(extra);
    }
  }
  return out;
}

/**
 * @param {string} question
 * @returns {{ tokens: string[], concepts: string[], phrases: string[], normalized: string }}
 */
export function analyzeQuery(question) {
  const normalized = normalizeQuery(question);
  const tokens = expandTokens(tokenize(question));
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
  // Documented academic or professional motivation is career context.
  // "Personally", without that subject, stays a psychological concept.
  const motivationAsk = /\b(motivation|motivations|motivated|motivates|motiva|motivato|motivata)\b/.test(normalized);
  const documentedMotivation =
    /\b(academic|academ|stud|career|professional|professionale|audit|percorso|scelte|internal|technology|tecnolog|learn|apprendimento)\b/.test(
      normalized,
    );
  const privateMotivation = /\b(personally|personalmente)\b/.test(normalized) && !documentedMotivation;
  if (motivationAsk) {
    if (privateMotivation) concepts.add("psychology");
    else {
      concepts.add("career_choices");
      concepts.delete("psychology");
    }
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
    c.has("future_aspirations") ||
    c.has("career_choices") ||
    c.has("academic_motivation") ||
    c.has("audit_choice") ||
    c.has("learning_method") ||
    c.has("experience_connections") ||
    c.has("distinctive_profile") ||
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
    c.has("transferable") ||
    /\b(suitable|relevant|strongest|fit|why might|transferable|orientation)\b/.test(normalized) ||
    /\b(adatto|rilevante|punti di forza)\b/.test(normalized)
  ) {
    return "role_fit";
  }
  if (
    c.has("skills") ||
    /\b(skills?|competenc(?:y|ies)|competenze|competenza)\b/.test(normalized)
  ) {
    return "skill_or_capability";
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
  if (
    item.claimType === "employment_current" &&
    asksPersonalExperience(analysis.normalized) &&
    employmentMatchesAskedTopic(analysis, textNorm)
  ) {
    score += 10;
  }
  if (
    item.claimType === "employment_past" &&
    /\b(previous|past|earlier|differ)\b/.test(analysis.normalized || "") &&
    employmentMatchesAskedTopic(analysis, textNorm)
  ) {
    score += 12;
  }
  if (
    item.claimType === "employment_current" &&
    /\biso\/iec 42006\b/.test(analysis.normalized || "") &&
    textNorm.includes("42006")
  ) {
    score += 8;
  }
  if (item.id === "radar-domain-index") {
    score += asksCompleteRadarList(analysis.normalized) ? 30 : -8;
  }

  // Keep the narrative that matches the question ahead of alphabetical ties.
  if (concepts.includes("experience_connections") && item.id === "narrative-common-thread") score += 10;
  if (concepts.includes("distinctive_profile") && item.id === "narrative-hybrid-positioning") score += 10;
  if (concepts.includes("future_aspirations") && item.id === "narrative-long-term-direction") score += 10;
  if (concepts.includes("academic_motivation") && item.id === "narrative-academic-path") score += 10;
  if (concepts.includes("audit_choice") && item.id === "narrative-audit-choice") score += 10;
  if (concepts.includes("learning_method") && item.id === "narrative-learning-approach") score += 10;
  if (concepts.includes("technical_interest") && item.id === "narrative-technical-practice") score += 8;
  if (concepts.includes("ai_policy_audit") && item.id === "narrative-ai-governance-rationale") score += 8;
  if (
    BIOGRAPHICAL_NARRATIVE.has(item.narrativeType) &&
    intent === "unknown" &&
    !concepts.includes("learning_method") &&
    !concepts.includes("academic_motivation") &&
    !concepts.includes("audit_choice") &&
    !concepts.includes("technical_interest") &&
    !concepts.includes("career_choices")
  ) {
    score -= 6;
  }
  if (
    concepts.includes("technical_interest") &&
    (claimType === "employment_current" || claimType === "employment_past") &&
    !/\b(banca profilo|bank of china|employer|at work|al lavoro)\b/.test(analysis.normalized || "")
  ) {
    score -= 8;
  }
  if (concepts.includes("development_strategy") && item.id === "narrative-development-strategy") score += 6;
  if (
    concepts.includes("career_choices") &&
    (item.id === "narrative-long-term-direction" ||
      item.id === "narrative-ai-governance-rationale" ||
      item.id === "narrative-audit-foundation" ||
      item.id === "narrative-common-thread" ||
      item.id === "narrative-development-strategy")
  ) {
    score += 6;
  }
  if (
    (concepts.includes("audit") ||
      concepts.includes("audit_why") ||
      concepts.includes("it_audit") ||
      concepts.includes("internal_audit")) &&
    item.id === "narrative-audit-foundation"
  ) {
    score += 4;
  }
  // "How do projects complement experience?" should still surface the jobs.
  if (
    intent === "project" &&
    concepts.includes("experience") &&
    /\bcomplement\b/.test(analysis.normalized || "") &&
    (claimType === "employment_current" || claimType === "employment_past")
  ) {
    score += 9;
  }

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
const BIOGRAPHICAL_NARRATIVE = new Set([
  "academic_path",
  "audit_choice",
  "learning_approach",
  "technical_practice",
]);

function intentClaimBoost(intent, claimType, item) {
  let boost = 0;
  if (
    BIOGRAPHICAL_NARRATIVE.has(item.narrativeType) &&
    (intent === "current_role" ||
      intent === "regulatory" ||
      intent === "past_experience" ||
      intent === "professional_experience")
  ) {
    boost -= 9;
  }
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
      else if (item.narrativeType === "technical_practice") boost += 4;
      else if (claimType === "skill") boost += 1;
      break;
    case "education":
      if (claimType === "education") boost += 8;
      else if (claimType === "training") boost += 3;
      else if (item.narrativeType === "academic_path") boost += 6;
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
 * Chronology questions may keep journey entries. Responsibility questions prefer the employment record.
 * @param {{ normalized?: string }} analysis
 */
function isChronologyQuestion(analysis) {
  return /\b(chronolog|timeline|journey|career path|career trajectory|career progression|over time)\b/.test(
    analysis.normalized || "",
  );
}

/**
 * @param {string} id
 */
function employerKey(id) {
  if (id.includes("banca-profilo")) return "banca-profilo";
  if (id.includes("boc")) return "boc";
  if (id.includes("prelios")) return "prelios";
  if (id.includes("toplife")) return "toplife";
  return "";
}

/**
 * @param {{ concepts: string[] }} analysis
 */
function narrativeTieRank(item, analysis) {
  if (item.topic !== "professional_narrative") return 0;
  const type = item.narrativeType || "";
  const concepts = new Set(analysis.concepts);
  if (concepts.has("future_aspirations") && type === "long_term_direction") return 4;
  if (concepts.has("experience_connections") && type === "common_thread") return 4;
  if (concepts.has("distinctive_profile") && type === "hybrid_positioning") return 4;
  if (concepts.has("ai_gov_why") && type === "ai_governance_rationale") return 4;
  if (concepts.has("development_strategy") && type === "development_strategy") return 4;
  if (concepts.has("audit_why") && type === "audit_foundation") return 4;
  if (
    concepts.has("career_choices") &&
    ["long_term_direction", "ai_governance_rationale", "audit_foundation", "common_thread", "development_strategy"].includes(
      type,
    )
  ) {
    return 2;
  }
  return 0;
}

/**
 * Analytical questions use one intent, but the six slots should still represent
 * the topics the question actually names when those items score well.
 * @param {string} intent
 * @param {{ concepts: string[], normalized: string }} analysis
 */
function usesComplementarySelection(intent, analysis) {
  if (intent === "career_narrative" || intent === "role_fit") return true;
  return (
    intent === "project" &&
    analysis.concepts.includes("experience") &&
    /\bcomplement\b/.test(analysis.normalized || "")
  );
}

/**
 * Skill questions that ask both what is already shown and what still needs
 * development. Narrow on purpose so ordinary capability lookups stay ranked as before.
 * @param {string} intent
 * @param {{ concepts: string[], normalized?: string }} analysis
 */
function isCapabilityReadinessQuestion(intent, analysis) {
  if (intent !== "skill_or_capability") return false;
  const normalized = analysis.normalized || "";
  const concepts = new Set(analysis.concepts);
  const asksDevelopment = /\b(develop|developing|still need|need to develop)\b/.test(normalized);
  const asksSkillsOrExperience =
    concepts.has("experience") || /\b(skills?|strengths|experiences)\b/.test(normalized);
  const domain =
    concepts.has("ai_governance") ||
    concepts.has("technology_risk") ||
    concepts.has("information_security") ||
    concepts.has("audit");
  return asksDevelopment && asksSkillsOrExperience && domain;
}

/**
 * Replace redundant role-lens copies with one developing capability, one job,
 * and one concrete project when those hits are still strong relative to the top score.
 * @param {Array<{ id: string, topic: string, claimType?: string, score: number }>} ranked
 * @param {number} limit
 */
function selectCapabilityReadiness(ranked, limit) {
  const selected = [];
  const used = new Set();
  const floor = ranked[0] ? ranked[0].score * 0.5 : 0;

  const take = (item) => {
    if (!item || used.has(item.id) || selected.length >= limit) return false;
    selected.push(item);
    used.add(item.id);
    return true;
  };

  const best = (pred) => ranked.find((item) => !used.has(item.id) && pred(item) && item.score >= floor);

  take(best((item) => item.claimType === "capability_developing" && item.topic !== "role_lens"));
  take(
    best(
      (item) => item.claimType === "employment_current" || item.claimType === "employment_past",
    ),
  );
  take(best((item) => item.claimType === "project_personal"));
  take(best((item) => item.topic === "professional_narrative"));

  let roleLenses = 0;
  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (used.has(item.id)) continue;
    if (item.topic === "role_lens") {
      if (roleLenses >= 1) continue;
      roleLenses += 1;
    }
    take(item);
  }

  return selected.slice(0, limit);
}

/**
 * @param {Array<{ id: string, topic: string, claimType?: string, score: number }>} ranked
 * @param {{ concepts: string[], normalized: string }} analysis
 * @param {string} intent
 * @param {number} limit
 */
function selectComplementary(ranked, analysis, intent, limit) {
  const concepts = new Set(analysis.concepts);
  const chronology = isChronologyQuestion(analysis);
  /** @type {typeof ranked} */
  const selected = [];
  const used = new Set();

  const take = (item) => {
    if (!item || used.has(item.id) || selected.length >= limit) return false;
    selected.push(item);
    used.add(item.id);
    return true;
  };

  const takeNarratives = (cap) => {
    let n = 0;
    for (const item of ranked) {
      if (n >= cap) break;
      if (item.topic === "professional_narrative" && take(item)) n += 1;
    }
  };

  const explicitProject =
    concepts.has("project") ||
    concepts.has("project_cbi") ||
    concepts.has("codeiak") ||
    concepts.has("software_dev");
  const explicitDeveloping =
    concepts.has("technology_risk") ||
    concepts.has("ai_governance") ||
    concepts.has("ai_gov_why") ||
    concepts.has("information_security") ||
    concepts.has("development_strategy") ||
    concepts.has("transferable");

  if (intent === "project") {
    let n = 0;
    for (const item of ranked) {
      if (n >= 2) break;
      if (item.claimType === "project_personal" && take(item)) n += 1;
    }
    take(
      ranked.find(
        (item) =>
          !used.has(item.id) &&
          (item.claimType === "employment_current" || item.claimType === "employment_past"),
      ),
    );
    takeNarratives(1);
  } else {
    takeNarratives(intent === "role_fit" ? 2 : 3);
    const jobs = ranked.filter(
      (item) =>
        !used.has(item.id) &&
        (item.claimType === "employment_current" || item.claimType === "employment_past"),
    );
    const reserveEmployment =
      intent === "career_narrative" ||
      concepts.has("experience") ||
      concepts.has("experience_connections") ||
      concepts.has("audit") ||
      concepts.has("internal_audit") ||
      concepts.has("it_audit") ||
      concepts.has("technology_risk") ||
      concepts.has("information_security") ||
      concepts.has("banking") ||
      concepts.has("profile");
    if (reserveEmployment && jobs[0]) take(jobs[0]);
    const employmentScore = jobs[0]?.score ?? 0;
    const project = ranked.find((item) => !used.has(item.id) && item.claimType === "project_personal");
    const developing = ranked.find(
      (item) =>
        !used.has(item.id) && item.claimType === "capability_developing" && item.topic !== "role_lens",
    );
    if (developing && (explicitDeveloping || developing.score >= employmentScore + 6)) take(developing);
    if (project && (explicitProject || project.score >= employmentScore + 6)) {
      const cap = explicitProject ? 2 : 1;
      let n = 0;
      for (const item of ranked) {
        if (n >= cap) break;
        if (item.claimType === "project_personal" && take(item)) n += 1;
      }
    }
    if (concepts.has("development_strategy")) {
      take(
        ranked.find(
          (item) =>
            !used.has(item.id) &&
            (item.claimType === "credential_in_progress" || item.claimType === "credential_planned"),
        ),
      );
    }
  }

  let roleLenses = selected.filter((item) => item.topic === "role_lens").length;
  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (used.has(item.id)) continue;
    if (item.topic === "role_lens") {
      if (roleLenses >= 1) continue;
      roleLenses += 1;
    }
    if (!chronology && item.claimType === "timeline_context") {
      const key = employerKey(item.id);
      const employmentAvailable =
        key &&
        ranked.some(
          (candidate) =>
            (candidate.claimType === "employment_current" || candidate.claimType === "employment_past") &&
            employerKey(candidate.id) === key,
        );
      if (employmentAvailable) continue;
    }
    take(item);
  }

  return selected.slice(0, limit);
}

/**
 * General skills wording has no domain token, so narrative name-matches can
 * fill the six slots. Keep one skill record and one capability record.
 * @param {Array<{ id: string, claimType?: string, score: number }>} ranked
 * @param {number} limit
 */
function selectSkillEvidence(ranked, limit) {
  /** @type {typeof ranked} */
  const selected = [];
  const seen = new Set();
  const take = (item) => {
    if (!item || seen.has(item.id) || selected.length >= limit) return;
    seen.add(item.id);
    selected.push(item);
  };
  take(ranked.find((item) => item.claimType === "skill"));
  take(
    ranked.find(
      (item) =>
        item.claimType === "capability_demonstrated" || item.claimType === "capability_developing",
    ),
  );
  for (const item of ranked) take(item);
  return selected.slice(0, limit);
}

function asksPersonalExperience(normalized) {
  const n = normalized || "";
  const definitionOnly =
    /\b(what is|what are|what does|what do|define|definition|cover|covers|represent|represents|mean|means)\b/.test(n) &&
    !/\b(experience|experienced|worked|working|audited|auditing|performed|performing|contributed|contribution|professionally|professional|currently|current|previous|doing)\b/.test(n);
  if (definitionOnly) return false;
  return /\b(experience|experienced|esperienza|esperienze|worked|professionally|professional|audited|auditing|performed|performing|contributed|contribution|at work|currently|doing|work|assess|assessed|assessing|verifiche|verifica|verificato|verificati|verificata|verificate|svolte|svolto|svolta)\b/.test(n);
}

function employmentMatchesAskedTopic(analysis, textNorm) {
  const n = analysis.normalized || "";
  const concepts = analysis.concepts || [];
  if (concepts.includes("ai_governance") && (textNorm.includes("ai governance") || textNorm.includes("ai policy"))) {
    return true;
  }
  if (/\bai policy\b/.test(n) && textNorm.includes("ai policy")) return true;
  if (concepts.includes("dora") && textNorm.includes("dora")) return true;
  if (
    (concepts.includes("operational_resilience") || /\boperational resilience\b/.test(n)) &&
    textNorm.includes("operational resilience")
  ) {
    return true;
  }
  if ((concepts.includes("ict_incident") || /\bincident/.test(n)) && textNorm.includes("incident")) return true;
  if (
    (concepts.includes("ict_change") || /\b(change management|ict change|cambiamenti)\b/.test(n)) &&
    (textNorm.includes("change management") || textNorm.includes("ict change"))
  ) {
    return true;
  }
  if (
    (concepts.includes("ict_outsourcing") || concepts.includes("third_party") || /\b(outsourcing|third[- ]party|terze parti)\b/.test(n)) &&
    (textNorm.includes("outsourcing") || textNorm.includes("third-party") || textNorm.includes("third party"))
  ) {
    return true;
  }
  if ((concepts.includes("nist") || /\bnist\b/.test(n)) && textNorm.includes("nist")) return true;
  if ((concepts.includes("ai_policy") || /\bai policy\b/.test(n)) && textNorm.includes("ai policy")) return true;
  return false;
}

function asksCompleteRadarList(normalized) {
  const n = normalized || "";
  if (/\b(describe|description)\b/.test(n) && !/\b(all|every|seven|list)\b/.test(n)) return false;
  const collective = /\b(all|every|seven|list|name|which)\b/.test(n);
  const target = /\b(radar|risk exposure|risk areas|chart)\b/.test(n);
  return collective && target;
}

/**
 * Explicit background, work-experience, or trajectory wording.
 * Domain terms alone do not qualify: a pure skills, certification, or AI-governance
 * question must not gain an employment record from this safeguard.
 * @param {{ normalized?: string }} analysis
 */
function asksProfessionalContext(analysis) {
  return /\b(?:professional background|background professionale|work experience|working experience|professional experience|esperienza professionale|esperienze professionali|esperienza lavorativa|esperienze lavorative|career trajectory|professional trajectory|traiettoria professionale|percorso professionale)\b/.test(
    analysis.normalized || "",
  );
}

/**
 * @param {{ claimType?: string }} item
 */
function isEmploymentClaim(item) {
  return item.claimType === "employment_current" || item.claimType === "employment_past";
}

/**
 * Keep the current role inside the evidence limit when a background question
 * would otherwise fill every slot with higher-scoring capability or narrative items.
 * @param {Array<{ id: string, claimType?: string, score: number }>} selected
 * @param {Array<{ id: string, claimType?: string, score: number }>} ranked
 * @param {number} limit
 */
function reserveCurrentEmployment(selected, ranked, limit) {
  const current = ranked.find((item) => item.claimType === "employment_current");
  const next = selected.slice(0, limit);
  if (!current || next.some((item) => item.id === current.id)) return next;
  if (next.length < limit) {
    next.push(current);
    return next;
  }

  let replaceAt = -1;
  for (let index = 0; index < next.length; index += 1) {
    if (isEmploymentClaim(next[index])) continue;
    if (replaceAt === -1 || next[index].score < next[replaceAt].score) replaceAt = index;
  }
  if (replaceAt === -1) return next;
  next[replaceAt] = current;
  return next;
}

/**
 * Concrete activities a visitor can ask Lorenzo to have performed.
 * Generic domains such as "AI governance" are intentionally excluded.
 * @param {{ concepts?: string[], tokens?: string[], normalized?: string }} analysis
 */
function activityKeys(analysis) {
  const concepts = new Set(analysis.concepts || []);
  const tokens = new Set(analysis.tokens || []);
  const n = analysis.normalized || "";
  /** @type {Set<string>} */
  const keys = new Set();
  if (concepts.has("dora") || tokens.has("dora")) keys.add("dora");
  if (concepts.has("ict_incident") || tokens.has("incident") || tokens.has("incidenti")) keys.add("incident");
  if (
    concepts.has("ict_change") ||
    (tokens.has("change") && (tokens.has("ict") || tokens.has("management") || /\bcambiamenti\b/.test(n)))
  ) {
    keys.add("change");
  }
  if (concepts.has("ict_outsourcing") || tokens.has("outsourcing") || tokens.has("esternalizzazione")) {
    keys.add("outsourcing");
  }
  if (
    concepts.has("third_party") ||
    tokens.has("third-party") ||
    (tokens.has("third") && tokens.has("party")) ||
    /\bterze parti\b/.test(n)
  ) {
    keys.add("third_party");
  }
  if (concepts.has("nist") || tokens.has("nist")) keys.add("nist");
  if (concepts.has("ai_policy") || /\bai policy\b/.test(n)) keys.add("ai_policy");
  if (
    concepts.has("operational_resilience") ||
    (tokens.has("operational") && tokens.has("resilience")) ||
    tokens.has("resilienza")
  ) {
    keys.add("operational_resilience");
  }
  return [...keys];
}

/**
 * @param {{ text?: string }} item
 * @param {string[]} keys
 */
function containsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

function matchesActivity(item, keys, normalized = "") {
  const text = normalizeQuery(item.text || "");
  const asksAiRmf = /\bai rmf\b/.test(normalized) || /\bnist ai\b/.test(normalized);
  return keys.some((key) => {
    if (key === "dora") return containsTerm(text, "dora");
    if (key === "incident") return containsTerm(text, "incident");
    if (key === "change") return containsTerm(text, "change management") || containsTerm(text, "ict change");
    if (key === "outsourcing" || key === "third_party") {
      return containsTerm(text, "outsourcing") || containsTerm(text, "third-party") || containsTerm(text, "third party");
    }
    if (key === "nist") {
      if (asksAiRmf) return containsTerm(text, "ai rmf") || containsTerm(text, "nist ai");
      return containsTerm(text, "nist");
    }
    if (key === "ai_policy") return containsTerm(text, "ai policy");
    if (key === "operational_resilience") return containsTerm(text, "operational resilience");
    return false;
  });
}

/**
 * @param {string} normalized
 */
function namedEmployers(normalized) {
  const n = normalized || "";
  return {
    boc: /\bbank of china\b/.test(n),
    profilo: /\bbanca profilo\b/.test(n),
  };
}

/**
 * @param {Array<{ score: number, claimType?: string, id: string }>} items
 * @param {{ concepts: string[], normalized: string }} analysis
 * @param {string} intent
 */
function sortRanked(items, analysis, intent) {
  return items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tie = narrativeTieRank(b, analysis) - narrativeTieRank(a, analysis);
    if (tie !== 0) return tie;
    if (intent === "current_role") {
      const rank = (ct) =>
        ct === "employment_current" ? 0 : ct === "profile" ? 1 : ct === "employment_past" ? 9 : 5;
      const d = rank(a.claimType) - rank(b.claimType);
      if (d !== 0) return d;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * When the visitor asks what Lorenzo performed, prefer the employer record
 * that states the activity over keyword-heavy radar, lens, and skill copies.
 * A named past employer stays ahead of the current job. The current job still
 * receives the activity boost so both records can be shown together.
 * @param {Array<{ id: string, topic: string, claimType?: string, text?: string, score: number }>} scored
 * @param {{ concepts?: string[], tokens?: string[], normalized?: string }} analysis
 * @param {string} intent
 */
function adjustActivityRanking(scored, analysis, intent) {
  const keys = activityKeys(analysis);
  if (!asksPersonalExperience(analysis.normalized) || !keys.length) return scored;
  const normalized = analysis.normalized || "";
  const employmentHit = scored.some((item) => isEmploymentClaim(item) && matchesActivity(item, keys, normalized));
  if (!employmentHit) return scored;
  const named = namedEmployers(analysis.normalized || "");
  const asksComparison = /\b(previous|past|earlier|differ\w*|prima|confronto)\b/.test(
    analysis.normalized || "",
  );
  return scored.map((item) => {
    let score = item.score;
    const matches = isEmploymentClaim(item) && matchesActivity(item, keys, normalized);
    if (matches && item.claimType === "employment_current") {
      score += 14;
      if (intent === "regulatory") score += 5;
      const text = normalizeQuery(item.text || "");
      if (keys.includes("dora") && text.includes("dora pillar")) score += 6;
    } else if (matches && item.claimType === "employment_past") {
      if (named.boc && !named.profilo) score += 16;
      else if (asksComparison) score += 8;
      else if (!named.profilo) score += 4;
    } else if (
      employmentHit &&
      (item.topic === "radar_domain" || item.topic === "role_lens" || item.topic === "skill")
    ) {
      score -= 8;
    }
    return score === item.score ? item : { ...item, score };
  });
}

/**
 * Drop weak filler once a performed activity is already covered by employment.
 * Matching employment records are kept even when they sit below the relative floor.
 * @param {Array<{ id: string, topic: string, claimType?: string, text?: string, score: number }>} selected
 * @param {{ concepts?: string[], tokens?: string[], normalized?: string }} analysis
 */
function isCapabilityClaim(item) {
  return item.claimType === "capability_developing" || item.claimType === "capability_demonstrated";
}

function trimActivityFiller(selected, ranked, analysis, limit) {
  const keys = activityKeys(analysis);
  const normalized = analysis.normalized || "";
  if (!asksPersonalExperience(normalized) || !keys.length) return selected;
  const top = selected[0]?.score ?? 0;
  const floor = Math.max(MIN_RETRIEVAL_SCORE, top * 0.58);
  /** @type {typeof selected} */
  const kept = [];
  let radars = 0;
  let capabilities = 0;
  for (const item of selected) {
    if (isEmploymentClaim(item) && matchesActivity(item, keys, normalized)) {
      kept.push(item);
      continue;
    }
    if (item.score < floor) continue;
    if (item.topic === "role_lens" || item.topic === "skill" || item.claimType === "skill" || item.claimType === "timeline_context") continue;
    if (item.topic === "radar_domain") {
      if (radars >= 1) continue;
      radars += 1;
      kept.push(item);
      continue;
    }
    if (isCapabilityClaim(item)) {
      if (capabilities >= 1) continue;
      capabilities += 1;
    }
    kept.push(item);
  }
  const have = new Set(kept.map((item) => item.id));
  const bestCapability = ranked.find(
    (item) => item.topic !== "radar_domain" && isCapabilityClaim(item) && matchesActivity(item, keys, normalized) && !have.has(item.id),
  );
  const bestRadar = ranked.find((item) => item.topic === "radar_domain" && matchesActivity(item, keys, normalized) && !have.has(item.id));
  for (const extra of [bestCapability, bestRadar]) {
    if (!extra || kept.length >= limit) continue;
    if (extra.topic === "radar_domain" && radars >= 1) continue;
    if (isCapabilityClaim(extra) && capabilities >= 1) continue;
    kept.push(extra);
  }
  return kept.length ? kept : selected.slice(0, 1);
}

/**
 * @param {{ normalized?: string, concepts?: string[] }} analysis
 */
function boundaryPinIds(analysis) {
  const n = analysis.normalized || "";
  /** @type {string[]} */
  const ids = [];
  const ownership =
    /\b(own|owned|ownership|proprietario|responsabile)\b/.test(n) &&
    /\b(policy|ai governance|intelligenza artificiale)\b/.test(n);
  if (ownership) {
    ids.push("narrative-ai-governance-rationale", "experience-banca-profilo");
  }
  const directionContrast =
    /\b(technology risk manager|ict risk manager)\b/.test(n) ||
    (/\b(current|currently|attuale|attualmente)\b/.test(n) &&
      /\b(direction|direzione)\b/.test(n) &&
      /\b(technology risk|ict risk|rischio tecnologico)\b/.test(n));
  if (directionContrast) {
    ids.push("narrative-long-term-direction", "experience-banca-profilo");
  }
  const policyAudit =
    (/\b(ai policy|policy ai|politica ai)\b/.test(n) && /\b(audit|engagement|partecip)\b/.test(n)) ||
    (analysis.concepts || []).includes("ai_policy_audit");
  if (policyAudit) {
    ids.push("narrative-ai-governance-rationale", "experience-banca-profilo");
  }
  if (/\bai governance\b/.test(n) && /\b(experience|esperienza|personal projects|only from)\b/.test(n)) {
    ids.push("experience-banca-profilo");
  }
  return ids;
}

/**
 * @param {Array<{ id: string, score: number }>} selected
 * @param {Array<{ id: string, score: number }>} ranked
 * @param {{ normalized?: string, concepts?: string[] }} analysis
 * @param {number} limit
 */
function ensureBoundaryEvidence(selected, ranked, analysis, limit) {
  const pins = boundaryPinIds(analysis)
    .map((id) => ranked.find((item) => item.id === id))
    .filter(Boolean);
  if (!pins.length) return selected;
  const next = selected.slice(0, limit);
  const pinIds = new Set(pins.map((item) => item.id));
  for (const pin of pins) {
    if (!pin || next.some((item) => item.id === pin.id)) continue;
    if (next.length < limit) {
      next.push(pin);
      continue;
    }
    let replaceAt = -1;
    for (let index = 0; index < next.length; index += 1) {
      if (pinIds.has(next[index].id)) continue;
      if (replaceAt === -1 || next[index].score < next[replaceAt].score) replaceAt = index;
    }
    if (replaceAt >= 0) next[replaceAt] = pin;
  }
  return next;
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

  const scored = corpus.map((item) => {
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
  });

  const ranked = sortRanked(
    adjustActivityRanking(scored, analysis, intent).filter((item) => item.score >= minScore),
    analysis,
    intent,
  );

  let selected;
  if (isCapabilityReadinessQuestion(intent, analysis)) {
    selected = selectCapabilityReadiness(ranked, limit);
  } else if (usesComplementarySelection(intent, analysis)) {
    selected = selectComplementary(ranked, analysis, intent, limit);
  } else if (analysis.concepts.includes("skills")) {
    selected = selectSkillEvidence(ranked, limit);
  } else {
    selected = ranked.slice(0, limit);
  }

  if (asksProfessionalContext(analysis)) {
    selected = reserveCurrentEmployment(selected, ranked, limit);
  }
  selected = trimActivityFiller(selected, ranked, analysis, limit);
  return ensureBoundaryEvidence(selected, ranked, analysis, limit);
}

export { STOPWORDS, PHRASE_ALIASES, TOKEN_ALIASES };
