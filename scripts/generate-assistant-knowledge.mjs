/**
 * Generate a derived Portfolio Assistant knowledge pack from canonical portfolio data.
 * Run: node scripts/generate-assistant-knowledge.mjs
 * Check: node scripts/generate-assistant-knowledge.mjs --check
 *
 * Excludes assistantPrompts / signalMap as primary fact sources (navigation aliases resolved at runtime).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "workers/portfolio-assistant/src/knowledge/pack.js");
const checkMode = process.argv.includes("--check");

/** Short tokens allowed as keywords (acronyms / meaningful 2-letter). */
const SHORT_KEYWORD_ALLOW = new Set(["ai", "it", "ict", "eu"]);

const KEYWORD_STOP = new Set([
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
  "at",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "amp",
]);

function compact(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic, lossless-enough first→third person for known portfolio patterns.
 * Avoids brittle blanket pronoun rewriting.
 * @param {string} text
 */
function toThirdPersonSafe(text) {
  let t = String(text || "");
  t = t.replace(/\bI am joining\b/g, "Lorenzo is joining");
  t = t.replace(/\bI am\b/g, "Lorenzo is");
  t = t.replace(/\bI'm\b/g, "Lorenzo is");
  t = t.replace(/\bI have\b/g, "Lorenzo has");
  t = t.replace(/\bI chose\b/g, "Lorenzo chose");
  t = t.replace(/\bI work\b/g, "Lorenzo works");
  t = t.replace(/\bI contribute\b/g, "Lorenzo contributes");
  t = t.replace(/\bI position\b/g, "Lorenzo positions");
  t = t.replace(/\bBegan preparing\b/g, "Lorenzo began preparing");
  // Leading "My " only (common in journey/experience notes).
  t = t.replace(/(^|[.!?]\s+)My\b/g, "$1Lorenzo's");
  return t;
}

/**
 * Prefer details when present (they supersede shorter points); else points.
 * @param {string[]|undefined} points
 * @param {string[]|undefined} details
 */
function uniqueExperienceBullets(points, details) {
  if (Array.isArray(details) && details.length) return details.map(compact).filter(Boolean);
  if (Array.isArray(points) && points.length) return points.map(compact).filter(Boolean);
  return [];
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function keywordParts(raw) {
  return String(raw || "")
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      if (KEYWORD_STOP.has(t)) return false;
      if (t.length >= 3) return true;
      return SHORT_KEYWORD_ALLOW.has(t);
    });
}

/**
 * @param {...(string|string[]|undefined|null)} parts
 */
function buildKeywords(...parts) {
  /** @type {string[]} */
  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (Array.isArray(part)) {
      for (const p of part) out.push(...keywordParts(p), ...(compact(p).length >= 3 ? [compact(p).toLowerCase()] : []));
    } else {
      const c = compact(part).toLowerCase();
      if (c.length >= 3) out.push(c);
      out.push(...keywordParts(part));
    }
  }
  return [...new Set(out.filter(Boolean))];
}

/**
 * @param {object} cred
 */
function credentialClaimType(cred) {
  const blob = `${cred.title || ""} ${cred.subtitle || ""} ${cred.description || ""}`.toLowerCase();
  if (/in progress|preparing for|exam planned/.test(blob)) return "credential_in_progress";
  if (/planned|roadmap|after cisa|after crisc|longer-term/.test(blob)) return "credential_planned";
  if (/coming soon/.test(blob) && !/in progress/.test(blob)) return "credential_planned";
  return "credential_planned";
}

/**
 * @param {object} cap
 */
function capabilityClaimType(cap) {
  const id = String(cap.id || "");
  if (id === "capability-audit-control" || id === "capability-banking-risk") {
    return "capability_demonstrated";
  }
  if (id === "capability-international-cross-cultural") return "capability_demonstrated";
  // Technology risk mixes audit exposure + growing focus — underclaim as developing.
  return "capability_developing";
}

/**
 * @param {object} domain
 */
function radarClaimType(domain) {
  const maturity = String(domain.maturity || "").toLowerCase();
  const id = String(domain.id || "");
  if (id === "radar-ai-model-governance" || /emerging/.test(maturity)) return "career_direction";
  if (/developing/.test(maturity)) return "capability_developing";
  if (/primary/.test(maturity)) {
    if (/regulatory|supervisory/.test(String(domain.title || "").toLowerCase())) {
      return "regulatory_knowledge";
    }
    return "capability_demonstrated";
  }
  return "capability_developing";
}

