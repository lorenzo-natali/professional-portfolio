/**
 * Deterministic pre-OpenAI gates: private/unsupported info + evidence sufficiency.
 * No LLM classifier.
 */

import { analyzeQuery, classifyIntent } from "./retrieve.js";
import { resolvePublicSignalIds } from "./signalResolve.js";

export const INSUFFICIENT_EVIDENCE_ANSWER =
  "The public portfolio does not provide enough information to answer that question.";

export const PRIVATE_INFO_ANSWER = "The public portfolio does not provide that information.";

export const IDENTITY_ANSWER =
  "I am an AI Portfolio Assistant using information and professional narrative made available through Lorenzo Natali's public portfolio. You are not communicating directly with Lorenzo.";

const PRIVATE_PATTERNS = [
  /\bsalary\b/i,
  /\bcompensation\b/i,
  /\bwage\b/i,
  /\bhome\s+address\b/i,
  /\bresidential\s+address\b/i,
  /\bphone\s+number\b/i,
  /\bmobile\s+number\b/i,
  /\bcellphone\b/i,
  /\bbank\s+account\b/i,
  /\baccount\s+number\b/i,
  /\biban\b/i,
  /\bsocial\s+security\b/i,
  /\bcodice\s+fiscale\b/i,
  /\btax\s+id\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\b\bdob\b/i,
  /\bpassword\b/i,
  /\bprivate\s+email\b/i,
  /\bstipendio\b/i,
  /\bindirizzo\b/i,
  /\bnumero\s+di\s+telefono\b/i,
  /\bconto\s+corrente\b/i,
];

const PSYCHOLOGY_PATTERNS = [
  /\bpersonality\b/i,
  /\bpersonalita\b/i,
  /\bpersonalit[aà]\b/i,
  /\bambitious\b/i,
  /\bambizioso\b/i,
  /\bnatural leader\b/i,
  /\bleader(ship)?\s+style\b/i,
  /\bhandle stress\b/i,
  /\bunder pressure\b/i,
  /\bstress\b/i,
  /\bmotivates you personally\b/i,
  /\bpersonal motivation\b/i,
  /\bcosa ti motiva\b/i,
  /\btemperament\b/i,
  /\bemotional\b/i,
  /\bfeel about\b/i,
  /\bdo you like your manager\b/i,
  /\bti piace il (tuo )?manager\b/i,
  /\bpolitical views?\b/i,
  /\bopinioni politiche\b/i,
  /\bwhy did you leave\b/i,
  /\bperch[eé] hai lasciato\b/i,
  /\bleft bank of china\b/i,
  /\bwould you accept\b/i,
  /\baccepteresti\b/i,
  /\bjob offer\b/i,
  /\bresilience\b/i,
  /\brisk appetite\b/i,
];

const IDENTITY_PATTERNS = [
  /\bare you lorenzo\b/i,
  /\bam i talking to lorenzo\b/i,
  /\btalking (directly )?to lorenzo\b/i,
  /\bare these lorenzo'?s own answers\b/i,
  /\bsei lorenzo\b/i,
  /\bsto parlando con lorenzo\b/i,
];

const UNSUPPORTED_EMPLOYER_PATTERNS = [
  /\bgoldman\s+sachs\b/i,
  /\bjp\s*morgan\b/i,
  /\bmorgan\s+stanley\b/i,
  /\bgoogle\b/i,
  /\bmeta\b/i,
  /\bmicrosoft\b/i,
  /\bamazon\b/i,
];

const UNSUPPORTED_TITLE_PATTERNS = [/\bciso\b/i, /\bceo\b/i, /\bcfo\b/i, /\bcto\b/i];

/**
 * @param {string} question
 * @returns {{ blocked: true, answer: string, reason: string } | { blocked: false }}
 */
