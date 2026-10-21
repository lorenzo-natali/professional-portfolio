/**
 * @vitest-environment node
 * Bilingual retrieval regression set from the 52-question audit, plus paraphrases.
 * Relevance labels are the audit judgments. Required ids must be selected.
 */
import { describe, expect, it } from "vitest";
import { analyzeQuery, retrieveKnowledge } from "../src/knowledge/retrieve.js";

const CURRENT = "experience-banca-profilo";
const PAST = "experience-boc";
const BOUNDARY = "narrative-ai-governance-rationale";
const DIRECTION = "narrative-long-term-direction";
const CISA = "credential-cisa";

/**
 * @type {Array<{ id: string, lang: "it" | "en", q: string, primary: string[], relevant: string[], baselinePass: boolean }>}
 */
export const AUDIT = [
  { id: "t1-it", lang: "it", q: "Qual è il ruolo attuale di Lorenzo Natali presso Banca Profilo e di quali attività si occupa concretamente?", primary: [CURRENT], relevant: [CURRENT, "profile-lorenzo-natali", "capability-technology-risk", BOUNDARY], baselinePass: true },
  { id: "t1-en", lang: "en", q: "What is Lorenzo Natali's current role at Banca Profilo and which activities does he actually perform?", primary: [CURRENT], relevant: [CURRENT, "profile-lorenzo-natali", "capability-technology-risk", BOUNDARY], baselinePass: true },
  { id: "t2-it", lang: "it", q: "Qual è l'esperienza concreta di Lorenzo nell'ambito del regolamento DORA e quali verifiche ha svolto?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: false },
  { id: "t2-en", lang: "en", q: "What is Lorenzo's concrete experience with the DORA regulation and which audits has he performed?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "t3-it", lang: "it", q: "In che modo Lorenzo contribuisce alla governance dell'intelligenza artificiale presso Banca Profilo e quali framework normativi e standard utilizza?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", BOUNDARY, "radar-ai-model-governance"], baselinePass: true },
  { id: "t3-en", lang: "en", q: "How does Lorenzo contribute to AI governance at Banca Profilo and which regulatory frameworks and standards does he use?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", BOUNDARY, "radar-ai-model-governance"], baselinePass: true },
  { id: "cur-emp-it", lang: "it", q: "Dove lavora attualmente Lorenzo?", primary: [CURRENT], relevant: [CURRENT, "profile-lorenzo-natali"], baselinePass: true },
  { id: "cur-emp-en", lang: "en", q: "Where does Lorenzo work now?", primary: [CURRENT], relevant: [CURRENT, "profile-lorenzo-natali"], baselinePass: true },
  { id: "pillar-it", lang: "it", q: "Presso quale datore di lavoro Lorenzo ha svolto audit sul Pillar I di DORA?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "pillar-en", lang: "en", q: "Which employer did Lorenzo work for when performing DORA Pillar I audits?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "change-it", lang: "it", q: "Qual è l'esperienza di Lorenzo nella gestione dei cambiamenti ICT?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "change-en", lang: "en", q: "What is Lorenzo's experience with ICT change management?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "incident-it", lang: "it", q: "Quali verifiche ha svolto Lorenzo sulla gestione degli incidenti ICT?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk", "radar-operational-resilience"], baselinePass: false },
  { id: "incident-en", lang: "en", q: "Which audits has Lorenzo performed on ICT incident management?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk", "radar-operational-resilience"], baselinePass: true },
  { id: "out-it", lang: "it", q: "Che esperienza ha Lorenzo sull'esternalizzazione ICT e sui fornitori terzi?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "out-en", lang: "en", q: "What is Lorenzo's experience with ICT outsourcing and third-party ICT risk?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: false },
  { id: "or-it", lang: "it", q: "Qual è l'esperienza di Lorenzo sulla resilienza operativa digitale?", primary: [CURRENT], relevant: [CURRENT, PAST, "radar-operational-resilience", "capability-technology-risk"], baselinePass: true },
  { id: "or-en", lang: "en", q: "What is Lorenzo's experience with digital operational resilience?", primary: [CURRENT], relevant: [CURRENT, PAST, "radar-operational-resilience", "capability-technology-risk"], baselinePass: true },
  { id: "bc-it", lang: "it", q: "Che esperienza ha Lorenzo su business continuity, BIA, BCP e DRP?", primary: [PAST], relevant: [PAST, "radar-operational-resilience"], baselinePass: true },
  { id: "bc-en", lang: "en", q: "What experience does Lorenzo have with business continuity, BIA, BCP and DRP?", primary: [PAST], relevant: [PAST, "radar-operational-resilience"], baselinePass: true },
  { id: "boc-it", lang: "it", q: "Che cosa ha fatto Lorenzo presso Bank of China prima di entrare in Banca Profilo?", primary: [PAST], relevant: [PAST, CURRENT, "journey-boc"], baselinePass: true },
  { id: "boc-en", lang: "en", q: "What did Lorenzo do at Bank of China before joining Banca Profilo?", primary: [PAST], relevant: [PAST, CURRENT, "journey-boc"], baselinePass: true },
  { id: "diff-it", lang: "it", q: "In che modo il ruolo attuale di Lorenzo differisce da quello precedente in Bank of China?", primary: [CURRENT, PAST], relevant: [CURRENT, PAST], baselinePass: true },
  { id: "diff-en", lang: "en", q: "How does Lorenzo's current role differ from his previous role at Bank of China?", primary: [CURRENT, PAST], relevant: [CURRENT, PAST], baselinePass: true },
  { id: "aiact-it", lang: "it", q: "Come utilizza Lorenzo l'EU AI Act nel suo lavoro?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", "radar-ai-model-governance"], baselinePass: true },
  { id: "aiact-en", lang: "en", q: "How does Lorenzo use the EU AI Act in his work?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", "radar-ai-model-governance"], baselinePass: true },
  { id: "nist-en", lang: "en", q: "What is Lorenzo's experience with the NIST AI RMF?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", "radar-ai-model-governance"], baselinePass: false },
  { id: "nist-it", lang: "it", q: "Qual è l'esperienza di Lorenzo con il NIST AI RMF?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance", "radar-ai-model-governance"], baselinePass: false },
  { id: "iso42001", lang: "en", q: "How does Lorenzo use ISO/IEC 42001?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance"], baselinePass: true },
  { id: "iso42005", lang: "en", q: "What is Lorenzo's exposure to ISO/IEC 42005?", primary: [CURRENT], relevant: [CURRENT, "capability-ai-governance"], baselinePass: true },
  { id: "iso42006", lang: "en", q: "How should Lorenzo's use of ISO/IEC 42006 be described?", primary: [CURRENT], relevant: [CURRENT, BOUNDARY], baselinePass: true },
  { id: "tech-en", lang: "en", q: "Is Lorenzo currently an ICT Risk Manager?", primary: [CURRENT], relevant: [CURRENT, DIRECTION, "capability-technology-risk", "radar-technology-ict-risk"], baselinePass: true },
  { id: "tech-it", lang: "it", q: "Lorenzo è attualmente un ICT Risk Manager?", primary: [CURRENT], relevant: [CURRENT, DIRECTION, "capability-technology-risk"], baselinePass: true },
  { id: "aigov-en", lang: "en", q: "Did Lorenzo own Banca Profilo's AI Policy?", primary: [CURRENT, BOUNDARY], relevant: [CURRENT, BOUNDARY, "capability-ai-governance"], baselinePass: false },
  { id: "aigov-it", lang: "it", q: "Lorenzo è proprietario della AI Policy di Banca Profilo?", primary: [BOUNDARY], relevant: [BOUNDARY, CURRENT, "capability-ai-governance"], baselinePass: false },
  { id: "ia-en", lang: "en", q: "What is Lorenzo's internal audit experience?", primary: [CURRENT], relevant: [CURRENT, PAST, "capability-audit-control"], baselinePass: true },
  { id: "ia-it", lang: "it", q: "Qual è l'esperienza di Lorenzo nella revisione interna e nell'audit informatico?", primary: [CURRENT], relevant: [CURRENT, PAST, "capability-audit-control"], baselinePass: true },
  { id: "radar-en", lang: "en", q: "Which risk exposure domains does the radar list?", primary: ["radar-domain-index"], relevant: ["radar-domain-index"], baselinePass: true },
  { id: "proj-en", lang: "en", q: "What personal AI projects has Lorenzo built?", primary: ["project-codeiak", "project-ai-audit-workflow"], relevant: ["project-codeiak", "project-ai-audit-workflow"], baselinePass: true },
  { id: "codeiak-it", lang: "it", q: "Che cos'è CodeIAK?", primary: ["project-codeiak"], relevant: ["project-codeiak"], baselinePass: true },
  { id: "cbi-en", lang: "en", q: "What is Cognitive Behavior Intelligence?", primary: ["project-ai-audit-workflow"], relevant: ["project-ai-audit-workflow"], baselinePass: true },
  { id: "cisa-en", lang: "en", q: "Is Lorenzo CISA certified?", primary: [CISA], relevant: [CISA], baselinePass: true },
  { id: "cisa-it", lang: "it", q: "Lorenzo è certificato CISA?", primary: [CISA], relevant: [CISA], baselinePass: true },
  { id: "certs-en", lang: "en", q: "Which professional certifications does Lorenzo hold?", primary: [CISA], relevant: [CISA, "credential-crisc", "credential-aair", "credential-frm"], baselinePass: true },
  { id: "career-en", lang: "en", q: "Is technology risk Lorenzo's current job or a career direction?", primary: [CURRENT, DIRECTION], relevant: [CURRENT, DIRECTION, "capability-technology-risk"], baselinePass: false },
  { id: "career-it", lang: "it", q: "Qual è la direzione professionale di Lorenzo nel lungo periodo?", primary: [DIRECTION], relevant: [DIRECTION, "narrative-development-strategy", CURRENT], baselinePass: true },
  { id: "reg-en", lang: "en", q: "What banking regulation has Lorenzo worked on, including RAF, ICAAP and AML?", primary: [PAST], relevant: [PAST, "capability-banking-risk", "radar-regulatory-compliance-risk"], baselinePass: true },
  { id: "third-en", lang: "en", q: "Where did Lorenzo assess third-party ICT risk?", primary: [CURRENT], relevant: [CURRENT, "capability-technology-risk"], baselinePass: false },
  { id: "adv-boc-dora", lang: "it", q: "Ha svolto audit DORA presso Bank of China?", primary: [CURRENT, PAST], relevant: [CURRENT, PAST, "capability-technology-risk"], baselinePass: false },
  { id: "adv-own", lang: "en", q: "Did Lorenzo own Banca Profilo's AI Policy?", primary: [BOUNDARY, CURRENT], relevant: [BOUNDARY, CURRENT], baselinePass: false },
  { id: "adv-ict-mgr", lang: "en", q: "Is Lorenzo currently an ICT Risk Manager?", primary: [CURRENT], relevant: [CURRENT, DIRECTION], baselinePass: true },
  { id: "adv-pillar-emp", lang: "en", q: "Which employer did Lorenzo work for when performing DORA Pillar I audits?", primary: [CURRENT], relevant: [CURRENT], baselinePass: true },
];

