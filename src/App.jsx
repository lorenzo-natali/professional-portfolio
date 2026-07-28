import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Brain,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  GraduationCap,
  Languages,
  Lock,
  ShieldCheck,
} from "lucide-react";
import CodeiakMascotVideo from "./components/CodeiakMascotVideo";
import {
  DEFAULT_APP_FEATURES,
  resolveAppFeatures,
} from "./diagnostics/appFeatures.js";
import "./index.css";

/**
 * @typedef {{
 *   ARGovernanceCard?: import("react").ComponentType<{ onLaunch: () => void }>,
 *   ARGovernanceView?: import("react").ComponentType<{ open: boolean, onClose: () => void }>,
 *   shouldLaunchBeyondCvFromLocation?: (loc?: Location | { search?: string, hash?: string, href?: string }) => boolean,
 * }} BeyondModules
 */

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

const expertise = [
  {
    id: "capability-audit-control",
    title: "Internal Audit & Assurance",
    icon: ShieldCheck,
    text: "Risk-based internal audit, control testing, working papers and analytical reporting to assess control design, effectiveness, risk exposure and governance structures.",
  },
  {
    id: "capability-banking-risk",
    title: "Banking Risk & Regulation",
    icon: BriefcaseBusiness,
    text: "Audit and analysis across corporate credit, credit risk and IFRS 9/ECL within a regulated banking environment, alongside supervisory frameworks including RAF, ICAAP/ILAAP, Pillar III, Basel III/IV and CRD VI third-country branch requirements.",
  },
  {
    id: "capability-technology-risk",
    title: "Technology & ICT Risk",
    icon: Database,
    text: "Audit exposure to IT systems, access controls and technology-enabled control environments, with a growing focus on ITGC, DORA, operational resilience and ICT third-party risk.",
  },
  {
    id: "capability-information-security",
    title: "Information Security Governance",
    icon: Lock,
    text: "Developing focus on information security governance and control frameworks — ISO/IEC 27001, NIST CSF and COBIT — connecting security controls with audit, assurance and technology risk.",
  },
  {
    id: "capability-ai-governance",
    title: "AI Governance",
    icon: Brain,
    text: "Growing focus on AI governance, risk, auditability and traceability, mapped to frameworks such as the EU AI Act, NIST AI RMF and ISO/IEC 42001, supported by hands-on experimentation with local LLM/VLM workflows and AI systems.",
  },
  {
    id: "capability-international-cross-cultural",
    title: "International & Cross-Cultural Work",
    icon: Languages,
    text: "Academic and professional background supporting audit, risk and governance work across multilingual and cross-cultural environments.",
  },
];

const experiences = [
  {
    id: "experience-boc",
    role: "Internal Auditor",
    company: "Bank of China – Milan Branch · 中国银行米兰分行",
    period: "Oct 2025 – Present",
    points: [
      "Assessing IT governance, information security controls, DORA and operational resilience across BIA, BCP and DRP frameworks.",
      "Analyzing corporate credit, syndicated loans, credit risk and IFRS 9/ECL methodologies.",
      "Evaluating regulatory and risk frameworks including RAF, ICAAP/ILAAP and Pillar III, alongside AML/KYC and internal controls.",
      "Producing audit reports and working papers to identify risk areas, control weaknesses and opportunities for improvement.",
    ],
    details: [
      "Assessed IT governance, information security controls and digital operational resilience (DORA), reviewing the end-to-end resilience framework across Business Impact Analysis (BIA), Business Continuity Plans (BCP) and Disaster Recovery Plans (DRP), including risk dependencies and supporting controls;",
      "Analyzed corporate credit and syndicated loan portfolios, assessing credit risk drivers, financial covenants and capital structure exposure;",
      "Evaluated risk management and regulatory frameworks (RAF, ICAAP, ILAAP, Pillar III), focusing on data flows, control effectiveness and alignment with capital requirements;",
      "Reviewed IFRS 9 ECL methodologies and key risk parameters (PD, LGD), assessing their impact on credit provisioning and portfolio quality;",
      "Assessed AML/KYC processes and regulatory compliance, evaluating risk exposure, control design and governance in line with supervisory expectations;",
      "Performed regulatory analysis related to the Italian Interbank Deposit Protection Scheme (FITD), assessing internal controls and governance processes;",
      "Produced audit reports and working papers, identifying risk areas, control weaknesses and opportunities to strengthen internal control frameworks.",
    ],
  },
  {
    id: "experience-prelios",
    role: "Accounting & Administration Intern",
    company: "Prelios – Financial Service",
    period: "May 2025 – Oct 2025",
    points: [
      "Managed accounting and reporting processes for NPL/UTP portfolios.",
      "Prepared IFRS financial reporting and supported group consolidation.",
      "Processed, reconciled and validated financial data across SAP and HFM/Oracle systems.",
    ],
    details: [
      "Managed accounting and reporting processes for NPL/UTP portfolios;",
      "Prepared IFRS financial reporting and supported group consolidation;",
      "Processed, reconciled and validated financial data across SAP and HFM/Oracle systems;",
      "Coordinated with external auditors, Treasury and Tax teams.",
    ],
  },
  {
    id: "experience-toplife",
    role: "Front Office Concierge & CRM",
    company: "TopLife Concierge",
    period: "Jul 2020 – Jul 2025",
    note: "Part-time weekend position held while completing university studies.",
    points: [
      "Managed front-office operations and stakeholder relationships in a luxury residential environment serving HNWI clients.",
      "Coordinated vendors, events and real-time client requests, developing strong stakeholder management and problem-solving capabilities.",
    ],
  },
];

const projects = [
  {
    id: "project-ai-audit-workflow",
    title: "Cognitive Behavior Intelligence — AI Governance Platform",
    status: "Ongoing personal project",
    stage: "Prototype",
    text: "Developing an AI governance prototype designed to explore how AI adoption reshapes organizational workflows and identify potential gaps between actual behavior, governance policies and expected controls. Built around privacy-by-design, auditability and traceability, with a governance model informed by the EU AI Act, NIST AI RMF, ISO/IEC 42001 and COBIT.",
    tech: ["AI Governance", "AI Risk", "Risk & Controls", "Behavioral Analytics", "Privacy by Design"],
    link: "https://github.com/lorenzo-natali/cognitive-behavior-intelligence",
  },
  {
    id: "project-codeiak",
    title: "CodeIAK — Local AI Coding Agent",
    status: "Ongoing personal project",
    stage: "Advanced Iteration",
    text: "Building a local-first AI coding agent that integrates multi-model orchestration, structured agentic workflows, reviewable and reversible code changes, and live execution transparency to help users inspect, modify and validate software projects offline.",
    tech: ["Local LLMs", "AI Agents", "Offline-First", "Multi-Model Orchestration", "OpenClaw Integration"],
    link: "https://github.com/lorenzo-natali/codeiak",
  },
];

const projectStages = ["Concept", "Prototype", "Functional Build", "Advanced Iteration", "Public Release"];

const education = [
  {
    id: "education-altis-ey",
    degree: "Postgraduate Master’s in Auditing, Accounting & Sustainability Reporting",
    school: "ALTIS – Catholic University of Milan in partnership with EY",
    period: "Jan 2025 – Jan 2026",
    detail: "Final Grade: A- / 26/30",
  },
  {
    id: "education-international-cooperation",
    degree: "Master’s Degree in International Cooperation for Development",
    focus: "Development Economics · Theory of Change · Impact Evaluation",
    school: "Catholic University of Milan",
    period: "Sep 2021 – Dec 2023",
    detail: "Final Grade: 105/110",
  },
  {
    id: "education-languages",
    degree: "Bachelor’s Degree in Languages for International Relations, English & Chinese",
    school: "Catholic University of Milan",
    period: "Sep 2017 – Jul 2021",
    detail: "Final Grade: 100/110",
  },
  {
    id: "education-banking-sciences",
    degree: "Banking, Insurance & Financial Sciences",
    qualifier: "First Year",
    school: "Catholic University of Milan",
    period: "Sep 2016 – Sep 2017",
  },
];