export function evaluatePrivateOrUnsupportedGate(question) {
  const q = String(question || "");
  const normalized = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const re of IDENTITY_PATTERNS) {
    if (re.test(q) || re.test(normalized)) {
      return { blocked: true, answer: IDENTITY_ANSWER, reason: "identity_transparency" };
    }
  }

  for (const re of PRIVATE_PATTERNS) {
    if (re.test(q) || re.test(normalized)) {
      return { blocked: true, answer: PRIVATE_INFO_ANSWER, reason: "private_information" };
    }
  }

  // Adversarial bait: private ask wrapped in portfolio keywords
  if (
    (/\b(salary|home address|phone|iban|bank account|stipendio|indirizzo)\b/i.test(normalized) &&
      /\b(banking|cisa|experience|audit|using)\b/i.test(normalized))
  ) {
    return { blocked: true, answer: PRIVATE_INFO_ANSWER, reason: "private_information_bait" };
  }

  for (const re of PSYCHOLOGY_PATTERNS) {
    if (re.test(q) || re.test(normalized)) {
      return {
        blocked: true,
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        reason: "psychological_inference_blocked",
      };
    }
  }

  for (const re of UNSUPPORTED_EMPLOYER_PATTERNS) {
    if (re.test(q) || re.test(normalized)) {
      return {
        blocked: true,
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        reason: "unsupported_employer",
      };
    }
  }

  for (const re of UNSUPPORTED_TITLE_PATTERNS) {
    if ((re.test(q) || re.test(normalized)) && /\b(is|are|was|were|e|ciso)\b/i.test(normalized)) {
      return {
        blocked: true,
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        reason: "unsupported_title",
      };
    }
  }

  if (/\b(team of\s+\d+|managed a team|team di\s+\d+)\b/i.test(normalized)) {
    return {
      blocked: true,
      answer: INSUFFICIENT_EVIDENCE_ANSWER,
      reason: "unsupported_management_claim",
    };
  }

  return { blocked: false };
}

/**
 * @param {string} intent
 * @param {Array<{ id: string, claimType?: string, topic?: string, score?: number }>} evidence
 */
function hasClaim(evidence, types) {
  const set = new Set(types);
  return evidence.some((e) => set.has(e.claimType));
}

/**
 * Name/profile-only or weak generic hits are insufficient.
 * @param {Array<{ id: string, claimType?: string, score?: number }>} evidence
 */
function isProfileNameOnly(evidence) {
  if (!evidence.length) return true;
  return evidence.every(
    (e) =>
      e.claimType === "profile" ||
      e.id === "profile-lorenzo-natali" ||
      (typeof e.score === "number" && e.score < 4 && e.claimType === "profile"),
  );
}

/**
 * @param {{
 *   question: string,
 *   evidence: Array<{ id: string, claimType?: string, topic?: string, text?: string, score?: number }>,
 *   intent?: string,
 * }} args
 * @returns {{ ok: true, intent: string } | { ok: false, answer: string, reason: string, intent: string }}
 */