function selectedIds(question) {
  return retrieveKnowledge(question).map((hit) => hit.id);
}

function evaluate(rows) {
  let relevantHits = 0;
  let selectedCount = 0;
  let reciprocal = 0;
  const failed = [];
  for (const row of rows) {
    const ids = selectedIds(row.q);
    const full = retrieveKnowledge(row.q, { limit: 80, minScore: -100 });
    const missing = row.primary.filter((id) => !ids.includes(id));
    if (missing.length) failed.push({ id: row.id, missing, ids });
    const ranks = row.primary.map((id) => full.findIndex((hit) => hit.id === id) + 1).filter((rank) => rank > 0);
    if (ranks.length) reciprocal += 1 / Math.min(...ranks);
    selectedCount += ids.length;
    relevantHits += ids.filter((id) => row.relevant.includes(id)).length;
  }
  return {
    n: rows.length,
    pass: rows.length - failed.length,
    failed,
    recall: (rows.length - failed.length) / rows.length,
    precision: selectedCount ? relevantHits / selectedCount : 0,
    mrr: reciprocal / rows.length,
    averageCount: selectedCount / rows.length,
  };
}

describe("bilingual normalization", () => {
  it("maps Italian incident wording onto incident evidence terms", () => {
    const analysis = analyzeQuery("Quali verifiche ha svolto Lorenzo sulla gestione degli incidenti ICT?");
    expect(analysis.tokens).toEqual(expect.arrayContaining(["incident", "audit", "performed", "ict"]));
    expect(analysis.concepts).toContain("ict_incident");
  });

  it("maps outsourcing, third parties, and hyphenated English terms", () => {
    const italian = analyzeQuery("Che esperienza ha Lorenzo sull'esternalizzazione ICT e sui fornitori terzi?");
    expect(italian.tokens).toContain("outsourcing");
    expect(italian.concepts).toEqual(expect.arrayContaining(["ict_outsourcing", "third_party"]));
    const english = analyzeQuery("What experience does Lorenzo have with third-party ICT risk?");
    expect(english.tokens).toEqual(expect.arrayContaining(["third", "party", "ict"]));
    expect(english.concepts).toContain("third_party");
  });

  it("keeps employer names, DORA, and accent folding distinct", () => {
    const analysis = analyzeQuery("Qual è l'esperienza concreta sul regolamento DORA presso Banca Profilo?");
    expect(analysis.normalized).toContain("regolamento dora");
    expect(analysis.concepts).toEqual(expect.arrayContaining(["dora", "banca_profilo", "experience"]));
    expect(analysis.normalized).not.toContain("è");
  });

  it("maps AI Policy ownership wording without treating it as a completed certification", () => {
    const analysis = analyzeQuery("Lorenzo era responsabile della AI Policy di Banca Profilo?");
    expect(analysis.tokens).toContain("ownership");
    expect(analysis.concepts).toContain("ai_policy");
    expect(analysis.concepts).not.toContain("cisa");
  });
});

