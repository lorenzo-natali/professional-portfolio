/**
 * Canonical public Professional Narrative for the Portfolio Assistant.
 * Authorized career-direction statements — not employment claims, not psychology.
 * Consumed by scripts/generate-assistant-knowledge.mjs into typed knowledge items.
 */

/**
 * @typedef {'long_term_direction'|'audit_foundation'|'hybrid_positioning'|'sector_specialization'|'cross_sector_openness'|'development_strategy'|'ai_governance_rationale'|'common_thread'|'academic_path'|'audit_choice'|'technical_practice'|'learning_approach'} NarrativeType
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
      "Longer-term professional direction: progressively move from third-line assurance / Internal and IT Audit toward Technology Governance, Information Security Governance and, increasingly, AI Governance. The intended trajectory is toward first-line / second-line or comparable governance and risk functions that participate more directly in how technology risks, governance frameworks and controls are designed, implemented, monitored and challenged. Further stated interests, still direction rather than roles held, include data and model governance, AI-enabled process automation, and technology strategy and governance. No executive title is stated. This describes direction, not a role already held.",
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
      "Longer term, the governance/risk profile is intended to remain transferable beyond banking. Explicit career interests include highly regulated or technology-intensive sectors where Technology Risk, Information Security Governance or AI Governance are strategically relevant — including pharmaceutical / life sciences, Big Tech / major technology companies, and consulting. These are career interests, not past professional experience in those sectors.",
    keywords: [
      "outside banking",
      "other industries",
      "other sectors",
      "pharma",
      "pharmaceutical",
      "life sciences",
      "big tech",
      "consulting",
      "consulenza",
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
      "Interest in AI Governance comes from the intersection of technology, risk, controls, governance and regulation. AI Governance is framed as a coherent evolution of the existing trajectory rather than an unrelated move into AI. At Banca Profilo, within Internal Audit, Lorenzo contributed to the development of the Bank's internal AI Policy and participated in a dedicated Internal Audit engagement concerning that policy. The engagement was specific to the AI Policy, not a general discussion of AI risk inside an unrelated audit. That contribution is not sole authorship, that participation is not leadership of the engagement, and this work is not ownership of the Bank's AI Governance framework, not a formal second-line AI Governance role, and not enterprise-wide decision authority. Personal AI/software projects provide separate hands-on technical exposure and are not themselves professional AI Governance employment.",
    keywords: [
      "why ai governance",
      "interested in ai governance",
      "perché ai governance",
      "perché ti interessa",
      "ai governance",
      "rationale",
      "ai policy audit",
      "audit of the ai policy",
      "dedicated audit engagement",
      "revisione della policy",
      "audit della policy",
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
  {
    id: "narrative-academic-path",
    narrativeType: "academic_path",
    text:
      "Lorenzo describes his university path as gradual exploration, not a career plan that was fixed from the start. He began in Banking, Insurance and Financial Sciences, then completed a bachelor's degree in Languages for International Relations with English and Mandarin Chinese. During those studies he developed stated interests in macroeconomics, international finance, history, international cultures and international economic relations. A personal interest in philanthropy and international cooperation, which is not a professional qualification or a job, contributed to his choice of a master's in International Cooperation for Development focused on development economics. He later chose a postgraduate master's in auditing, accounting and sustainability reporting to add practical technical training. He states that his Mandarin and international-relations studies made the Internal Auditor opportunity at Bank of China feel aligned with that international profile. That is his stated view, not an account of why the bank hired him. History, philanthropy and cultural interests are context for his choices, not formal credentials or professional achievements.",
    keywords: [
      "academic path",
      "academic choices",
      "interdisciplinary",
      "why did you study",
      "percorso accademico",
      "scelte accademiche",
      "perché hai studiato",
      "philanthropy",
      "filantropia",
      "international cooperation",
      "cooperazione internazionale",
      "development economics",
      "economia dello sviluppo",
      "history",
      "storia",
      "international cultures",
      "culture internazionali",
    ],
  },
  {
    id: "narrative-audit-choice",
    narrativeType: "audit_choice",
    text:
      "Lorenzo states that his interest in internal audit developed during his postgraduate studies in auditing, accounting and sustainability reporting. What he says attracted him was a cross-functional view of how business processes, internal controls, risk management and governance fit together, not only the verification of financial information. His accounting and administration internship at Prelios exposed him to financial reporting and enterprise systems. He states that this experience helped him see that a career focused only on accounting was not his preferred long-term direction, and that this reinforced his interest in internal audit. His later move toward IT audit and technology risk was, in his account, deliberate, and he then joined Banca Profilo as an IT Audit Specialist. These are stated motivations. They do not add audit duties to the Prelios internship, and they do not make the Bank of China role an IT Audit Specialist position.",
    keywords: [
      "why internal audit",
      "why audit",
      "choose internal audit",
      "attracted to auditing",
      "perché audit",
      "perché ha scelto",
      "scelta dell'audit",
      "preferred direction",
      "accounting was not",
    ],
    signalIds: ["experience-prelios", "experience-banca-profilo"],
  },
  {
    id: "narrative-technical-practice",
    narrativeType: "technical_practice",
    text:
      "Lorenzo's formal academic background is primarily in international relations, development economics, accounting and auditing, while his technical capabilities in programming and AI have been developed through independent learning, experimentation and personal projects. He states that this practical work includes Python and automation, local language models, retrieval-augmented generation, AI agents and agentic workflows, multi-model orchestration, and AI-assisted development with Cursor and Cline. The portfolio identifies two of those projects. CodeIAK is a local-first AI coding agent with multi-model orchestration, structured agentic workflows and offline execution. Cognitive Behavior Intelligence is a personal AI-governance prototype concerned with auditability, traceability and frameworks including the EU AI Act, NIST AI RMF, ISO/IEC 42001 and COBIT. The portfolio does not attribute Cursor, Cline, Python or RAG to a specific project architecture or to any employer. This personal practice is not professional software-engineering employment and not an enterprise AI implementation at a bank. When asked directly, he has no formal degree in computer science or software engineering; that absence is a clarification, not a deficiency.",
    keywords: [
      "python",
      "cursor",
      "cline",
      "rag",
      "local llm",
      "local language models",
      "personal projects",
      "progetti personali",
      "independent learning",
      "apprendimento autonomo",
      "sperimentazione",
      "ai agents",
      "agentic",
    ],
    signalIds: ["project-codeiak", "project-ai-audit-workflow"],
  },
  {
    id: "narrative-learning-approach",
    narrativeType: "learning_approach",
    text:
      "Lorenzo states a learning method with three parts: study the theoretical principles, frameworks and regulatory requirements of a domain; experiment directly with the technology and build prototypes; then consider how it could be used in an organization and which risks, governance requirements and controls that use would create. He presents this as his stated way of exploring a new technology, not as a personality trait, a qualification, a claim of superior ability, or a duty of his current role. Personal technical exploration continues alongside his professional work. It is not itself that professional work.",
    keywords: [
      "learning approach",
      "learning method",
      "how do you learn",
      "learn a new",
      "learning style",
      "come impari",
      "come affronta",
      "apprendimento",
      "metodo di apprendimento",
      "hands-on learning",
      "sperimentazione pratica",
    ],
    signalIds: ["project-codeiak"],
  },
]);