const credentials = [
  {
    id: "credential-cisa",
    title: "CISA — In Progress",
    subtitle: "Exam planned: end 2026",
    description:
      "Preparing for the Certified Information Systems Auditor certification, focused on information systems audit, IT governance, control assurance and audit evidence over technology-enabled processes.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
  {
    id: "credential-crisc",
    title: "CRISC Certification",
    subtitle: "Planned after CISA",
    description:
      "Planned certification path focused on IT risk management, risk response, information systems controls and the governance of technology-enabled business processes.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
  {
    id: "credential-aair",
    title: "AAIR Certification",
    subtitle: "Planned after CRISC",
    description:
      "Planned specialization in AI risk and governance, focused on AI systems, controls and risk management, with reference to frameworks such as the EU AI Act, NIST AI RMF and ISO/IEC 42001.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
  {
    id: "credential-frm",
    title: "FRM Certification",
    subtitle: "Planned",
    description:
      "Longer-term Financial Risk Manager certification path, focused on financial risk management, credit risk, market risk, quantitative foundations and model-risk awareness.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
];

const additionalTraining = {
  label: "Additional Training & Attestations",
  items: [
    {
      id: "additional-training-digital-banking-eidas-ai-act",
      title: "Digital Banking, eIDAS 2 & AI Act Training",
      subtitle: "Consilia Business Management Srl · Online training · Jun 2026",
      description:
        "Training course on digital banking, eIDAS 2 and the EU AI Act, delivered online with focus on regulatory and technology-related developments.",
      attestation: {
        label: "View attestation",
        url: publicAsset("attestations/ATTESTATO - Natali Lorenzo.pdf"),
      },
    },
    {
      id: "additional-training-gdpr-banking",
      title: "Banking Data Protection & AI Governance Training",
      subtitle: "Consilia Business Management Srl · Online training · May 2026",
      description:
        "Training course on data protection in the banking sector, with focus on AI applications, automated decision-making, profiling and recent guidance from the Italian Data Protection Authority.",
      attestation: {
        label: "View attestation",
        url: publicAsset("attestations/european-data-protection-banking.pdf"),
      },
    },
    {
      id: "additional-training-chinese-language",
      title: "Chinese Language Track",
      subtitle: "HSK3 preparation course · Jan 2024",
      description:
        "Completed HSK3 exam preparation course at the Confucius Institute of Università Cattolica del Sacro Cuore, Milan, supporting a cross-cultural professional profile.",
    },
    {
      id: "additional-training-healthcare-transport",
      title: "Healthcare Transport Operator Certification, Basic Life Support",
      subtitle: "AREU / Green Cross Milano Sempione · Sep–Dec 2015",
      description:
        "Training in healthcare transport, basic life support and emergency response.",
    },
  ],
};

const stackStreams = [
  {
    label: "Risk & Regulatory",
    description: "Banking controls, supervisory frameworks and financial risk domains.",
    accent: "cyan",
    direction: "left",
    items: [
      "Internal Audit",
      "Internal Controls",
      "SOX Principles",
      "Risk Assessment",
      "Credit Risk",
      "IFRS 9 / ECL",
      "Banking Regulatory Frameworks",
      "ECB Supervision",
      "Basel III / IV",
      "CRD VI",
      "Third-Country Branch",
      "RAF",
      "ICAAP / ILAAP",
      "Pillar III",
      "AML / KYC",
      "ESG Reporting",
    ],
  },
  {
    label: "Technology, Security & AI",
    description: "IT governance, information security, resilience frameworks and AI-oriented tooling.",
    accent: "violet",
    direction: "right",
    items: [
      "COBIT",
      "ITGC",
      "ISO/IEC 27001",
      "NIST CSF",
      "DORA",
      "Operational Resilience",
      "ICT Third-Party Risk",
      "Business Impact Analysis",
      "Business Continuity Planning",
      "Disaster Recovery",
      "EU AI Act",
      "ISO/IEC 42001",
      "NIST AI RMF",
      "Python",
      "pandas",
      "SQL",
      "Advanced Excel",
      "SAP",
      "HFM / Oracle",
      "Data Analysis",
      "Local LLMs",
      "Hugging Face",
      "RAG Workflows",
      "AI Agents",
      "LLM Evaluation",
      "Audit Traceability",
      "Structured Data Extraction",
      "GitHub",
      "Cursor",
    ],
  },
];

const languageItems = [
  { flag: "🇮🇹", language: "Italian", level: "Native" },
  { flag: "🇬🇧", language: "English", level: "C2" },
  { flag: "🇫🇷", language: "French", level: "B1" },
  { flag: "🇨🇳", language: "Mandarin Chinese", level: "B1" },
];

const radarDomains = [
  {
    id: "radar-control-audit-risk",
    title: "Internal Audit & Assurance",
    maturity: "Primary domain",
    category: "Assurance / Internal Audit",
    x: 50,
    y: 14,
    explanation:
      "Risk-based internal audit and assurance across internal controls, control design, audit documentation, working papers and governance structures — the connecting backbone of the profile.",
    signals: ["Risk-based internal audit", "Control testing & effectiveness", "Audit documentation & working papers", "Internal controls & governance review"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-credit-risk",
    title: "Banking & Credit Risk",
    maturity: "Primary domain",
    category: "Banking / Credit",
    x: 78.15,
    y: 27.55,
    explanation:
      "Applied analysis and review of credit risk drivers, corporate and syndicated loan portfolios, IFRS 9 / ECL methodologies and PD/LGD risk parameters, and their impact on provisioning within regulated banking environments.",
    signals: ["Corporate credit & syndicated loans", "IFRS 9 / ECL", "PD & LGD risk parameters", "Financial covenants & credit-risk drivers"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-regulatory-compliance-risk",
    title: "Regulatory & Supervisory Risk",
    maturity: "Primary domain",
    category: "Regulatory / Supervisory",
    x: 85.1,
    y: 58.01,
    explanation:
      "Direct assessment of prudential and supervisory frameworks (RAF, ICAAP, ILAAP, Pillar III), AML/KYC processes and FITD deposit-protection controls within a regulated banking environment, supported by framework knowledge of Basel III/IV and the CRD VI third-country branch regime.",
    signals: ["RAF, ICAAP, ILAAP, Pillar III", "AML / KYC processes", "FITD deposit-protection analysis", "Basel III/IV & CRD VI"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-technology-ict-risk",
    title: "Technology & ICT Risk",
    maturity: "Developing domain",
    category: "Technology / ICT",
    x: 65.62,
    y: 82.44,
    explanation:
      "Direct exposure to IT governance, information security controls and access controls within technology-related control environments, with a developing focus on IT general controls (ITGC), ICT third-party risk and broader technology risk.",
    signals: ["IT governance & information security controls", "IT systems & access controls", "IT general controls (ITGC)", "ICT third-party risk"],
    sections: ["Experience", "Professional Capabilities", "Credentials"],
  },
  {
    id: "radar-information-security-governance",
    title: "Information Security Governance",
    maturity: "Developing domain",
    category: "Security / Governance",
    x: 34.38,
    y: 82.44,
    explanation:
      "Information security governance connecting security controls with audit and technology risk: professional exposure to information security controls, supported by framework knowledge of ISO/IEC 27001, NIST CSF and COBIT.",
    signals: ["Information security controls", "ISO/IEC 27001", "NIST CSF", "COBIT"],
    sections: ["Professional Capabilities", "Experience"],
  },
  {
    id: "radar-operational-resilience",
    title: "Operational & Digital Resilience",
    maturity: "Developing domain",
    category: "Resilience / Continuity",
    x: 14.9,
    y: 58.01,
    explanation:
      "Direct professional exposure to digital operational resilience under DORA, including the BIA, BCP and DRP framework, risk dependencies, supporting controls and third-party/outsourcing dependencies.",
    signals: ["DORA", "BIA / BCP / DRP", "Risk dependencies & supporting controls", "Third-party / outsourcing dependencies"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-ai-model-governance",
    title: "AI Governance",
    maturity: "Emerging focus",
    category: "AI / Governance",
    x: 21.85,
    y: 27.55,
    explanation:
      "An emerging professional direction in AI governance — AI risk, auditability and traceability of AI-enabled workflows — supported by projects, hands-on experimentation and framework knowledge of the EU AI Act, NIST AI RMF and ISO/IEC 42001, rather than direct professional AI-governance experience.",
    signals: ["Cognitive Behavior Intelligence platform", "Local LLM/VLM experimentation", "EU AI Act, NIST AI RMF, ISO/IEC 42001", "Auditability & traceability"],
    sections: ["Project Deck", "Credentials", "Professional Capabilities"],
  },
];

// Profile Coverage answers "how strongly is the profile supported by evidence?"
// (kept conceptually separate from the Risk Radar's professional-domain view).
// Each dimension carries a qualitative evidence-coverage band (STRONG / DEVELOPING /
// EMERGING) describing the strength and breadth of supporting portfolio evidence —
// NOT a proficiency, skill or completion score.
const profileCoverage = [
  {
    id: "coverage-experience",
    label: "Professional Experience",
    shortLabel: ["Professional", "Experience"],
    band: "DEVELOPING",
    definition:
      "Professional experience supporting the profile across internal audit, banking risk, financial services and control-oriented environments.",
    evidenceBase: [
      "Bank of China — Internal Audit",
      "Prelios — accounting, NPL/UTP portfolios and financial reporting exposure",
    ],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "coverage-regulatory",
    label: "Regulatory & Supervisory Knowledge",
    shortLabel: ["Regulatory &", "Supervisory"],
    band: "STRONG",
    definition:
      "Evidence of banking regulatory, prudential and supervisory knowledge developed through direct audit exposure and structured learning.",
    evidenceBase: [
      "RAF, ICAAP, ILAAP and Pillar III",
      "AML / KYC processes",
      "IFRS 9 / ECL",
      "FITD deposit-protection analysis",
      "Basel III/IV and CRD VI framework knowledge",
    ],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "coverage-frameworks",
    label: "Tech, Security & AI Frameworks",
    shortLabel: ["Tech, Security", "& AI"],
    band: "DEVELOPING",
    definition:
      "Growing knowledge of technology, information-security and AI governance frameworks supporting the profile's expansion beyond traditional banking audit.",
    evidenceBase: [
      "COBIT and ITGC concepts",
      "ISO/IEC 27001 and NIST CSF",
      "DORA",
      "EU AI Act",
      "ISO/IEC 42001",
      "NIST AI RMF",
    ],
    sections: ["Professional Capabilities", "Project Deck", "Credentials"],
  },
  {
    id: "coverage-technical",
    label: "Technical & Data Capability",
    shortLabel: ["Technical &", "Data"],
    band: "DEVELOPING",
    definition:
      "Hands-on technical and data capabilities used to understand, analyze and build control-oriented systems and workflows.",
    evidenceBase: [
      "Python and pandas",
      "SQL and data analysis",
      "SAP and HFM/Oracle exposure",
      "Local LLM/VLM experimentation",
      "AI agents and multi-model workflows",
      "Structured extraction and automation",
    ],
    sections: ["Project Deck", "Professional Capabilities", "Experience"],
  },
  {
    id: "coverage-projects",
    label: "Projects & Applied Work",
    shortLabel: ["Projects &", "Applied Work"],
    band: "DEVELOPING",
    definition:
      "Applied, self-directed projects translating AI, governance and technical concepts into working systems and prototypes.",
    evidenceBase: [
      "Cognitive Behavior Intelligence — AI Governance Platform (Prototype)",
      "CodeIAK — Local AI Coding Agent (Advanced Iteration)",
    ],
    sections: ["Project Deck", "Professional Capabilities"],
  },
  {
    id: "coverage-certifications",
    label: "Certifications & Roadmap",
    shortLabel: ["Certifications", "& Roadmap"],
    band: "EMERGING",
    definition:
      "A structured certification and professional-development path supporting progression across IT audit, technology risk, AI risk and financial risk.",
    evidenceBase: [
      "CISA — in progress",
      "CRISC — planned",
      "AAIR — planned",
      "FRM — longer-term roadmap",
      "Continuing-education attestations",
    ],
    sections: ["Credentials"],
  },
];

// Radar magnitudes are discrete visualization values derived from qualitative
// evidence-coverage bands; they are not proficiency scores.
const coverageBandMagnitude = { STRONG: 3, DEVELOPING: 2, EMERGING: 1.5 };
const coverageBandMax = 3;
const coverageBandText = {
  STRONG: "Strong evidence",
  DEVELOPING: "Developing evidence",
  EMERGING: "Emerging evidence",
};

const sectionAnchors = {
  Hero: "#hero",
  "Role Lens": "#role-lens",
  Experience: "#experience",
  "Professional Capabilities": "#capabilities",
  "Project Deck": "#projects",
  Credentials: "#credentials",
  Education: "#education",
  "Risk Radar": "#risk-radar",
};

const roleLenses = [
  {
    name: "Overview",
    explanation: "Explore the full profile across audit, banking risk, technology, information security and AI governance.",
    signals: [
      "Internal audit and control assurance",
      "Banking risk and regulatory frameworks",
      "Technology, ICT and information security governance",
      "AI governance and controls",
    ],
  },
  {
    name: "Banking Risk",
    label: "Financial Risk",
    explanation: "Relevant for roles focused on credit risk, IFRS 9, supervisory frameworks and banking control environments.",
    signals: [
      "Credit risk exposure",
      "IFRS 9 / ECL concepts",
      "RAF, ICAAP, ILAAP, Pillar III",
      "Regulatory & Supervisory Risk radar domain",
    ],
  },
  {
    name: "IT Audit",
    explanation: "Relevant for roles focused on control assurance, information systems governance and audit documentation.",
    signals: [
      "Internal control assessment",
      "IT systems and access controls (ITGC)",
      "CISA-oriented learning path",
      "Working papers and audit reporting",
    ],
  },
  {
    name: "Technology Risk",
    explanation: "Relevant for roles involving ICT risk, operational resilience, DORA-related controls and technology-enabled environments.",
    signals: [
      "DORA and operational resilience",
      "IT systems exposure and access controls",
      "ICT third-party risk",
      "Technology & ICT Risk capability",
    ],
  },
  {
    name: "Information Security Governance",
    explanation: "Relevant for roles focused on information security governance, security control frameworks and their link to audit and technology risk.",
    signals: [
      "Information security controls",
      "ISO/IEC 27001 and NIST CSF",
      "COBIT and ITGC",
      "Information Security Governance radar domain",
    ],
  },
  {
    name: "AI Governance",
    explanation: "Relevant for roles exploring AI governance, AI risk, auditability and the controls around AI-enabled workflows.",
    signals: [
      "Cognitive Behavior Intelligence platform",
      "Local LLM/VLM experimentation",
      "EU AI Act, NIST AI RMF, ISO/IEC 42001",
      "AI Governance radar domain",
    ],
  },
];

const lensOptions = roleLenses.filter((lens) => lens.name !== "Overview");

const lensSummaries = {
  "IT Audit": "Highlights control assurance, information systems governance and audit documentation signals.",
  "Technology Risk": "Highlights ICT risk, operational resilience, DORA-related controls and technology-enabled environments.",
  "Information Security Governance": "Highlights information security controls and frameworks such as ISO/IEC 27001, NIST CSF and COBIT.",
  "AI Governance": "Highlights AI governance, AI risk, auditability and the controls around AI-enabled workflows.",
  "Banking Risk": "Highlights credit risk, IFRS 9, supervisory frameworks and banking control environments.",
};

const lensRelevance = {
  Overview: {
    capabilities: [],
    credentials: [],
    experiences: [],
    projects: [],
    radar: [],
    education: [],
    streamItems: [],
  },
  "IT Audit": {
    capabilities: ["capability-audit-control", "capability-technology-risk"],
    credentials: ["credential-cisa", "credential-crisc"],
    experiences: ["experience-boc"],
    projects: [],
    radar: ["radar-control-audit-risk", "radar-technology-ict-risk", "radar-operational-resilience"],
    education: [],
    streamItems: ["Internal Audit", "Internal Controls", "SOX Principles", "ITGC"],
  },
  "Technology Risk": {
    capabilities: ["capability-technology-risk", "capability-information-security"],
    credentials: ["credential-cisa", "credential-crisc"],
    experiences: ["experience-boc"],
    projects: [],
    radar: ["radar-technology-ict-risk", "radar-operational-resilience", "radar-information-security-governance"],
    education: [],
    streamItems: ["DORA", "Operational Resilience", "ICT Third-Party Risk", "ITGC", "COBIT"],
  },
  "Information Security Governance": {
    capabilities: ["capability-information-security", "capability-technology-risk"],
    credentials: ["credential-cisa", "credential-crisc"],
    experiences: ["experience-boc"],
    projects: [],
    radar: ["radar-information-security-governance", "radar-technology-ict-risk", "radar-operational-resilience"],
    education: [],
    streamItems: ["ISO/IEC 27001", "NIST CSF", "COBIT", "ITGC"],
  },
  "AI Governance": {
    capabilities: ["capability-ai-governance", "capability-technology-risk"],
    credentials: ["credential-aair"],
    experiences: [],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-ai-model-governance", "radar-technology-ict-risk", "radar-information-security-governance", "radar-control-audit-risk"],
    education: [],
    streamItems: ["EU AI Act", "ISO/IEC 42001", "NIST AI RMF", "Local LLMs", "AI Agents", "LLM Evaluation"],
  },
  "Banking Risk": {
    capabilities: ["capability-banking-risk", "capability-audit-control"],
    credentials: ["credential-frm"],
    experiences: ["experience-boc", "experience-prelios"],
    projects: [],
    radar: ["radar-credit-risk", "radar-regulatory-compliance-risk", "radar-control-audit-risk"],
    education: [],
    streamItems: ["IFRS 9 / ECL", "Credit Risk", "ICAAP / ILAAP", "Pillar III", "Basel III / IV", "CRD VI"],
  },
};

const signalMap = {
  "role-lens": { label: "Role Lens", href: "#role-lens", target: { type: "section", id: "role-lens" } },
  "risk-radar": { label: "Risk Radar", href: "#risk-radar", target: { type: "section", id: "risk-radar" } },
  "cap-internal-audit": { label: "Internal Audit & Assurance", href: "#capabilities", target: { type: "capability", id: "capability-audit-control" } },
  "cap-banking-risk": { label: "Banking Risk & Regulation", href: "#capabilities", target: { type: "capability", id: "capability-banking-risk" } },
  "cap-technology-risk": { label: "Technology & ICT Risk", href: "#capabilities", target: { type: "capability", id: "capability-technology-risk" } },
  "cap-information-security": { label: "Information Security Governance", href: "#capabilities", target: { type: "capability", id: "capability-information-security" } },
  "cap-ai-governance": { label: "AI Governance", href: "#capabilities", target: { type: "capability", id: "capability-ai-governance" } },
  "exp-boc": { label: "Bank of China — Internal Audit", href: "#experience", target: { type: "experience", id: "experience-boc" } },
  "project-cbi": { label: "Cognitive Behavior Intelligence", href: "#projects", target: { type: "project", id: "project-ai-audit-workflow" } },
  "project-codeiak": { label: "CodeIAK", href: "#projects", target: { type: "project", id: "project-codeiak" } },
  "cred-cisa": { label: "CISA (In Progress)", href: "#credentials", target: { type: "credential", id: "credential-cisa" } },
  "cred-crisc": { label: "CRISC Certification", href: "#credentials", target: { type: "credential", id: "credential-crisc" } },
  "cred-aair": { label: "AAIR Certification", href: "#credentials", target: { type: "credential", id: "credential-aair" } },
  "cred-frm": { label: "FRM Certification", href: "#credentials", target: { type: "credential", id: "credential-frm" } },
  "radar-internal-audit": { label: "Risk Radar: Internal Audit", href: "#risk-radar", target: { type: "radar", id: "radar-control-audit-risk" } },
  "radar-credit": { label: "Risk Radar: Banking & Credit Risk", href: "#risk-radar", target: { type: "radar", id: "radar-credit-risk" } },
  "radar-regulatory": { label: "Risk Radar: Regulatory & Supervisory", href: "#risk-radar", target: { type: "radar", id: "radar-regulatory-compliance-risk" } },
  "radar-technology": { label: "Risk Radar: Technology & ICT", href: "#risk-radar", target: { type: "radar", id: "radar-technology-ict-risk" } },
  "radar-information-security": { label: "Risk Radar: Information Security", href: "#risk-radar", target: { type: "radar", id: "radar-information-security-governance" } },
  "radar-operational-resilience": { label: "Risk Radar: Operational Resilience", href: "#risk-radar", target: { type: "radar", id: "radar-operational-resilience" } },
  "radar-ai-governance": { label: "Risk Radar: AI Governance", href: "#risk-radar", target: { type: "radar", id: "radar-ai-model-governance" } },
};

const assistantPrompts = [
  {
    id: "assistant-role-orientation",
    categories: ["Profile & Career Direction"],
    question: "What kind of roles are you oriented toward?",
    answer:
      "I am primarily oriented toward IT Audit, Technology Risk, Information Security Governance, AI Governance and Financial Risk roles.\n\nMy profile sits at the intersection of risk, controls and technology, with internal audit and assurance providing the methodological backbone connecting these areas. I am particularly interested in regulated environments where financial risk, technology, information security and emerging AI risks increasingly converge.",
    signalIds: ["role-lens", "risk-radar", "cap-internal-audit"],
  },
  {
    id: "assistant-strongest-profile",
    categories: ["Profile & Career Direction"],
    question: "What is the strongest part of your profile?",
    answer:
      "My strongest point is the combination of banking risk exposure, audit and control discipline, and a growing specialization in technology governance.\n\nI have developed a practical foundation across credit risk, regulatory frameworks, internal controls and operational resilience, while progressively expanding toward IT Audit, Technology Risk, Information Security Governance and AI-related risks. This allows me to approach technology not in isolation, but through the lens of risk, controls and governance.",
    signalIds: ["exp-boc", "cap-banking-risk", "cap-internal-audit"],
  },
  {
    id: "assistant-bank-of-china-experience",
    categories: ["Profile & Career Direction"],
    question: "What does your experience at Bank of China add to your profile?",
    answer:
      "My experience at Bank of China – Milan Branch gives me exposure to internal audit within an international and cross-border banking environment.\n\nI have worked across corporate credit and syndicated loans, IFRS 9/ECL, regulatory and supervisory frameworks, AML/KYC, internal controls, IT governance and operational resilience. This has helped me develop a risk perspective that connects financial, regulatory, operational and increasingly technological dimensions.",
    signalIds: ["exp-boc", "cap-banking-risk", "cap-technology-risk"],
  },
  {
    id: "assistant-different-from-standard-audit",
    categories: ["Profile & Career Direction"],
    question: "What makes your profile different from a standard internal audit profile?",
    answer:
      "My background in internal audit is combined with a deliberate move toward technology and emerging risk domains.\n\nBeyond traditional audit and banking risk, I am developing capabilities in IT and technology risk, information security governance, operational resilience and AI governance, supported by technical experimentation with Python, data analysis and AI systems.\n\nWhat differentiates my direction is the attempt to connect financial risk, technology, controls and governance rather than treating them as separate disciplines.",
    signalIds: ["project-codeiak", "cap-technology-risk", "cap-ai-governance"],
  },
  {
    id: "assistant-future-career-direction",
    categories: ["Profile & Career Direction"],
    question: "Where do you want your career to develop?",
    answer:
      "My career direction builds from banking risk and internal audit toward IT Audit, Technology Risk and Information Security Governance, with AI Governance as an emerging specialization.\n\nOver time, I aim to develop a profile capable of connecting financial risk, technology, information security, controls and AI within complex regulated organizations. I see financial institutions as a particularly strong fit, while remaining open to other highly regulated sectors where technology and governance are becoming increasingly interconnected.",
    signalIds: ["role-lens", "risk-radar", "cap-technology-risk"],
  },
  {
    id: "assistant-business-or-technical",
    categories: ["Profile & Career Direction"],
    question: "Is your profile more business-oriented or technical?",
    answer:
      "My foundation is currently stronger on the risk, audit and business-control side, while I am deliberately building greater technical depth.\n\nI use Python, data analysis and AI-oriented tools in personal projects and experimentation, while developing my understanding of information systems, technology risk and governance frameworks. My objective is not to become a software engineer, but to understand technology deeply enough to assess its risks, challenge its controls and contribute to its governance.",
    signalIds: ["project-codeiak", "cap-internal-audit", "cap-technology-risk"],
  },
  {
    id: "assistant-internal-audit-experience",
    categories: ["Audit, Banking & Financial Risk"],
    question: "What is your experience in internal audit?",
    answer:
      "I work in Internal Audit at Bank of China – Milan Branch, within an international banking environment.\n\nMy experience includes audit activities across corporate credit and syndicated loans, credit risk, regulatory and supervisory frameworks, AML/KYC, internal controls, IT governance and operational resilience. I contribute to control assessment, working papers and audit reporting, identifying risk areas, control weaknesses and opportunities for improvement.",
    signalIds: ["exp-boc", "cap-internal-audit", "radar-internal-audit"],
  },
  {
    id: "assistant-credit-risk-exposure",
    categories: ["Audit, Banking & Financial Risk"],
    question: "What is your exposure to credit and financial risk?",
    answer:
      "My experience includes the analysis of corporate credit and syndicated loan portfolios, with attention to credit risk drivers, financial covenants and capital structure exposure.\n\nI have also reviewed IFRS 9/ECL methodologies and key risk parameters such as PD and LGD, assessing their implications for credit provisioning and portfolio quality. This provides the practical banking-risk foundation that I intend to strengthen over time through broader financial and model risk knowledge.",
    signalIds: ["exp-boc", "cap-banking-risk", "radar-credit"],
  },
  {
    id: "assistant-banking-regulation-exposure",
    categories: ["Audit, Banking & Financial Risk"],
    question: "What is your exposure to banking regulation and supervisory frameworks?",
    answer:
      "I have worked with banking risk and regulatory frameworks including RAF, ICAAP, ILAAP and Pillar III, assessing areas such as governance, data flows, control effectiveness and alignment with regulatory requirements.\n\nMy broader exposure also includes Basel III/IV, CRD VI, AML/KYC requirements and supervisory expectations relevant to the operation of a third-country banking branch within the European regulatory environment.",
    signalIds: ["exp-boc", "cap-banking-risk", "radar-regulatory"],
  },
  {
    id: "assistant-control-areas",
    categories: ["Audit, Banking & Financial Risk"],
    question: "How do you approach risk assessment and internal controls?",
    answer:
      "I approach risk assessment by connecting risk exposure, control design, evidence and governance rather than looking at controls in isolation.\n\nFrom an audit perspective, I consider whether key risks have been identified, whether controls are appropriately designed and implemented, whether supporting evidence is reliable and traceable, and whether weaknesses could affect the organization's risk profile or regulatory compliance.\n\nThis control-oriented approach is the methodological foundation I also bring to technology and emerging-risk domains.",
    signalIds: ["exp-boc", "cap-internal-audit", "radar-internal-audit"],
  },
  {
    id: "assistant-technology-risk-experience",
    categories: ["Technology Risk & Operational Resilience"],
    question: "What is your experience with Technology Risk and IT controls?",
    answer:
      "My exposure to Technology Risk comes primarily through internal audit, where I have worked on IT governance, information security controls, access controls and technology-related control environments within a regulated banking context.\n\nI am progressively developing this foundation toward a broader understanding of IT controls, ICT risk, operational resilience and technology governance, supported by my CISA preparation and planned CRISC path.",
    signalIds: ["exp-boc", "cap-technology-risk", "cred-cisa"],
  },
  {
    id: "assistant-operational-resilience-dora",
    categories: ["Technology Risk & Operational Resilience"],
    question: "What is your exposure to DORA and operational resilience?",
    answer:
      "My professional exposure includes DORA-related operational resilience, particularly through the review of Business Impact Analysis (BIA), Business Continuity Plans (BCP) and Disaster Recovery Plans (DRP), including risk dependencies and supporting controls.\n\nThis experience has strengthened my understanding of how technology, business continuity, governance and internal controls interact to support the resilience of critical operations.",
    signalIds: ["exp-boc", "cap-technology-risk", "radar-operational-resilience"],
  },
  {
    id: "assistant-ict-third-party-risk",
    categories: ["Technology Risk & Operational Resilience"],
    question: "What is your exposure to ICT third-party risk?",
    answer:
      "My exposure to ICT third-party risk is developing within the broader context of DORA, outsourcing and operational resilience.\n\nI am particularly interested in how financial institutions identify critical ICT dependencies, assess provider-related risks, establish appropriate contractual and monitoring controls, and maintain accountability when technology services are outsourced. I see this as an increasingly important area at the intersection of Technology Risk, governance and operational resilience.",
    signalIds: ["cap-technology-risk", "radar-operational-resilience", "exp-boc"],
  },
  {
    id: "assistant-why-technology-risk",
    categories: ["Technology Risk & Operational Resilience"],
    question: "Why are you interested in Technology Risk?",
    answer:
      "Technology increasingly underpins critical business processes, financial models, data flows, regulatory reporting and operational resilience. For me, Technology Risk is therefore a natural extension of my background in internal audit and banking risk.\n\nIt applies the same fundamental logic of risk identification, control assessment, evidence and accountability to increasingly technology-dependent organizations. This makes Technology Risk one of the central directions of my professional development.",
    signalIds: ["cap-technology-risk", "radar-technology", "cap-internal-audit"],
  },
  {
    id: "assistant-information-security-governance",
    categories: ["Information Security & AI Governance"],
    question: "What is your exposure to Information Security Governance?",
    answer:
      "My exposure is developing at the intersection of internal audit, technology risk and information security controls. I am building my understanding of governance and control frameworks including COBIT, ISO/IEC 27001 and NIST CSF, with particular interest in how organizations translate security requirements into governance, accountability, controls and assurance.\n\nMy focus is on Information Security Governance rather than technical cybersecurity operations, connecting security-related risks and controls with the broader governance and risk framework of the organization.",
    signalIds: ["cap-information-security", "radar-information-security", "cap-technology-risk"],
  },
  {
    id: "assistant-ai-governance-exposure",
    categories: ["Information Security & AI Governance"],
    question: "What is your exposure to AI Governance?",
    answer:
      "My focus on AI Governance is emerging through independent study, framework analysis and applied projects, rather than direct professional experience in a dedicated AI Governance role.\n\nI am developing knowledge around AI risk, controls, accountability, auditability and traceability, with reference to frameworks including the EU AI Act, ISO/IEC 42001 and NIST AI RMF. I am particularly interested in how organizations can govern the gap between formal AI policies, expected controls and the way AI systems are actually used.",
    signalIds: ["project-cbi", "cap-ai-governance", "cred-aair"],
  },
  {
    id: "assistant-why-ai-governance",
    categories: ["Information Security & AI Governance"],
    question: "Why are you interested in AI Governance?",
    answer:
      "AI introduces risks that do not fit neatly within traditional technology or compliance frameworks. Its adoption raises questions around accountability, data, model behavior, human oversight, explainability, privacy and control effectiveness.\n\nI see AI Governance as a natural evolution of my interest in risk and controls: as AI becomes embedded in organizational processes, governance must evolve to ensure that these systems remain understandable, accountable, traceable and appropriately controlled.",
    signalIds: ["cap-ai-governance", "radar-ai-governance", "cap-internal-audit"],
  },
  {
    id: "assistant-infosec-ai-governance-connection",
    categories: ["Information Security & AI Governance"],
    question: "How do Information Security Governance and AI Governance connect?",
    answer:
      "Both disciplines address how organizations maintain control and accountability over increasingly complex technology environments.\n\nInformation Security Governance provides an established foundation around risk ownership, controls, resilience and accountability, while AI Governance introduces additional challenges related to model behavior, data, human oversight and evolving forms of technology use. I am interested in this convergence because AI risk increasingly needs to be understood within the broader technology and information governance environment rather than as an isolated discipline.",
    signalIds: ["cap-information-security", "cap-ai-governance", "radar-ai-governance"],
  },
  {
    id: "assistant-ai-governance-perspective",
    categories: ["Information Security & AI Governance"],
    question: "What perspective do you bring to AI Governance?",
    answer:
      "I approach AI Governance primarily from a risk, controls and assurance perspective, complemented by hands-on experimentation with AI technologies.\n\nMy audit background leads me to focus on questions such as whether risks are identifiable, controls are effective, responsibilities are clear and decisions can be traced to reliable evidence. At the same time, working with local LLMs, AI agents and model evaluation helps me develop a practical understanding of the systems being governed rather than approaching AI Governance only from a regulatory perspective.",
    signalIds: ["project-codeiak", "cap-ai-governance", "cap-internal-audit"],
  },
  {
    id: "assistant-cbi-project",
    categories: ["Projects & Technical Skills"],
    question: "What is Cognitive Behavior Intelligence?",
    answer:
      "Cognitive Behavior Intelligence (CBI) is an ongoing AI Governance project exploring how AI adoption can reshape organizational workflows and create gaps between formal policies, expected controls and actual technology use.\n\nThe project focuses on identifying behavioral and governance signals related to AI use, with particular attention to AI risk, controls, auditability, traceability and privacy, informed by frameworks including the EU AI Act, ISO/IEC 42001 and NIST AI RMF.",
    signalIds: ["project-cbi", "cap-ai-governance", "radar-ai-governance"],
  },
  {
    id: "assistant-codeiak-project",
    categories: ["Projects & Technical Skills"],
    question: "What is CodeIAK?",
    answer:
      "CodeIAK is my ongoing local-first AI coding agent project, designed around multi-model orchestration, AI agents, reviewable and reversible code changes, and transparent execution.\n\nBeyond the application itself, the project gives me hands-on exposure to how AI agents interact with models, tools and software environments, helping me better understand the technical systems underlying emerging AI risks and governance challenges.",
    signalIds: ["project-codeiak", "cap-ai-governance", "cap-technology-risk"],
  },
  {
    id: "assistant-ai-projects-complement",
    categories: ["Projects & Technical Skills"],
    question: "How do your two AI projects complement each other?",
    answer:
      "The two projects approach AI from complementary perspectives. Cognitive Behavior Intelligence focuses on the governance problem — how AI adoption affects organizational behavior, controls and accountability — while CodeIAK provides hands-on technical exposure to AI agents, local models, orchestration and model evaluation.\n\nTogether, they reflect my objective of understanding AI both as a technology to work with and a system that needs to be governed, controlled and assessed.",
    signalIds: ["project-cbi", "project-codeiak", "cap-ai-governance"],
  },
  {
    id: "assistant-python-data-analysis",
    categories: ["Projects & Technical Skills"],
    question: "How do you use Python and data analysis?",
    answer:
      "I use Python and pandas primarily for data analysis, automation and structured workflows, particularly in risk, audit and AI-oriented use cases.\n\nMy objective is not generic software development, but using technical tools to improve how information is structured, analyzed, validated and made traceable, while building greater technical fluency for Technology Risk and AI Governance.",
    signalIds: ["project-codeiak", "cap-technology-risk", "cap-ai-governance"],
  },
  {
    id: "assistant-tools-technologies",
    categories: ["Projects & Technical Skills"],
    question: "What tools and technologies do you work with?",
    answer:
      "My core tools include Python, pandas and Advanced Excel for analysis and automation, alongside enterprise systems such as SAP and HFM/Oracle from my professional experience.\n\nThrough personal projects, I also work with local LLMs, AI agents, multi-model orchestration, LLM evaluation and structured data extraction, using GitHub and AI-assisted development tools to build and experiment with practical AI workflows.",
    signalIds: ["project-codeiak", "project-cbi", "cap-technology-risk"],
  },
  {
    id: "assistant-hands-on-technical-skills",
    categories: ["Projects & Technical Skills"],
    question: "How technical is your hands-on experience?",
    answer:
      "My technical profile is applied and developing rather than software-engineering focused. I build and experiment with Python-based data analysis, local LLMs, AI agents, multi-model systems and LLM/model evaluation to understand how these technologies operate in practice. I do not position myself as a software engineer or technical cybersecurity specialist.\n\nThis hands-on work complements my background in audit and risk: my goal is to develop enough technical depth to understand systems, assess their risks, challenge their controls and contribute effectively to their governance.",
    signalIds: ["project-codeiak", "cap-ai-governance", "cap-technology-risk"],
  },
  {
    id: "assistant-cisa-preparation",
    categories: ["Professional Development"],
    question: "Why are you preparing for CISA?",
    answer:
      "I am preparing for CISA because it directly supports my development toward IT Audit, information systems governance and technology-related controls.\n\nIt builds naturally on my internal audit background while strengthening the information systems dimension of my profile. I see CISA as the first formal step in consolidating the transition from broader banking audit toward more specialized technology-oriented risk and assurance roles.",
    signalIds: ["cred-cisa", "cap-technology-risk", "radar-technology"],
  },
  {
    id: "assistant-certification-roadmap",
    categories: ["Professional Development"],
    question: "What is your certification roadmap?",
    answer:
      "My roadmap follows the progression I want to build professionally: CISA → CRISC → AAIR → FRM.\n\nCISA strengthens information systems audit and assurance, CRISC extends that foundation into Technology Risk and information systems controls, AAIR develops specialization in AI risk and governance, while FRM represents a longer-term path toward deeper financial and model risk knowledge.",
    signalIds: ["cred-cisa", "cred-crisc", "cred-aair"],
  },
  {
    id: "assistant-crisc-rationale",
    categories: ["Professional Development"],
    question: "Why are you planning CRISC after CISA?",
    answer:
      "I see CISA and CRISC as complementary. CISA strengthens my ability to assess information systems, governance and controls from an audit and assurance perspective, while CRISC extends that foundation toward IT risk identification, assessment, response and control.\n\nThis progression reflects my objective of moving beyond technology assurance alone toward a broader understanding of how organizations govern technology-related risk.",
    signalIds: ["cred-crisc", "cred-cisa", "cap-technology-risk"],
  },
  {
    id: "assistant-aair-rationale",
    categories: ["Professional Development"],
    question: "Why are you interested in an AI risk certification such as AAIR?",
    answer:
      "AI Governance and AI Risk are emerging areas in my professional direction, and AAIR represents a way to develop a more structured understanding of the risks, controls and governance challenges associated with AI systems.\n\nI see it as complementary to CISA and CRISC: as organizations increasingly integrate AI into business and decision-making processes, technology risk and assurance professionals will need to understand how traditional governance and control principles evolve in response to AI-specific risks.",
    signalIds: ["cred-aair", "cap-ai-governance", "radar-ai-governance"],
  },
  {
    id: "assistant-frm-planning",
    categories: ["Professional Development"],
    question: "Why is FRM part of your longer-term roadmap?",
    answer:
      "Financial risk remains an important foundation of my profile, particularly through my exposure to credit risk, IFRS 9/ECL and banking risk frameworks.\n\nI see FRM as a longer-term path to deepen my understanding of financial risk, quantitative foundations and model risk, complementing rather than replacing my specialization in technology and governance. My objective is to preserve the connection between financial risk and the increasingly technological systems through which it is measured, managed and controlled.",
    signalIds: ["cred-frm", "cap-banking-risk", "radar-credit"],
  },
  {
    id: "assistant-limited-seniority",
    categories: ["Recruiter Concerns"],
    question: "What value can you bring at your current level of experience?",
    answer:
      "At my current level, I bring hands-on internal audit experience, direct exposure to banking and regulatory environments, and a structured risk and control mindset.\n\nI can contribute immediately to control assessment, analytical work and technology-oriented risk topics, while continuing to build deeper specialization in IT Audit, Technology Risk, Information Security Governance and emerging AI-related risks.",
    signalIds: ["exp-boc", "cap-internal-audit", "risk-radar"],
  },
  {
    id: "assistant-too-junior-tech-ai",
    categories: ["Recruiter Concerns"],
    question: "What makes you ready to move into Technology Risk or AI Governance roles?",
    answer:
      "My readiness is built on a solid foundation in internal audit, risk, controls and regulated banking. Technology Risk is a natural extension of that foundation, applying the same control and assurance thinking to IT systems, resilience and third-party dependencies.\n\nAI Governance is an emerging specialization I am actively developing through framework knowledge, applied projects and hands-on technical experimentation. This makes me well suited to roles where my existing foundation can create value now, while I continue to develop deeper specialization and take on progressively greater responsibility.",
    signalIds: ["exp-boc", "cred-cisa", "cap-ai-governance"],
  },
  {
    id: "assistant-profile-too-broad",
    categories: ["Recruiter Concerns"],
    question: "How do the different parts of your profile fit together?",
    answer:
      "The different parts of my profile build on each other in a clear progression.\n\nBanking and financial risk provide the domain foundation; internal audit provides the control and assurance methodology; IT Audit and Technology Risk extend that foundation into technology; Information Security and AI Governance represent the emerging governance layer.\n\nThe common thread is understanding, assessing and controlling risk in increasingly complex and technology-dependent systems.",
    signalIds: ["role-lens", "risk-radar", "cap-internal-audit"],
  },
  {
    id: "assistant-why-move-to-technology",
    categories: ["Recruiter Concerns"],
    question: "Why move toward technology if your background is mainly banking and audit?",
    answer:
      "I see this as an evolution rather than a career change. Banking processes, risk models, regulatory reporting, controls and critical operations increasingly depend on technology, data and third-party systems.\n\nMoving toward IT Audit and Technology Risk allows me to build on my existing audit and banking foundation while developing expertise in the technological layer that increasingly determines how risks emerge, are measured and are controlled.",
    signalIds: ["exp-boc", "cap-technology-risk", "radar-technology"],
  },
  {
    id: "assistant-ideal-environment",
    categories: ["Recruiter Concerns"],
    question: "What kind of environment would allow you to perform at your best?",
    answer:
      "I perform best in environments that combine clear accountability with intellectual autonomy, where people are expected to question constructively, take initiative and develop beyond narrowly defined responsibilities.\n\nI am particularly attracted to organizations that treat audit and risk as functions that help improve decision-making and governance, and that provide exposure to technology, complex regulatory challenges and continuous professional development.",
    signalIds: ["exp-boc", "role-lens", "cap-internal-audit"],
  },
];

const assistantCategories = [
  "Profile & Career Direction",
  "Audit, Banking & Financial Risk",
  "Technology Risk & Operational Resilience",
  "Information Security & AI Governance",
  "Projects & Technical Skills",
  "Professional Development",
  "Recruiter Concerns",
];

function isOverviewLens(selectedLens) {
  return selectedLens === "Overview";
}

function isLensRelevant(selectedLens, group, value) {
  if (isOverviewLens(selectedLens)) return true;
  return lensRelevance[selectedLens]?.[group]?.includes(value) ?? false;
}

function getAssistantSignals(prompt) {
  if (!prompt.signalIds?.length) {
    return [];
  }

  return prompt.signalIds.map((signalId) => {
    const signal = signalMap[signalId];
    if (!signal) {
      return {
        id: signalId,
        label: signalId,
        missing: true,
      };
    }

    return {
      id: signalId,
      ...signal,
    };
  });
}

function getSignalTargetElement(signal) {
  const target = signal.target;
  if (!target) return null;

  if (target.type === "section") {
    return document.getElementById(target.id);
  }

  return document.querySelector(`[data-role-lens-id="${target.id}"]`);
}

function highlightSignalTarget(target) {
  target.classList.add("assistant-signal-target");
  window.setTimeout(() => {
    target.classList.remove("assistant-signal-target");
  }, 1800);
}

function lensSurfaceClass(selectedLens, group, value, accent = "cyan") {
  if (isOverviewLens(selectedLens)) return "";
  if (isLensRelevant(selectedLens, group, value)) {
    return accent === "violet"
      ? "role-lens-highlight-violet border-violet-300/60 bg-violet-400/[0.095] opacity-100"
      : "role-lens-highlight-cyan border-cyan-300/60 bg-cyan-400/[0.095] opacity-100";
  }
  return "opacity-55";
}

function Section({ eyebrow, title, children, className = "", id }) {
  return (
    <section id={id} className={`border-t border-slate-800/70 px-5 py-16 sm:px-8 lg:px-10 lg:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-9 flex flex-col gap-2 sm:mb-10">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">{eyebrow}</p>
          )}
          <h2 className="text-2xl font-semibold tracking-tight !text-slate-50 sm:text-3xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function SurfaceCard({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-slate-800/80 bg-slate-900/55 shadow-lg shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/75 hover:shadow-xl hover:shadow-slate-950/30 ${className}`}
    >
      {children}
    </div>
  );
}

// Minimal, self-positioning academic-focus info indicator. Opens above the
// trigger by default, flips below when there is not enough room, and shifts
// horizontally to stay within the viewport. Hover, keyboard focus and tap all
// reveal the contextual tooltip.
function AcademicFocusInfo({ id, text, label = "Academic focus" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ side: "top", shiftX: 0 });
  const btnRef = useRef(null);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const reposition = () => {
      const btn = btnRef.current;
      const tip = tipRef.current;
      if (!btn || !tip) return;
      const b = btn.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Prefer opening above; flip below only if there is not enough room above
      // but enough room below.
      let side = "top";
      if (b.top - t.height - margin < 0 && b.bottom + t.height + margin <= vh) {
        side = "bottom";
      }

      // Center horizontally on the trigger, then clamp inside the viewport.
      const centerX = b.left + b.width / 2;
      const desiredLeft = centerX - t.width / 2;
      const clampedLeft = Math.max(margin, Math.min(desiredLeft, vw - t.width - margin));
      setPos({ side, shiftX: clampedLeft - desiredLeft });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    btnRef.current?.blur();
  };

  return (
    <span
      className="relative ml-1 inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label="Show academic focus"
        aria-describedby={open ? id : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span aria-hidden="true" className="font-serif text-[14px] italic leading-none">
          i
        </span>
      </button>
      <span
        ref={tipRef}
        id={id}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${pos.shiftX}px))` }}
        className={`absolute left-1/2 z-30 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-slate-800 bg-slate-950/95 px-3 py-2 text-left shadow-md shadow-slate-950/40 transition-opacity duration-150 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        } ${pos.side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
      >
        <span className="block text-[11px] font-medium text-slate-500">{label}</span>
        <span className="mt-0.5 block text-sm font-normal leading-6 text-slate-300">{text}</span>
      </span>
    </span>
  );
}

function getRadarTone(maturity) {
  if (maturity === "Primary domain") {
    return {
      activeDot: "border-cyan-100 bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
      pulsePrimary: "border-cyan-300/45 shadow-[0_0_18px_rgba(34,211,238,0.24)]",
      pulseSecondary: "border-cyan-200/25",
      badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
      dot: "bg-cyan-300",
      link: "text-cyan-100 hover:text-cyan-50",
    };
  }

  if (maturity === "Developing domain") {
    return {
      activeDot: "border-violet-200 bg-violet-300 shadow-[0_0_24px_rgba(167,139,250,0.34)]",
      pulsePrimary: "border-violet-300/45 shadow-[0_0_18px_rgba(167,139,250,0.22)]",
      pulseSecondary: "border-violet-200/25",
      badge: "border-violet-400/25 bg-violet-400/10 text-violet-100",
      dot: "bg-violet-300",
      link: "text-violet-100 hover:text-violet-50",
    };
  }

  return {
    activeDot: "border-amber-100 bg-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.28)]",
    pulsePrimary: "border-amber-300/40 shadow-[0_0_18px_rgba(252,211,77,0.18)]",
    pulseSecondary: "border-amber-200/22",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    dot: "bg-amber-300",
    link: "text-amber-100 hover:text-amber-50",
  };
}

// Evidence-coverage tone for the Profile Coverage panel. Deliberately distinct
// wording ("Strong/Developing/Emerging evidence") from Risk Map maturity, while
// reusing the portfolio's existing colour language.
function getCoverageTone(band) {
  if (band === "STRONG") {
    return {
      badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
      dot: "bg-cyan-300",
      link: "text-cyan-100 hover:text-cyan-50",
    };
  }

  if (band === "DEVELOPING") {
    return {
      badge: "border-violet-400/25 bg-violet-400/10 text-violet-100",
      dot: "bg-violet-300",
      link: "text-violet-100 hover:text-violet-50",
    };
  }

  return {
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    dot: "bg-amber-300",
    link: "text-amber-100 hover:text-amber-50",
  };
}

function TickerStream({ stream, selectedLens = "Overview" }) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const halfWidthRef = useRef(0);

  const isRiskStream = stream.accent === "cyan";
  const dotClass = isRiskStream ? "bg-cyan-300/80 shadow-cyan-300/20" : "bg-violet-300/80 shadow-violet-300/20";
  const labelClass = isRiskStream ? "text-cyan-200" : "text-violet-200";
  const borderClass = isRiskStream ? "border-cyan-400/25" : "border-violet-400/25";
  const backgroundClass = isRiskStream ? "bg-cyan-400/[0.04]" : "bg-violet-400/[0.04]";
  const hasStreamHighlights = (lensRelevance[selectedLens]?.streamItems?.length ?? 0) > 0;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let frameId;
    const speed = 28;

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2;
      if (stream.direction === "right" && offsetRef.current === 0) {
        offsetRef.current = -halfWidthRef.current;
      }
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    const animate = (time) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!pausedRef.current && halfWidthRef.current > 0) {
        const movement = speed * delta;

        if (stream.direction === "right") {
          offsetRef.current += movement;
          if (offsetRef.current >= 0) {
            offsetRef.current -= halfWidthRef.current;
          }
        } else {
          offsetRef.current -= movement;
          if (offsetRef.current <= -halfWidthRef.current) {
            offsetRef.current += halfWidthRef.current;
          }
        }

        track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      frameId = requestAnimationFrame(animate);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [stream.direction]);

  return (
    <div
      className={`ticker-stream overflow-hidden border-y-2 ${borderClass} ${backgroundClass} backdrop-blur`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
        lastTimeRef.current = 0;
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-2">
        <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${labelClass}`}>{stream.label}</span>
      </div>
      <div className="ticker-mask overflow-hidden py-2.5">
        <div ref={trackRef} className="flex w-max items-center whitespace-nowrap will-change-transform">
          {[...stream.items, ...stream.items].map((item, index) => (
            <span
                key={`${stream.label}-${item}-${index}`}
                className={`inline-flex items-center text-sm font-medium transition ${
                  !hasStreamHighlights || isLensRelevant(selectedLens, "streamItems", item)
                    ? "text-slate-100"
                    : "text-slate-500 opacity-75"
                }`}
              >
              <span className="px-4">{item}</span>
              <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${dotClass}`} aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectStageIndicator({ stage }) {
  const stageIndex = projectStages.indexOf(stage);
  if (stageIndex < 0) return null;

  const stageBars = (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {projectStages.map((item, index) => {
        const isCurrent = index === stageIndex;
        const isReached = index <= stageIndex;
        return (
          <span
            key={item}
            className={`h-1.5 w-5 rounded-full ${
              isCurrent
                ? "project-stage-current bg-cyan-200"
                : isReached
                  ? "bg-cyan-400/45"
                  : "bg-slate-700/70"
            }`}
          />
        );
      })}
    </div>
  );

  return (
    <div
      className="flex flex-col items-start gap-1.5 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-2"
      aria-label={`Development stage: ${stage}`}
      title={`Development stage: ${stage}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 font-medium whitespace-nowrap text-slate-500">Development stage</span>
        <span className="text-slate-700">·</span>
        <span className="font-medium text-cyan-100/80">{stage}</span>
      </div>
      <div className="sm:ml-1">{stageBars}</div>
    </div>
  );
}

function PortfolioAssistant() {
  const [selectedPrompt, setSelectedPrompt] = useState(assistantPrompts[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(assistantPrompts[0].categories[0]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const questionRailRef = useRef(null);
  const previewQuestion = assistantPrompts[previewIndex % assistantPrompts.length].question;

  useEffect(() => {
    const previewTimer = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % assistantPrompts.length);
    }, 3600);

    return () => window.clearInterval(previewTimer);
  }, []);

  const openAssistant = (prompt = assistantPrompts[0]) => {
    setSelectedPrompt(prompt);
    setSelectedCategory(prompt.categories[0]);
    setIsDrawerOpen(true);
  };

  const categoryPrompts = assistantPrompts.filter((prompt) => prompt.categories.includes(selectedCategory));

  const handleAssistantSignalClick = (event, signal) => {
    event.preventDefault();

    const target = signal.target;
    if (signal.missing || !target) {
      console.warn("Missing Portfolio Assistant signal mapping:", signal.id);
      return;
    }

    setIsDrawerOpen(false);

    const scrollToTarget = () => {
      const element = getSignalTargetElement(signal);
      if (!element) return false;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightSignalTarget(element);
      return true;
    };

    // Project cards render one at a time in a carousel: activate the requested
    // project first, then scroll once its card has mounted.
    if (target.type === "project") {
      window.dispatchEvent(
        new CustomEvent("assistant:activate-project", { detail: target.id })
      );
      let attempts = 0;
      const attemptScroll = () => {
        if (scrollToTarget()) return;
        if (attempts++ < 14) {
          window.setTimeout(attemptScroll, 70);
        } else {
          console.warn("Missing Portfolio Assistant signal target:", signal.id);
        }
      };
      window.setTimeout(attemptScroll, 120);
      return;
    }

    window.setTimeout(() => {
      if (!scrollToTarget()) {
        console.warn("Missing Portfolio Assistant signal target:", signal.id);
      }
    }, 160);
  };

  return (
    <>
      <aside className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-5">
        <div className="mb-5 flex items-center gap-4 border-b border-slate-800 pb-5 sm:mb-4 sm:gap-3 sm:pb-4">
          <img
            src={publicAsset("profile.png")}
            alt="Lorenzo Natali"
            className="h-16 w-16 shrink-0 rounded-full border border-cyan-400/30 object-cover sm:h-11 sm:w-11"
          />
          <div>
            <p className="text-base font-semibold text-slate-50 sm:text-sm">Portfolio Assistant</p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-400 sm:text-xs sm:leading-5 sm:text-slate-500">
          Guided answers on my background, projects and professional direction.
        </p>

        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/35 px-4 py-4 sm:mt-4 sm:px-3 sm:py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/75 sm:text-[11px] sm:tracking-[0.22em]">
            Example questions
          </p>
          {/* Fixed height sized for the longest showcase questions — avoids card resize on rotate. */}
          <div className="mt-3 h-[6rem] overflow-hidden sm:mt-2 sm:h-[5rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={previewQuestion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="text-sm leading-6 text-slate-200 sm:text-xs sm:leading-5 sm:text-slate-300"
              >
                {previewQuestion}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAssistant()}
          className="mt-6 w-full rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-4 text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 sm:mt-5 sm:py-3 sm:text-sm"
        >
          Ask the assistant
        </button>
      </aside>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close assistant overlay"
              className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/70">
                <div className="flex items-center justify-between border-b border-slate-800 p-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={publicAsset("profile.png")}
                      alt="Lorenzo Natali"
                      className="h-11 w-11 rounded-full border border-cyan-400/30 object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-50">Portfolio Assistant</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                  <p className="text-xs leading-5 text-slate-500">
                    Guided answers on my background, projects and professional direction.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {assistantCategories.map((category) => {
                      const isActive = category === selectedCategory;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category);
                            const nextPrompt = assistantPrompts.find((prompt) => prompt.categories.includes(category));
                            if (nextPrompt) setSelectedPrompt(nextPrompt);
                            if (questionRailRef.current) questionRailRef.current.scrollLeft = 0;
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-cyan-300/45 bg-cyan-400/10 text-cyan-50"
                              : "border-slate-700 bg-slate-900/45 text-slate-400 hover:border-violet-300/30 hover:text-slate-100"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Question rail</p>
                    <div
                      ref={questionRailRef}
                      className="assistant-question-rail flex gap-2 overflow-x-auto pb-2"
                    >
                      {categoryPrompts.map((prompt) => {
                        const isActive = prompt.question === selectedPrompt.question;
                        return (
                          <button
                            key={prompt.question}
                            type="button"
                            onClick={() => setSelectedPrompt(prompt)}
                            className={`min-w-[13rem] max-w-[16rem] shrink-0 rounded-lg border px-3 py-2.5 text-left text-xs leading-5 transition sm:min-w-[15rem] ${
                              isActive
                                ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                                : "border-slate-800 bg-slate-900/35 text-slate-400 hover:border-violet-300/30 hover:text-slate-100"
                            }`}
                          >
                            {prompt.question}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-900/25 p-5 sm:p-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedPrompt.question}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className=""
                      >
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
                          {selectedPrompt.question}
                        </p>

                        <div className="pt-10">
                          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                            {selectedPrompt.answer}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-800/70 pt-4">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Explore in the portfolio</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-2">
                            {getAssistantSignals(selectedPrompt).map((signal) => (
                              <a
                                key={signal.id}
                                href={signal.href ?? "#"}
                                aria-disabled={signal.missing ? "true" : undefined}
                                onClick={(event) => handleAssistantSignalClick(event, signal)}
                                className={`text-xs font-medium underline underline-offset-4 transition ${
                                  signal.missing
                                    ? "cursor-not-allowed text-slate-600 decoration-slate-700"
                                    : "text-cyan-200/80 decoration-cyan-400/25 hover:text-cyan-100 hover:decoration-cyan-300/60"
                                }`}
                              >
                                {signal.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ProjectDeck({ selectedLens = "Overview" }) {
  const [activeProject, setActiveProject] = useState(0);
  const [direction, setDirection] = useState(1);
  const project = projects[activeProject];
  const isCodeiakProject = project.id === "project-codeiak";

  const showPrevious = () => {
    setDirection(-1);
    setActiveProject((current) => (current === 0 ? projects.length - 1 : current - 1));
  };

  const showNext = () => {
    setDirection(1);
    setActiveProject((current) => (current === projects.length - 1 ? 0 : current + 1));
  };

  const showProject = (index) => {
    if (index === activeProject) return;
    setDirection(index > activeProject ? 1 : -1);
    setActiveProject(index);
  };

  useEffect(() => {
    const handleActivateProject = (event) => {
      const index = projects.findIndex((item) => item.id === event.detail);
      if (index < 0) return;
      setDirection(1);
      setActiveProject(index);
    };
    window.addEventListener("assistant:activate-project", handleActivateProject);
    return () =>
      window.removeEventListener("assistant:activate-project", handleActivateProject);
  }, []);

  const projectLensClass = lensSurfaceClass(selectedLens, "projects", project.id, "cyan");

  return (
    <SurfaceCard data-role-lens-id={project.id} className={`overflow-hidden ${projectLensClass}`}>
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Project Deck</p>
          <p className="mt-1 text-sm text-slate-400">
            {activeProject + 1} / {projects.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Previous project"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/45 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next project"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/45 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-[330px] overflow-hidden p-5 sm:min-h-[300px] sm:p-7">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={project.title}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <p className="text-sm font-medium text-cyan-300/90">{project.status}</p>
              <ProjectStageIndicator stage={project.stage} />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 sm:mt-3">{project.title}</h3>
            <p className="mt-6 max-w-3xl leading-7 text-slate-300 sm:mt-5">{project.text}</p>

            {isCodeiakProject && (
              <div className="codeiak-project-mascot">
                <CodeiakMascotVideo size={336} />
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2 sm:mt-6">
              {project.tech.map((tech) => (
                <span key={tech} className="rounded-md border border-slate-700/70 bg-slate-950/45 px-3 py-1.5 text-xs text-slate-300">
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:mt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {projects.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => showProject(index)}
                    aria-label={`Show project ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeProject ? "w-8 bg-cyan-300" : "w-2.5 bg-slate-700 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>

              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-400/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  View repository
                </a>
              )}
              {!project.link && project.repositoryStatus && (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/45 px-4 py-2.5 text-sm font-medium text-slate-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  {project.repositoryStatus}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </SurfaceCard>
  );
}

function RoleLens({ selectedLens, onSelectLens }) {
  const lens = roleLenses.find((item) => item.name === selectedLens) ?? roleLenses[0];
  const hasActiveLens = !isOverviewLens(selectedLens);
  const roleLensLetters = "ROLE LENS".split("");

  return (
    <section id="role-lens" className="border-t border-slate-800/70 bg-slate-950/95 px-5 py-3 sm:px-8 sm:py-2 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="sticky top-0 z-30 overflow-hidden bg-slate-950/90 py-4 backdrop-blur sm:py-3">
          <div className="relative flex flex-col gap-3 sm:gap-2.5">
            <div className="flex flex-col gap-1.5 sm:gap-1">
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300/80 sm:text-xs sm:tracking-[0.28em]"
                  aria-label="Role Lens"
                >
                  {roleLensLetters.map((letter, index) => (
                    <span
                      key={`${letter}-${index}`}
                      aria-hidden="true"
                      className="role-lens-letter inline-block"
                      style={{ animationDelay: `${index * 0.12}s` }}
                    >
                      {letter === " " ? "\u00A0" : letter}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-400 sm:mt-0.5 sm:text-xs sm:leading-normal sm:text-sm">
                  Select a lens to highlight relevant sections across the portfolio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 sm:gap-2">
              {lensOptions.map((item) => {
                const isActive = item.name === selectedLens;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onSelectLens(item.name)}
                    className={`shrink-0 rounded-md border px-3.5 py-2 text-sm font-medium transition sm:px-3 sm:py-1.5 ${
                      isActive
                        ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                        : "border-slate-700/80 bg-slate-900/45 text-slate-300 hover:border-violet-300/35 hover:text-slate-100"
                    }`}
                  >
                    {item.label ?? item.name}
                  </button>
                );
              })}
              {hasActiveLens ? (
                <button
                  type="button"
                  onClick={() => onSelectLens("Overview")}
                  className="role-lens-reset-active self-center text-sm font-medium text-cyan-100/80 underline decoration-cyan-300/20 underline-offset-4 transition hover:text-cyan-50 hover:decoration-cyan-200/50 sm:text-xs"
                >
                  Reset lens
                </button>
              ) : (
                <span className="self-center text-sm text-slate-600 sm:text-xs">No lens selected</span>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {hasActiveLens && (
            <motion.div
              key={lens.name}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="py-2 text-sm text-slate-400"
            >
              <span className="font-medium text-cyan-100">{lens.label ?? lens.name} lens active</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>{lensSummaries[lens.name]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function ProfileRadarChart({ activeId, onSelect }) {
  const centerX = 80;
  const centerY = 72;
  const maxRadius = 28;
  const labelRadius = 45;
  const angleFor = (index) => (-90 + index * (360 / profileCoverage.length)) * (Math.PI / 180);
  const pointFor = (index, radius) => {
    const angle = angleFor(index);
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };
  // Radar magnitudes are discrete visualization values derived from qualitative
  // evidence-coverage bands; they are not proficiency scores.
  // Headroom keeps the strongest spike just inside the outer ring: STRONG lands
  // on the second-outermost grid ring (0.8) rather than touching the edge.
  const spikeHeadroom = 0.8;
  const radiusForBand = (band) => (coverageBandMagnitude[band] / coverageBandMax) * maxRadius * spikeHeadroom;
  const coveragePolygonPoints = profileCoverage
    .map((axis, index) => {
      const point = pointFor(index, radiusForBand(axis.band));
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center justify-center overflow-visible rounded-2xl border border-slate-800/80 bg-slate-950/45 px-2 py-4 sm:px-4">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_52%)]" />
      <div className="relative z-10 mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
          Evidence coverage
        </span>
      </div>
      <svg className="relative z-10 aspect-[160/130] w-full max-w-[560px] overflow-visible" viewBox="0 0 160 130" role="img" aria-label="Indicative profile evidence coverage chart">
        {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
          <polygon
            key={level}
            points={profileCoverage
              .map((_, index) => {
                const point = pointFor(index, maxRadius * level);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="0.35"
          />
        ))}
        {profileCoverage.map((axis, index) => {
          const outer = pointFor(index, maxRadius);
          const isActive = activeId === axis.id;
          const label = pointFor(index, labelRadius);
          const labelAnchor = label.x > centerX + 8 ? "start" : label.x < centerX - 8 ? "end" : "middle";
          return (
            <g
              key={axis.id}
              role="button"
              tabIndex="0"
              aria-label={`${axis.label}: ${coverageBandText[axis.band]}`}
              aria-pressed={isActive}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(axis.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(axis.id);
                }
              }}
            >
              <line
                x1={centerX}
                y1={centerY}
                x2={outer.x}
                y2={outer.y}
                stroke={isActive ? "rgba(103,232,249,0.38)" : "rgba(148,163,184,0.16)"}
                strokeWidth={isActive ? "0.5" : "0.35"}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                className={`${isActive ? "fill-cyan-100" : "fill-slate-300"} text-[5px] font-medium sm:text-[3.75px]`}
              >
                {axis.shortLabel.map((line, lineIndex) => (
                  <tspan key={line} x={label.x} dy={lineIndex === 0 ? 0 : 5}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        <polygon
          points={coveragePolygonPoints}
          fill="rgba(34,211,238,0.16)"
          stroke="rgba(103,232,249,0.78)"
          strokeWidth="0.65"
        />
        {profileCoverage.map((axis, index) => {
          const point = pointFor(index, radiusForBand(axis.band));
          const isActive = activeId === axis.id;
          return (
            <circle
              key={axis.id}
              cx={point.x}
              cy={point.y}
              r={isActive ? "1.45" : "1.05"}
              fill={isActive ? "rgba(224,251,255,0.98)" : "rgba(165,243,252,0.94)"}
              className="cursor-pointer drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]"
              onClick={() => onSelect(axis.id)}
            />
          );
        })}
      </svg>
      <div className="relative z-10 mt-1 min-h-[32px] w-full max-w-[460px] px-2 text-center">
        <p className="text-[11px] leading-5 text-slate-500">
          Coverage reflects the strength and breadth of supporting portfolio evidence, not a proficiency score.
        </p>
      </div>
    </div>
  );
}

function RiskRadar({ selectedLens = "Overview" }) {
  const [activeDomain, setActiveDomain] = useState(0);
  const [mapView, setMapView] = useState("risk-map");
  const [activeCoverageId, setActiveCoverageId] = useState(profileCoverage[0].id);
  const selectedDomain = radarDomains[activeDomain];
  const selectedTone = getRadarTone(selectedDomain.maturity);
  const selectedCoverage = profileCoverage.find((axis) => axis.id === activeCoverageId) ?? profileCoverage[0];
  const selectedCoverageTone = getCoverageTone(selectedCoverage.band);
  return (
    <section id="risk-radar" className="border-t border-slate-800/70 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight !text-slate-50 sm:text-3xl">
            Professional Risk & Evidence Map.
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            Explore the risk domains shaping my profile and the evidence supporting its development.
          </p>
          {mapView === "risk-map" && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-[0.2em] text-slate-400">Domain status:</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                <span><span className="text-cyan-200/80">Primary</span> · stronger current exposure</span>
                <span><span className="text-violet-200/80">Developing</span> · active competence-building</span>
                <span><span className="text-amber-200/80">Emerging</span> · forward-looking focus</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 p-4 shadow-xl shadow-slate-950/25 backdrop-blur sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/45 p-1">
                {[
                  ["risk-map", "Risk Map"],
                  ["profile-radar", "Profile Coverage"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMapView(value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      mapView === value
                        ? "bg-cyan-300/12 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait">
              {mapView === "risk-map" ? (
                <motion.div
                  key="risk-map"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="radar-plane relative mx-auto aspect-square w-full max-w-[500px] overflow-hidden rounded-full border border-slate-800/80 bg-slate-950/45"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_18%),radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_42%)]" />
                  <div className="radar-sweep" />
                  <div className="absolute inset-[14%] rounded-full border border-slate-700/35" />
                  <div className="absolute inset-[26%] rounded-full border border-slate-800/75" />
                  <div className="absolute inset-[38%] rounded-full border border-slate-800/60" />
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    {radarDomains.map((domain) => {
                      // Extend each spoke past its node so it crosses the
                      // outermost ring (the dish edge at radius 50) instead of
                      // stopping at the node ring.
                      const dx = domain.x - 50;
                      const dy = domain.y - 50;
                      const dist = Math.hypot(dx, dy) || 1;
                      const factor = 49 / dist;
                      return (
                        <line
                          key={domain.title}
                          x1="50"
                          y1="50"
                          x2={50 + dx * factor}
                          y2={50 + dy * factor}
                          stroke="rgba(148, 163, 184, 0.12)"
                          strokeWidth="0.25"
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-950/90 px-3 text-center text-[11px] font-semibold leading-4 text-slate-100 shadow-[0_0_34px_rgba(34,211,238,0.18)] sm:h-24 sm:w-24 sm:text-xs">
                    My Profile
                  </div>

                  {radarDomains.map((domain, index) => {
                    const isActive = index === activeDomain;
                    const isRelevant = isLensRelevant(selectedLens, "radar", domain.id);
                    const isDimmed = !isOverviewLens(selectedLens) && !isRelevant;
                    const tone = getRadarTone(domain.maturity);
                    return (
                      <button
                        key={domain.title}
                        type="button"
                        data-role-lens-id={domain.id}
                        onClick={() => setActiveDomain(index)}
                        className={`group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center transition-opacity ${
                          isDimmed ? "opacity-60" : "opacity-100"
                        }`}
                        style={{ left: `${domain.x}%`, top: `${domain.y}%` }}
                      >
                        <span
                          className={`relative flex h-4 w-4 items-center justify-center rounded-full border transition ${
                            isActive ? tone.activeDot : "border-slate-500 bg-slate-800 group-hover:border-cyan-300/60"
                          } ${!isActive && isRelevant && !isOverviewLens(selectedLens) ? "role-lens-radar-node border-cyan-200 bg-cyan-300" : ""}`}
                        >
                          {isActive && (
                            <>
                              <motion.span
                                className={`absolute inset-[-10px] rounded-full border ${tone.pulsePrimary}`}
                                initial={{ scale: 0.45, opacity: 0 }}
                                animate={{ scale: [0.45, 1.7], opacity: [0, 0.65, 0] }}
                                transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
                              />
                              <motion.span
                                className={`absolute inset-[-14px] rounded-full border ${tone.pulseSecondary}`}
                                initial={{ scale: 0.45, opacity: 0 }}
                                animate={{ scale: [0.45, 1.95], opacity: [0, 0.38, 0] }}
                                transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
                              />
                            </>
                          )}
                        </span>
                        <span
                          className={`max-w-[92px] text-[10px] font-medium leading-4 transition [text-shadow:0_1px_8px_rgba(2,6,23,0.92)] sm:max-w-[130px] sm:text-xs ${
                            isActive || (isRelevant && !isOverviewLens(selectedLens)) ? "text-slate-50" : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        >
                          {domain.title}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="profile-radar"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <ProfileRadarChart activeId={activeCoverageId} onSelect={setActiveCoverageId} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <SurfaceCard className="min-h-[380px] p-5 sm:p-6">
            <AnimatePresence mode="wait">
              {mapView === "risk-map" ? (
                <motion.div
                  key={`domain-${selectedDomain.title}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="border-b border-slate-800 pb-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${selectedTone.badge}`}>
                      {selectedDomain.maturity}
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-50">{selectedDomain.title}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-400">{selectedDomain.category}</p>
                    <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">{selectedDomain.explanation}</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Focus Areas</p>
                    <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                      {selectedDomain.signals.map((signal) => (
                        <li key={signal} className="flex gap-3">
                          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${selectedTone.dot}`} />
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <p className="text-sm text-slate-400">Related portfolio sections:</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {selectedDomain.sections.map((section, index) => (
                        <span key={section} className="inline-flex items-center gap-2">
                          <a href={sectionAnchors[section]} className={`font-medium transition ${selectedTone.link}`}>
                            {section}
                          </a>
                          {index < selectedDomain.sections.length - 1 && <span className="text-slate-600">·</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`coverage-${selectedCoverage.id}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="border-b border-slate-800 pb-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${selectedCoverageTone.badge}`}>
                      {coverageBandText[selectedCoverage.band]}
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-50">{selectedCoverage.label}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-400">Evidence coverage</p>
                    <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">{selectedCoverage.definition}</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Evidence Base</p>
                    <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                      {selectedCoverage.evidenceBase.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${selectedCoverageTone.dot}`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <p className="text-sm text-slate-400">Explore supporting evidence:</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {selectedCoverage.sections.map((section, index) => (
                        <span key={section} className="inline-flex items-center gap-2">
                          <a href={sectionAnchors[section]} className={`font-medium transition ${selectedCoverageTone.link}`}>
                            {section}
                          </a>
                          {index < selectedCoverage.sections.length - 1 && <span className="text-slate-600">·</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SurfaceCard>
        </div>

        <div className="mt-14 border-t border-slate-800 pt-7 text-sm leading-6 text-slate-500">
          <p className="font-medium text-slate-400">Lorenzo Natali</p>
          <p className="mt-2">
            Built with React, Vite and Codex-assisted development. No personal data is collected through this website.
          </p>
          <p className="mt-1">
            Hosted via GitHub Pages.
          </p>
        </div>
      </div>
    </section>
  );
}

function PortfolioIntro({ onComplete }) {
  const words = ["Risk", "Controls", "Technology"];
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Per word: ~220ms scan + settle into accent + ~180ms verified hold before next pillar.
    const timers = [
      window.setTimeout(() => setActiveIndex(0), 1200),
      window.setTimeout(() => setActiveIndex(1), 1900),
      window.setTimeout(() => setActiveIndex(2), 2600),
      window.setTimeout(() => setReady(true), 3000),
      window.setTimeout(() => onComplete?.(), 3800),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [onComplete]);

  return (
    <motion.div
      key="portfolio-intro"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2.5 px-6 text-center">
        <div className="relative flex h-5 w-full items-center justify-center">
          <AnimatePresence mode="sync" initial={false}>
            <motion.p
              key={ready ? "ready" : "init"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-x-0 text-sm font-medium tracking-[0.18em] text-slate-200"
            >
              {ready ? "Profile ready." : "Initializing professional profile"}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-center gap-5 text-sm font-medium uppercase tracking-[0.2em] sm:gap-7 sm:text-base">
          {words.map((word, index) => {
            const active = index <= activeIndex;
            const scanning = index === activeIndex;
            return (
              <span key={word} className="relative inline-block">
                <span
                  className={`transition-colors duration-500 ease-out ${
                    active ? "text-cyan-300" : "text-slate-500"
                  }`}
                >
                  {word}
                </span>
                {scanning && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 select-none"
                    style={{
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      backgroundImage:
                        "linear-gradient(90deg, transparent 46%, rgba(224,242,254,0.55) 50%, transparent 54%)",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "250% 100%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                    initial={{ backgroundPosition: "120% 0%" }}
                    animate={{ backgroundPosition: "-20% 0%" }}
                    transition={{ duration: 0.24, ease: [0.33, 0, 0.2, 1] }}
                  >
                    {word}
                  </motion.span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Production portfolio App.
 * Beyond modules are injected by the boot entry so siteDiag subtractive variants
 * can omit AR imports entirely (not merely hide the UI).
 *
 * @param {{
 *   features?: Partial<import("./diagnostics/appFeatures.js").AppFeatures>,
 *   beyondModules?: BeyondModules | null,
 * }} [props]
 */
function App({ features: featuresProp, beyondModules = null } = {}) {
  const features = resolveAppFeatures(featuresProp ?? DEFAULT_APP_FEATURES);
  const beyondEnabled = Boolean(features.beyond && beyondModules);
  const launchBeyond =
    beyondEnabled &&
    typeof beyondModules.shouldLaunchBeyondCvFromLocation === "function"
      ? () => beyondModules.shouldLaunchBeyondCvFromLocation()
      : () => false;

  const BeyondCard = beyondEnabled ? beyondModules.ARGovernanceCard : null;
  const BeyondView = beyondEnabled ? beyondModules.ARGovernanceView : null;

  const [selectedLens, setSelectedLens] = useState("Overview");
  const [expandedExperiences, setExpandedExperiences] = useState({});
  // QR / shared deep link: ?beyond=1 opens Beyond the CV on first paint.
  const [arOpen, setArOpen] = useState(() => launchBeyond());
  const [showIntro, setShowIntro] = useState(() => {
    if (!features.intro) return false;
    if (typeof window === "undefined") return false;
    // Deep-link launches skip the portfolio splash so AR is not covered.
    if (launchBeyond()) return false;
    try {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
      if (window.sessionStorage.getItem("portfolioIntroSeen") === "1") return false;
    } catch {
      return false;
    }
    return true;
  });

  useLayoutEffect(() => {
    // Ensure deep-link opens the same AR portal as the Beyond the CV button,
    // even if something reset arOpen before first paint.
    if (!beyondEnabled) return;
    if (launchBeyond()) {
      setArOpen(true);
      setShowIntro(false);
    }
  }, [beyondEnabled]);

  useEffect(() => {
    if (!features.intro || !showIntro) return;
    try {
      window.sessionStorage.setItem("portfolioIntroSeen", "1");
    } catch {
      // sessionStorage unavailable (e.g. privacy mode); intro simply won't persist.
    }
  }, [features.intro, showIntro]);

  const toggleExperienceDetails = (experienceId) => {
    setExpandedExperiences((current) => ({
      ...current,
      [experienceId]: !current[experienceId],
    }));
  };

  return (
    <>
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <section id="hero" className="relative overflow-x-hidden bg-slate-950 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.9),transparent_42%)]" />
        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 text-sm font-medium uppercase tracking-[0.32em] text-cyan-300"
            >
              Risk, Audit & Technology Portfolio
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl text-5xl font-semibold tracking-tight !text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl"
            >
              Lorenzo Natali <span className="align-baseline text-3xl font-medium text-white sm:text-4xl lg:text-5xl">那罗成</span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-5 text-xl font-medium !text-slate-300 sm:text-2xl"
            >
              Banking Risk &amp; Controls | Technology &amp; Information Security Governance |
              <br />
              AI Governance
            </motion.h2>

            <div className="h-12" aria-hidden="true" />

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="max-w-3xl space-y-4 text-base leading-8 text-slate-300 sm:text-lg"
            >
              <p>
                I position my profile at the intersection of banking risk, technology &amp; information security
                governance and AI governance, with internal audit and assurance as the connecting backbone that ties
                financial risk, control thinking and emerging technology risks together.
              </p>
              <p>
                This interactive portfolio maps my experience, projects, skills and professional direction, showing how
                these areas connect and evolve across my career.
              </p>
            </motion.div>

            <div className="mt-9 max-w-4xl space-y-3">
              {stackStreams.map((stream) => (
                <TickerStream key={stream.label} stream={stream} selectedLens={selectedLens} />
              ))}
            </div>

            <div className="language-grid mt-5 grid max-w-4xl gap-3">
              {languageItems.map((item) => (
                <div
                  key={item.language}
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-950/25 px-3.5 py-3 backdrop-blur"
                >
                  <div className="language-flag shrink-0" aria-hidden="true">
                    <span>{item.flag}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-100">{item.language}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.level}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="https://www.linkedin.com/in/natalilorenzo/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-sky-400/45 bg-sky-400/15 px-5 py-3.5 text-left font-semibold text-sky-50 shadow-lg shadow-sky-950/30 transition hover:border-sky-300/70 hover:bg-sky-400/20"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded bg-sky-400/90 text-sm font-bold leading-none text-slate-950">
                  in
                </span>
                <span className="flex flex-col leading-none">
                  <span>Connect on LinkedIn</span>
                  <span className="mt-1 text-xs font-normal text-sky-200/80">Request CV or discuss opportunities</span>
                </span>
              </a>
              <a
                href="https://github.com/lorenzo-natali"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/35 bg-slate-950/55 px-5 py-3.5 text-left font-semibold text-slate-100 shadow-lg shadow-black/50 transition hover:border-white/60 hover:bg-slate-900/75 hover:text-white hover:shadow-black/70"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0 fill-current text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.16)]">
                  <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.51.47-3.16-.63-3.36-1.21-.11-.3-.6-1.21-1.03-1.46-.35-.19-.85-.66-.01-.67.79-.01 1.35.74 1.54 1.05.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.11.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.24 9.24 0 0 1 12 6.98c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.05.36.32.68.93.68 1.89 0 1.37-.01 2.47-.01 2.82 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
                </svg>
                <span className="flex flex-col leading-none">
                  <span>GitHub Profile</span>
                  <span className="mt-1 text-xs font-normal text-slate-400">View projects and code</span>
                </span>
              </a>
            </div>
          </div>

          <div className="flex w-full flex-col gap-14 lg:w-[320px]">
            {BeyondCard ? <BeyondCard onLaunch={() => setArOpen(true)} /> : null}
            {features.assistant ? <PortfolioAssistant /> : null}
          </div>
        </div>
      </section>

      {BeyondView ? (
        <BeyondView open={arOpen} onClose={() => setArOpen(false)} />
      ) : null}

      <RoleLens selectedLens={selectedLens} onSelectLens={setSelectedLens} />

      <Section id="capabilities" title="Professional Capabilities">
        <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
          {expertise.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                data-role-lens-id={item.id}
                className="group p-1"
                whileHover={isLensRelevant(selectedLens, "capabilities", item.id) ? { y: -5, scale: 1.01 } : { y: -3 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <SurfaceCard className={`h-full p-5 sm:p-6 ${lensSurfaceClass(selectedLens, "capabilities", item.id)}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3 group-hover:scale-110" />
                    <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
                  </div>
                  {item.id === "capability-international-cross-cultural" && (
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">
                      Transversal capability
                    </p>
                  )}
                  <p className="mt-4 leading-7 text-slate-300">{item.text}</p>
                </SurfaceCard>
              </motion.div>
            );
          })}
        </div>
      </Section>

      <Section id="credentials" title="Professional Certifications Roadmap" className="bg-slate-950/80">
        <div className="credentials-rail -mx-4 -mt-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-2 sm:px-2">
          {credentials.map((credential) => (
            <SurfaceCard
              data-role-lens-id={credential.id}
              key={credential.title}
              className={`flex w-[78%] shrink-0 snap-start flex-col p-5 sm:w-[20rem] ${lensSurfaceClass(selectedLens, "credentials", credential.id)}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-50">{credential.title}</h3>
                  <p className="mt-0.5 text-sm text-cyan-200/80">{credential.subtitle}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-300">{credential.description}</p>
              {credential.certificate && (
                <div className="mt-4 border-t border-slate-800/80 pt-3 text-xs">
                  <p className="font-semibold uppercase tracking-[0.18em] text-slate-600">{credential.certificate.label}</p>
                  {credential.certificate.url ? (
                    <a
                      href={credential.certificate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-cyan-200/85 transition hover:text-cyan-100"
                    >
                      View certificate
                    </a>
                  ) : (
                    <p className="mt-1 text-slate-500">{credential.certificate.text}</p>
                  )}
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{additionalTraining.label}</p>
          <div className="attestation-rail mt-3 flex gap-4 overflow-x-auto pb-3">
            {additionalTraining.items.map((item) => (
              <div
                key={item.id}
                data-role-lens-id={item.id}
                className="attestation-card group relative min-w-[20rem] snap-start overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/25 p-4 text-sm shadow-lg shadow-slate-950/10 backdrop-blur transition hover:border-slate-700 hover:bg-slate-900/75 sm:min-w-[23rem] lg:min-w-[24rem]"
              >
                <h3 className="font-medium leading-6 text-slate-300">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-cyan-200/55">{item.subtitle}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
                {item.attestation?.url ? (
                  <a
                    href={item.attestation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-xs text-slate-500 underline decoration-slate-700/80 underline-offset-2 transition hover:text-cyan-200/70 hover:decoration-cyan-400/35"
                  >
                    {item.attestation.label}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="experience" title="Professional Experience" className="bg-slate-950/80">
        <div className="relative max-w-5xl">
          <div className="absolute bottom-0 left-3 top-2 w-px bg-slate-800 sm:left-4" />
          <div className="space-y-6">
            {experiences.map((exp) => {
              const hasDetails = Array.isArray(exp.details) && exp.details.length > 0;
              const isExpanded = hasDetails && Boolean(expandedExperiences[exp.id]);

              return (
                <motion.article
                  key={`${exp.role}-${exp.company}`}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  data-role-lens-id={exp.id}
                  className="relative pl-10 sm:pl-12"
                >
                  <div className="absolute left-[7px] top-6 h-3 w-3 rounded-full border border-slate-950 bg-cyan-300 shadow-[0_0_0_5px_rgba(15,23,42,0.95)] sm:left-[11px]" />
                  <SurfaceCard className={`p-5 sm:p-6 ${lensSurfaceClass(selectedLens, "experiences", exp.id)}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-cyan-300">{exp.period}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">{exp.role}</h3>
                        <p className="mt-1 text-sm text-slate-400">{exp.company}</p>
                        {exp.note && (
                          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
                            {exp.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <AnimatePresence initial={false} mode="wait">
                      {!isExpanded && (
                        <motion.ul
                          key="summary"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="mt-4 space-y-2 overflow-hidden text-sm leading-6 text-slate-300 sm:text-base"
                        >
                          {hasDetails && (
                            <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                              Summary
                            </li>
                          )}
                          {exp.points.map((point) => (
                            <li key={point} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>

                    {hasDetails && (
                    <div className="mt-5 border-t border-slate-800/80 pt-4">
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() => toggleExperienceDetails(exp.id)}
                          aria-expanded={isExpanded}
                          className="text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                        >
                          View details
                        </button>
                      )}

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="details"
                            initial={{ opacity: 0, height: 0, y: -6 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <ul className="space-y-2.5 text-sm leading-6 text-slate-300 sm:text-base">
                              <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                                Details
                              </li>
                              {exp.details.map((detail) => (
                                <li key={detail} className="flex gap-3">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={() => toggleExperienceDetails(exp.id)}
                              aria-expanded={isExpanded}
                              className="mt-5 text-sm font-medium text-cyan-200/85 transition hover:text-cyan-100"
                            >
                              Show less
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    )}
                  </SurfaceCard>
                </motion.article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section id="projects" title="Projects & Applied Work">
        <ProjectDeck selectedLens={selectedLens} />
      </Section>

      <Section id="education" title="Education" className="bg-slate-950/80">
        <div className="education-rail -mx-4 -mt-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-2 sm:px-2">
          {education.map((item) => (
            <SurfaceCard
              key={item.degree}
              data-role-lens-id={item.id}
              className="flex w-[78%] shrink-0 snap-start flex-col p-5 sm:w-[20rem]"
            >
              <GraduationCap className="mb-4 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium text-slate-400">{item.period}</p>
              <h3 className="mt-3 text-base font-semibold leading-6 text-slate-50">
                {item.degree}
                {item.focus && <AcademicFocusInfo id={`${item.id}-focus`} text={item.focus} />}
              </h3>
              {item.qualifier && (
                <p className="mt-1.5 text-sm font-medium text-slate-400">{item.qualifier}</p>
              )}
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.school}</p>
              {item.detail && (
                <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-400">{item.detail}</p>
              )}
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <RiskRadar selectedLens={selectedLens} />
    </main>
    <AnimatePresence>
      {features.intro && showIntro ? (
        <PortfolioIntro onComplete={() => setShowIntro(false)} />
      ) : null}
    </AnimatePresence>
    </>
  );
}

export default App;