describe("audit acceptance cases", () => {
  it("ranks Banca Profilo first for the Italian DORA audit question", () => {
    const hits = retrieveKnowledge("Qual è l'esperienza concreta di Lorenzo nell'ambito del regolamento DORA e quali verifiche ha svolto?");
    expect(hits[0]?.id).toBe(CURRENT);
    expect(hits[0]?.claimType).toBe("employment_current");
    expect(hits.some((hit) => hit.id === PAST)).toBe(true);
  });

  it("retrieves Banca Profilo for Italian ICT incident audits", () => {
    const hits = retrieveKnowledge("Quali verifiche ha svolto Lorenzo sulla gestione degli incidenti ICT?");
    expect(hits.some((hit) => hit.id === CURRENT)).toBe(true);
    expect(hits.findIndex((hit) => hit.id === CURRENT)).toBeLessThan(3);
  });

  it("retrieves Banca Profilo for ICT outsourcing and third-party ICT risk", () => {
    for (const question of [
      "What experience does Lorenzo have with ICT outsourcing?",
      "What is Lorenzo's experience with ICT outsourcing and third-party ICT risk?",
      "What experience does Lorenzo have with third-party ICT risk?",
      "Where did Lorenzo assess third-party ICT risk?",
    ]) {
      const hits = retrieveKnowledge(question);
      expect(hits.some((hit) => hit.id === CURRENT), question).toBe(true);
    }
  });

  it("retrieves the AI Policy contribution and the non-ownership boundary", () => {
    for (const question of [
      "Did Lorenzo own Banca Profilo's AI Policy?",
      "Lorenzo era responsabile della AI Policy di Banca Profilo?",
      "Lorenzo è proprietario della AI Policy di Banca Profilo?",
    ]) {
      const hits = retrieveKnowledge(question);
      expect(hits.some((hit) => hit.id === CURRENT), question).toBe(true);
      expect(hits.some((hit) => hit.id === BOUNDARY), question).toBe(true);
      expect(hits.find((hit) => hit.id === BOUNDARY)?.text).toMatch(/not ownership/i);
    }
  });

  it("separates the current IT audit role from Technology Risk as a direction", () => {
    for (const question of [
      "Is Lorenzo currently a Technology Risk Manager, or is that a professional direction?",
      "Is technology risk Lorenzo's current job or a career direction?",
    ]) {
      const hits = retrieveKnowledge(question);
      expect(hits.some((hit) => hit.id === CURRENT), question).toBe(true);
      expect(hits.some((hit) => hit.id === DIRECTION), question).toBe(true);
      expect(hits.find((hit) => hit.id === DIRECTION)?.text).toMatch(/not a role already held/i);
    }
  });

  it("keeps Bank of China for a DORA question that names Bank of China, and still shows Pillar I at Banca Profilo", () => {
    const hits = retrieveKnowledge("Ha svolto audit DORA presso Bank of China?");
    expect(hits.some((hit) => hit.id === PAST)).toBe(true);
    expect(hits.some((hit) => hit.id === CURRENT)).toBe(true);
    expect(hits.find((hit) => hit.id === CURRENT)?.text).toMatch(/DORA Pillar I/);
  });
});

