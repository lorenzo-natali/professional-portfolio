/**
 * Canonical public Professional Narrative for the Portfolio Assistant.
 * Authorized career-direction statements — not employment claims, not psychology.
 * Consumed by scripts/generate-assistant-knowledge.mjs into typed knowledge items.
 */

/**
 * @typedef {'long_term_direction'|'audit_foundation'|'hybrid_positioning'|'sector_specialization'|'cross_sector_openness'|'development_strategy'|'ai_governance_rationale'|'common_thread'} NarrativeType
 */

/**
 * @type {ReadonlyArray<{
 *   id: string,
 *   narrativeType: NarrativeType,
 *   text: string,
 *   keywords?: string[],
 *   signalIds?: string[],
 * }>}
 */
export const professionalNarrative = Object.freeze([
  {
    id: "narrative-long-term-direction",
    narrativeType: "long_term_direction",
    text:
      "Longer-term professional direction: progressively move from third-line assurance / Internal and IT Audit toward Technology Governance, Information Security Governance and, increasingly, AI Governance. The intended trajectory is toward first-line / second-line or comparable governance and risk functions that participate more directly in how technology risks, governance frameworks and controls are designed, implemented, monitored and challenged. This describes direction, not a role already held.",
    keywords: [
      "career direction",
      "long-term goals",
      "career goals",
      "career trajectory",
      "future direction",
      "next step",
      "professional evolution",
      "direzione professionale",
      "obiettivi di carriera",
      "obiettivi a lungo termine",
      "percorso professionale",
      "evoluzione professionale",
      "prossimo passo",
      "governance",
      "ai governance",
    ],
    signalIds: ["capability-ai-governance", "capability-information-security", "capability-technology-risk"],
  },
  {
    id: "narrative-audit-foundation",
    narrativeType: "audit_foundation",
    text:
      "IT Audit is treated as a foundation rather than only an end-state specialization. Audit experience builds understanding of how controls are designed, how they operate, where they fail, how governance frameworks are assessed, and how technology and regulatory risks translate into control requirements. That foundation is intended to support a future transition from independently assessing governance and controls toward contributing more directly to their design, implementation and oversight.",
    keywords: [
      "why audit",
      "audit foundation",
      "from audit",
      "into governance",
      "perché audit",
      "it audit",
      "internal audit",
      "controls",
      "governance",
    ],
    signalIds: ["experience-banca-profilo", "experience-boc", "capability-audit-control"],
  },
  {
    id: "narrative-hybrid-positioning",
    narrativeType: "hybrid_positioning",
    text:
      "Intended hybrid professional positioning at the intersection of banking / financial-services risk, technology and ICT risk, information security governance, regulatory and control frameworks, AI governance and AI risk, and practical understanding of AI/software systems. The intended differentiator is combining governance/risk methodology with technology understanding — not positioning as either a purely traditional auditor or a pure software engineer.",
    keywords: [
      "hybrid profile",
      "professional positioning",
      "differentiates",
      "traditional it auditor",
      "banking professional",
      "technology-risk professional",
      "profilo ibrido",
      "come definiresti",
      "profilo professionale",
    ],
    signalIds: [
      "capability-audit-control",
      "capability-banking-risk",
      "capability-technology-risk",
      "capability-information-security",
      "capability-ai-governance",
    ],
  },
  {
    id: "narrative-sector-specialization",
    narrativeType: "sector_specialization",
    text:
      "Banking and financial services are the strongest current sector specialization. Professional experience in regulated financial environments provides the main vertical foundation of the profile. This does not mean banking is the only sector of interest.",
    keywords: [
      "banking",
      "financial services",
      "sector specialization",
      "settore bancario",
      "banking professional",
    ],
    signalIds: ["experience-boc", "experience-banca-profilo", "capability-banking-risk"],
  },
  {
    id: "narrative-cross-sector-openness",
    narrativeType: "cross_sector_openness",
    text:
      "Longer term, the governance/risk profile is intended to remain transferable beyond banking. Explicit career interests include highly regulated or technology-intensive sectors where Technology Risk, Information Security Governance or AI Governance are strategically relevant — including pharmaceutical / life sciences and Big Tech / major technology companies. These are career interests, not past professional experience in those sectors.",
    keywords: [
      "outside banking",
      "other industries",
      "other sectors",
      "pharma",
      "pharmaceutical",
      "life sciences",
      "big tech",
      "fuori dal settore bancario",
      "altri settori",
      "farmaceutico",
      "trasferibile",
      "cross sector",
    ],
    signalIds: ["capability-technology-risk", "capability-information-security", "capability-ai-governance"],
  },
  {
    id: "narrative-development-strategy",
    narrativeType: "development_strategy",
    text:
      "Development strategy for the transition combines complementary components: professional experience in Internal / IT Audit; increasing exposure to technology risk and governance; targeted professional certifications (including CISA in progress and planned credentials); regulatory/framework knowledge; and hands-on personal AI/software projects. Certifications that remain in progress or planned must not be described as completed.",
    keywords: [
      "preparing",
      "preparation",
      "transition",
      "development strategy",
      "how preparing",
      "come ti stai preparando",
      "transizione",
      "certification",
      "cisa",
    ],
    signalIds: [
      "experience-banca-profilo",
      "credential-cisa",
      "project-codeiak",
      "project-ai-audit-workflow",
      "capability-technology-risk",
    ],
  },
  {
    id: "narrative-ai-governance-rationale",
    narrativeType: "ai_governance_rationale",
    text:
      "Interest in AI Governance comes from the intersection of technology, risk, controls, governance and regulation. AI Governance is framed as a coherent evolution of the existing trajectory rather than an unrelated move into AI. Personal AI/software projects provide hands-on technical exposure; the professional background provides the risk/control perspective. Project exposure is not professional AI Governance employment.",
    keywords: [
      "why ai governance",
      "interested in ai governance",
      "perché ai governance",
      "perché ti interessa",
      "ai governance",
      "rationale",
    ],
    signalIds: ["capability-ai-governance", "project-ai-audit-workflow", "project-codeiak", "radar-ai-model-governance"],
  },
  {
    id: "narrative-common-thread",
    narrativeType: "common_thread",
    text:
      "Authorized common-thread interpretation of the intended trajectory: moving progressively closer to the intersection between technology and governance — assurance → understanding controls → technology risk → governance → AI governance. Some stages describe direction rather than completed career stages or past employment.",
    keywords: [
      "common thread",
      "filo conduttore",
      "recurring theme",
      "trajectory",
      "percorso",
      "evoluzione",
    ],
    signalIds: ["capability-audit-control", "capability-technology-risk", "capability-ai-governance"],
  },
]);