/**
 * @param {object} exp
 */
function employmentClaimType(exp) {
  if (exp.upcoming || /present/i.test(String(exp.period || ""))) return "employment_current";
  return "employment_past";
}

function push(items, item) {
  const keywords = buildKeywords(...(item.keywordSources || []), ...(item.keywords || []));
  items.push({
    id: item.id,
    topic: item.topic,
    claimType: item.claimType,
    text: compact(item.text),
    keywords,
    ...(item.employer ? { employer: compact(item.employer) } : {}),
    ...(item.status ? { status: compact(item.status) } : {}),
    ...(item.domain ? { domain: compact(item.domain) } : {}),
    ...(item.narrativeType ? { narrativeType: compact(item.narrativeType) } : {}),
    ...(item.signalIds?.length ? { signalIds: item.signalIds } : {}),
  });
}

/**
 * @returns {Promise<{ body: string, items: object[], notes: string[] }>}
 */
async function buildPack() {
  const server = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });

  const notes = [];

  try {
    const data = await server.ssrLoadModule("/src/portfolio/portfolioData.js");
    const journey = await server.ssrLoadModule("/src/portfolio/journeyData.js");
    const mobility = await server.ssrLoadModule("/src/portfolio/mobilityData.js");
    const narrativeMod = await server.ssrLoadModule("/src/portfolio/professionalNarrative.js");
    const professionalNarrative = narrativeMod.professionalNarrative || [];

    /** @type {Array<object>} */
    const items = [];

    // Profile mirrors Hero positioning (HeroSection is presentation; not SSR-imported).
    push(items, {
      id: "profile-lorenzo-natali",
      topic: "profile",
      claimType: "profile",
      text:
        "Lorenzo Natali (那罗成). Positioning: Banking Risk & Controls | Technology & Information Security Governance | AI Governance. Currently IT Audit Specialist at Banca Profilo · Milan. Profile sits at the intersection of banking risk, technology & information security governance and AI governance, with internal audit and assurance as the connecting backbone.",
      keywords: [
        "profile",
        "about",
        "background",
        "positioning",
        "banca profilo",
        "it audit",
        "milan",
        "current role",
        "ruolo attuale",
      ],
      keywordSources: ["lorenzo natali", "banca profilo", "it audit specialist"],
      signalIds: ["experience-banca-profilo"],
      status: "current_profile",
    });

    for (const exp of data.experiences) {
      const claimType = employmentClaimType(exp);
      const bullets = uniqueExperienceBullets(exp.points, exp.details);
      const parts = [
        `${exp.role} at ${exp.company} (${exp.period}).`,
        exp.upcomingNote ? toThirdPersonSafe(exp.upcomingNote) : null,
        exp.note ? toThirdPersonSafe(exp.note) : null,
        ...bullets.map(toThirdPersonSafe),
      ].filter(Boolean);

      if (claimType === "employment_current" && /september 2026/i.test(String(exp.period || ""))) {
        notes.push(
          "Temporal note: experience-banca-profilo period is 'September 2026 – Present' while generation date may precede September 2026; claimType follows canonical Present wording (no date invented).",
        );
      }

      push(items, {
        id: exp.id,
        topic: "experience",
        claimType,
        text: parts.join(" "),
        employer: exp.company,
        status: claimType === "employment_current" ? "current" : "past",
        keywordSources: [exp.role, exp.company, claimType === "employment_current" ? "current role" : "past role"],
        keywords:
          claimType === "employment_current"
            ? ["current", "currently", "present", "ruolo attuale", "attualmente"]
            : ["past", "previous"],
        signalIds: [exp.id],
      });
    }

    for (const cap of data.expertise) {
      const claimType = capabilityClaimType(cap);
      push(items, {
        id: cap.id,
        topic: "capability",
        claimType,
        domain: cap.title,
        status: claimType === "capability_demonstrated" ? "demonstrated" : "developing",
        text: `${cap.title}: ${toThirdPersonSafe(cap.text)}`,
        keywordSources: [cap.title, claimType],
        keywords: ["capability", "expertise"],
        signalIds: [cap.id],
      });
    }

    for (const project of data.projects) {
      push(items, {
        id: project.id,
        topic: "project",
        claimType: "project_personal",
        status: project.status,
        domain: project.title,
        text: `${project.title} (${project.status}; stage: ${project.stage}). ${toThirdPersonSafe(project.text)} Tech focus: ${(project.tech || []).join(", ")}.`,
        keywordSources: [project.title, ...(project.tech || []), "project", "codeiak", "cognitive"],
        keywords: ["personal project", "progetto"],
        signalIds: [project.id],
      });
    }

    for (const edu of data.education) {
      push(items, {
        id: edu.id,
        topic: "education",
        claimType: "education",
        text: [edu.degree, edu.qualifier, edu.focus, edu.school, edu.period, edu.detail]
          .filter(Boolean)
          .join(" · "),
        keywordSources: [edu.degree, edu.school, "education", "degree", "university", "study", "master", "formazione"],
        signalIds: [edu.id],
      });
    }

    for (const cred of data.credentials) {
      const claimType = credentialClaimType(cred);
      const acronym = String(cred.title || "")
        .split(/\s|—|–|-/)[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      push(items, {
        id: cred.id,
        topic: "credential",
        claimType,
        status: claimType.replace("credential_", ""),
        domain: acronym || cred.title,
        text: `${cred.title} (${cred.subtitle}). ${toThirdPersonSafe(cred.description)}`,
        keywordSources: [cred.title, acronym, "certification", "credential", "certificazione", "certificato"],
        // Only this credential's acronym — never pollute with sibling certs.
        keywords: acronym ? [acronym] : [],
        signalIds: [cred.id],
      });
    }

    for (const train of data.additionalTraining.items) {
      push(items, {
        id: train.id,
        topic: "training",
        claimType: "training",
        text: `${train.title} — ${train.subtitle}. ${toThirdPersonSafe(train.description)}`,
        keywordSources: [train.title, "training", "course", "formazione", "attestation"],
        signalIds: [train.id],
      });
    }

    for (const lang of data.languageItems) {
      push(items, {
        id: `language-${lang.language.toLowerCase().replace(/\s+/g, "-")}`,
        topic: "language",
        claimType: "language",
        text: `${lang.language}: ${lang.level}`,
        keywordSources: [lang.language, "language", "languages", "lingue"],
      });
    }

    for (const stream of data.stackStreams) {
      push(items, {
        id: `stack-${stream.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        topic: "skills_stream",
        claimType: "skill",
        domain: stream.label,
        text: `${stream.label}: ${stream.description} Topics: ${stream.items.join(", ")}.`,
        keywordSources: [stream.label, "skills", "tools", "frameworks", ...stream.items.slice(0, 16)],
      });
    }

    for (const domain of data.radarDomains) {
      const claimType = radarClaimType(domain);
      push(items, {
        id: domain.id,
        topic: "radar_domain",
        claimType,
        domain: domain.title,
        status: domain.maturity,
        text: `${domain.title} (${domain.maturity}; ${domain.category}). ${toThirdPersonSafe(domain.explanation)} Focus areas: ${(domain.signals || []).join("; ")}.`,
        keywordSources: [domain.title, domain.maturity, ...(domain.signals || [])],
        keywords: ["risk", "radar", "domain"],
        signalIds: [domain.id],
      });
    }

    for (const lens of data.roleLenses) {
      const lensId = `role-lens-${String(lens.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      push(items, {
        id: lensId,
        topic: "role_lens",
        claimType: "career_direction",
        domain: lens.label || lens.name,
        text: `Role lens "${lens.label || lens.name}": ${toThirdPersonSafe(lens.explanation)} Signals: ${(lens.signals || []).join("; ")}.`,
        keywordSources: [lens.name, lens.label, "role lens", "career direction", ...(lens.signals || [])],
        // Avoid ultra-short "fit" pollution.
        keywords: ["lens", "orientation"],
      });
    }

    for (const m of journey.journeyMilestones) {
      const period =
        m.startYear && m.endYear && m.endYear !== m.startYear
          ? `${m.startYear}–${m.endYear}`
          : m.monthLabel
            ? `${m.monthLabel} ${m.year}`
            : String(m.year);
      const narrative = [m.narrativeHeading, m.narrativeBody, m.narrativeContext, m.narrativeDetail]
        .filter(Boolean)
        .join(" ");
      push(items, {
        id: m.id,
        topic: "journey",
        claimType: "timeline_context",
        text: compact(
          toThirdPersonSafe(
            `${m.title}${m.subtitle ? ` — ${m.subtitle}` : ""} (${period}; ${m.type}). ${m.explanation || ""} ${narrative}`.trim(),
          ),
        ),
        keywordSources: [m.title, m.subtitle, m.type, "journey", "timeline"],
      });
    }

    const preferred = mobility.preferredLocations.map((l) => `${l.city}, ${l.country}`).join("; ");
    const beyond = mobility.beyondEuropeRegions
      .map((r) => `${r.region}: ${r.cities.join(", ")}`)
      .join("; ");
    push(items, {
      id: "mobility-overview",
      topic: "mobility",
      claimType: "mobility",
      status: "preference",
      text: `Current base: ${mobility.currentBase.city}, ${mobility.currentBase.country}. Preferred European locations: ${preferred}. Beyond Europe interest regions: ${beyond}.`,
      keywordSources: [
        "mobility",
        "relocation",
        "relocate",
        "abroad",
        "estero",
        "trasferimento",
        "trasferirsi",
        "location",
        "milan",
        "europe",
      ],
    });

    for (const n of professionalNarrative) {
      push(items, {
        id: n.id,
        topic: "professional_narrative",
        claimType: "career_direction",
        narrativeType: n.narrativeType,
        status: "authorized_narrative",
        domain: n.narrativeType,
        text: n.text,
        keywordSources: [n.narrativeType, ...(n.keywords || [])],
        keywords: ["career direction", "professional narrative", "trajectory"],
        signalIds: n.signalIds || [],
      });
    }

    const stableJson = JSON.stringify(items, null, 2);
    const banner = `/**
 * AUTO-GENERATED by scripts/generate-assistant-knowledge.mjs — do not edit by hand.
 * Derived from canonical public portfolio data (excludes assistantPrompts / signalMap as fact sources).
 * Generated: ${new Date().toISOString()}
 * Items: ${items.length}
 */
`;
    const body = `${banner}export const KNOWLEDGE_PACK_VERSION = 3;\n\n/** @typedef {'profile'|'employment_current'|'employment_past'|'project_personal'|'education'|'credential_completed'|'credential_in_progress'|'credential_planned'|'training'|'skill'|'capability_demonstrated'|'capability_developing'|'regulatory_knowledge'|'career_direction'|'language'|'mobility'|'timeline_context'} AssistantClaimType */\n\n/** @type {ReadonlyArray<{ id: string, topic: string, claimType: AssistantClaimType, text: string, keywords: string[], employer?: string, status?: string, domain?: string, narrativeType?: string, signalIds?: string[] }>} */\nexport const knowledgeItems = Object.freeze(${stableJson});\n`;

    return { body, items, notes };
  } finally {
    await server.close();
  }
}

/** Strip volatile Generated timestamp for freshness comparison. */
function normalizePackSource(source) {
  return String(source || "").replace(/^ \* Generated:.*$/m, " * Generated: <stable>");
}

async function main() {
  const { body, items, notes } = await buildPack();

  if (checkMode) {
    let existing = "";
    try {
      existing = readFileSync(outPath, "utf8");
    } catch {
      console.error(`Knowledge pack missing at ${outPath}`);
      process.exit(1);
    }
    if (normalizePackSource(existing) !== normalizePackSource(body)) {
      console.error(
        "Stale assistant knowledge pack: regenerating would change workers/portfolio-assistant/src/knowledge/pack.js.\nRun: npm run generate:assistant-knowledge",
      );
      process.exit(1);
    }
    console.log(`Knowledge pack freshness OK (${items.length} items).`);
    return;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body, "utf8");
  console.log(`Wrote ${items.length} knowledge items → ${outPath}`);
  for (const note of notes) console.log(`NOTE: ${note}`);
  const largest = [...items].sort((a, b) => b.text.length - a.text.length)[0];
  console.log(`Largest item: ${largest?.id} (${largest?.text.length} chars)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