export function evaluateEvidenceSufficiency({ question, evidence, intent: intentIn }) {
  const analysis = analyzeQuery(question);
  const intent = intentIn || classifyIntent(question, analysis);
  const items = Array.isArray(evidence) ? evidence : [];

  if (intent === "unsupported_private_information") {
    return { ok: false, answer: PRIVATE_INFO_ANSWER, reason: "private_information", intent };
  }

  if (!items.length) {
    return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "no_evidence", intent };
  }

  // Injection / capability probes: do not escalate via OpenAI when no substantive portfolio ask
  if (
    analysis.concepts.includes("injection") &&
    !analysis.concepts.some((c) =>
      [
        "experience",
        "audit",
        "certification",
        "project",
        "ai_governance",
        "current_role",
        "banking",
      ].includes(c),
    )
  ) {
    return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "injection_probe", intent };
  }

  switch (intent) {
    case "current_role": {
      if (!hasClaim(items, ["employment_current"])) {
        return {
          ok: false,
          answer: INSUFFICIENT_EVIDENCE_ANSWER,
          reason: "current_role_missing",
          intent,
        };
      }
      return { ok: true, intent };
    }
    case "project": {
      if (analysis.concepts.includes("software_dev") && !hasClaim(items, ["project_personal"])) {
        return {
          ok: false,
          answer: INSUFFICIENT_EVIDENCE_ANSWER,
          reason: "software_employment_unsupported",
          intent,
        };
      }
      if (!hasClaim(items, ["project_personal"])) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "project_missing", intent };
      }
      return { ok: true, intent };
    }
    case "mobility":
      if (!hasClaim(items, ["mobility"])) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "mobility_missing", intent };
      }
      return { ok: true, intent };
    case "language":
      if (!hasClaim(items, ["language", "education"])) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "language_missing", intent };
      }
      return { ok: true, intent };
    case "certification":
      if (
        !hasClaim(items, [
          "credential_completed",
          "credential_in_progress",
          "credential_planned",
        ])
      ) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "credential_missing", intent };
      }
      return { ok: true, intent };
    case "education":
      if (!hasClaim(items, ["education", "training"])) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "education_missing", intent };
      }
      return { ok: true, intent };
    case "past_experience":
    case "professional_experience":
      if (
        !hasClaim(items, [
          "employment_past",
          "employment_current",
          "capability_demonstrated",
        ])
      ) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "employment_missing", intent };
      }
      return { ok: true, intent };
    case "regulatory":
      if (
        !hasClaim(items, [
          "regulatory_knowledge",
          "capability_demonstrated",
          "capability_developing",
          "employment_past",
          "employment_current",
          "skill",
          "training",
          "career_direction",
        ])
      ) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "regulatory_missing", intent };
      }
      // Must actually mention the regulatory token when asking for a specific acronym
      if (analysis.concepts.includes("nis2")) {
        const hit = items.some((e) => /nis2/i.test(`${e.text || ""} ${(e.id || "")}`));
        if (!hit) {
          return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "nis2_missing", intent };
        }
      }
      if (analysis.concepts.includes("dora")) {
        const hit = items.some((e) => /dora/i.test(e.text || ""));
        if (!hit) {
          return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "dora_missing", intent };
        }
      }
      return { ok: true, intent };
    case "skill_or_capability":
      if (
        !hasClaim(items, [
          "capability_demonstrated",
          "capability_developing",
          "career_direction",
          "skill",
          "employment_past",
          "employment_current",
          "project_personal",
          "regulatory_knowledge",
          "training",
        ])
      ) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "capability_missing", intent };
      }
      // "professionally in AI Governance" still allowed through with developing/project types —
      // model policy must not convert to employment; sufficiency only checks presence.
      return { ok: true, intent };
    case "role_fit":
    case "career_narrative": {
      const hasNarrative = items.some(
        (e) =>
          e.claimType === "career_direction" ||
          e.topic === "professional_narrative" ||
          Boolean(e.narrativeType),
      );
      const hasSupport = hasClaim(items, [
        "career_direction",
        "employment_current",
        "employment_past",
        "capability_demonstrated",
        "capability_developing",
        "project_personal",
        "credential_in_progress",
        "education",
        "profile",
      ]);
      if (!hasNarrative && !hasSupport) {
        return {
          ok: false,
          answer: INSUFFICIENT_EVIDENCE_ANSWER,
          reason: "career_narrative_missing",
          intent,
        };
      }
      // Career narrative questions require at least one authorized career_direction item.
      if (intent === "career_narrative" && !hasClaim(items, ["career_direction"])) {
        return {
          ok: false,
          answer: INSUFFICIENT_EVIDENCE_ANSWER,
          reason: "career_direction_missing",
          intent,
        };
      }
      return { ok: true, intent };
    }
    case "profile_summary":
      if (isProfileNameOnly(items) && items.length < 2 && !hasClaim(items, ["employment_current"])) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "summary_weak", intent };
      }
      if (
        !hasClaim(items, [
          "profile",
          "employment_current",
          "employment_past",
          "capability_demonstrated",
          "capability_developing",
          "career_direction",
          "project_personal",
        ])
      ) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "summary_missing", intent };
      }
      return { ok: true, intent };
    case "unknown":
    default: {
      if (isProfileNameOnly(items)) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "name_only", intent };
      }
      // Require a non-trivial score on at least one non-profile item
      const strong = items.some(
        (e) => e.claimType !== "profile" && typeof e.score === "number" && e.score >= 5,
      );
      if (!strong) {
        return { ok: false, answer: INSUFFICIENT_EVIDENCE_ANSWER, reason: "weak_unknown", intent };
      }
      return { ok: true, intent };
    }
  }
}

/**
 * Public evidence payload for /ask responses (navigation-ready).
 * @param {Array<{ id: string, topic: string, claimType?: string, signalIds?: string[] }>} items
 */
export function toPublicEvidence(items) {
  return items.map((item) => ({
    id: item.id,
    topic: item.topic,
    claimType: item.claimType || "timeline_context",
    signalIds: resolvePublicSignalIds(item),
    ...(item.narrativeType ? { narrativeType: item.narrativeType } : {}),
  }));
}