describe("52-question audit matrix", () => {
  const result = evaluate(AUDIT);

  it("keeps every previously passing audit question passing", () => {
    const regressions = result.failed.filter((failure) => AUDIT.find((row) => row.id === failure.id)?.baselinePass);
    expect(regressions).toEqual([]);
  });

  it("restores the previously failing audit questions", () => {
    const stillFailing = result.failed.map((failure) => failure.id);
    expect(stillFailing).toEqual([]);
  });

  it("improves required recall past the partial simulation and raises precision", () => {
    expect(AUDIT).toHaveLength(52);
    expect(result.pass).toBeGreaterThan(45);
    expect(result.recall).toBeGreaterThan(45 / 52);
    expect(result.precision).toBeGreaterThan(0.36);
    expect(result.mrr).toBeGreaterThan(0.74);
    expect(result.averageCount).toBeLessThanOrEqual(6);
    expect(result.averageCount).toBeGreaterThan(1);
  });

  it("does not let Italian required-evidence recall fall behind the baseline", () => {
    const italian = evaluate(AUDIT.filter((row) => row.lang === "it"));
    const english = evaluate(AUDIT.filter((row) => row.lang === "en"));
    expect(italian.recall).toBeGreaterThanOrEqual(16 / 21);
    expect(english.recall).toBeGreaterThanOrEqual(25 / 31);
  });
});

describe("paraphrases withheld from the scoring adjustments", () => {
  it("still finds Banca Profilo, Bank of China, CISA, and CodeIAK", () => {
    expect(retrieveKnowledge("Quali controlli DORA Pillar I ha verificato Lorenzo in banca?")[0]?.id).toBe(CURRENT);
    expect(retrieveKnowledge("Cosa faceva Lorenzo in Bank of China sull'audit interno?")[0]?.id).toBe(PAST);
    expect(retrieveKnowledge("La certificazione CISA è già completata?").some((hit) => hit.id === CISA && hit.claimType === "credential_in_progress")).toBe(true);
    expect(retrieveKnowledge("Parlami del progetto CodeIAK")[0]?.id).toBe("project-codeiak");
    expect(retrieveKnowledge("Which personal project explores AI governance behaviour?")[0]?.id).toBe("project-ai-audit-workflow");
  });
});
