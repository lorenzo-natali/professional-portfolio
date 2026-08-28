import {
  Brain,
  BriefcaseBusiness,
  Database,
  Languages,
  Lock,
  ShieldCheck,
} from "lucide-react";

export const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const expertise = [
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

export const experiences = [
  {
    id: "experience-banca-profilo",
    role: "IT Audit Specialist",
    company: "Banca Profilo · Milan",
    period: "September 2026 – Present",
    upcoming: true,
    upcomingNote:
      "I am joining Banca Profilo at the outset of its 2026–2028 Industrial Plan, during a significant transformation of its business and technology model, with a focus on Internal Audit, control environment and technology governance.",
    reference: {
      label: "2026–2028 Industrial Plan ↗",
      href: "https://www.bancaprofilo.it/wp-content/uploads/2026/02/BP_Piano-Industriale_26-28_esteso.pdf",
    },
  },
  {
    id: "experience-boc",
    role: "Internal Auditor",
    company: "Bank of China – Milan Branch · 中国银行米兰分行",
    period: "Oct 2025 – Sep 2026",
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

export const projects = [
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

export const projectStages = ["Concept", "Prototype", "Functional Build", "Advanced Iteration", "Public Release"];

export const education = [
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

export const credentials = [
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

export const additionalTraining = {
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

export const stackStreams = [
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

export const languageItems = [
  { flag: "🇮🇹", language: "Italian", level: "Native" },
  { flag: "🇬🇧", language: "English", level: "C2" },
  { flag: "🇫🇷", language: "French", level: "B1" },
  { flag: "🇨🇳", language: "Mandarin Chinese", level: "B1" },
];

export const radarDomains = [
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Experience", "Expertise", "Credentials"],
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
    sections: ["Expertise", "Experience"],
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Project Deck", "Credentials", "Expertise"],
  },
];

// Profile Coverage answers "how strongly is the profile supported by evidence?"
// (kept conceptually separate from the Risk Radar's professional-domain view).
// Each dimension carries a qualitative evidence-coverage band (STRONG / DEVELOPING /
// EMERGING) describing the strength and breadth of supporting portfolio evidence —
// NOT a proficiency, skill or completion score.
export const profileCoverage = [
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Experience", "Expertise"],
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
    sections: ["Expertise", "Project Deck", "Credentials"],
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
    sections: ["Project Deck", "Expertise", "Experience"],
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
    sections: ["Project Deck", "Expertise"],
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
export const coverageBandMagnitude = { STRONG: 3, DEVELOPING: 2, EMERGING: 1.5 };
export const coverageBandMax = 3;
export const coverageBandText = {
  STRONG: "Strong evidence",
  DEVELOPING: "Developing evidence",
  EMERGING: "Emerging evidence",
};

export const sectionAnchors = {
  Hero: "#hero",
  "Role Lens": "#role-lens",
  Experience: "#experience",
  Expertise: "#capabilities",
  "Project Deck": "#projects",
  Credentials: "#credentials",
  Education: "#education",
  "Risk Radar": "#risk-radar",
};

export const roleLenses = [
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


export const lensSummaries = {
  "IT Audit": "Highlights control assurance, information systems governance and audit documentation signals.",
  "Technology Risk": "Highlights ICT risk, operational resilience, DORA-related controls and technology-enabled environments.",
  "Information Security Governance": "Highlights information security controls and frameworks such as ISO/IEC 27001, NIST CSF and COBIT.",
  "AI Governance": "Highlights AI governance, AI risk, auditability and the controls around AI-enabled workflows.",
  "Banking Risk": "Highlights credit risk, IFRS 9, supervisory frameworks and banking control environments.",
};

export const lensRelevance = {
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
    experiences: ["experience-banca-profilo", "experience-boc"],
    projects: [],
    radar: ["radar-control-audit-risk", "radar-technology-ict-risk", "radar-operational-resilience"],
    education: [],
    streamItems: ["Internal Audit", "Internal Controls", "SOX Principles", "ITGC"],
  },
  "Technology Risk": {
    capabilities: ["capability-technology-risk", "capability-information-security"],
    credentials: ["credential-cisa", "credential-crisc"],
    experiences: ["experience-banca-profilo", "experience-boc"],
    projects: [],
    radar: ["radar-technology-ict-risk", "radar-operational-resilience", "radar-information-security-governance"],
    education: [],
    streamItems: ["DORA", "Operational Resilience", "ICT Third-Party Risk", "ITGC", "COBIT"],
  },
  "Information Security Governance": {
    capabilities: ["capability-information-security", "capability-technology-risk"],
    credentials: ["credential-cisa", "credential-crisc"],
    experiences: ["experience-banca-profilo", "experience-boc"],
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

export const signalMap = {
  "role-lens": { label: "Role Lens", href: "#role-lens", target: { type: "section", id: "role-lens" } },
  "risk-radar": { label: "Risk Radar", href: "#risk-radar", target: { type: "section", id: "risk-radar" } },
  "cap-internal-audit": { label: "Internal Audit & Assurance", href: "#capabilities", target: { type: "capability", id: "capability-audit-control" } },
  "cap-banking-risk": { label: "Banking Risk & Regulation", href: "#capabilities", target: { type: "capability", id: "capability-banking-risk" } },
  "cap-technology-risk": { label: "Technology & ICT Risk", href: "#capabilities", target: { type: "capability", id: "capability-technology-risk" } },
  "cap-information-security": { label: "Information Security Governance", href: "#capabilities", target: { type: "capability", id: "capability-information-security" } },
  "cap-ai-governance": { label: "AI Governance", href: "#capabilities", target: { type: "capability", id: "capability-ai-governance" } },
  "exp-boc": { label: "Bank of China — Internal Audit", href: "#experience", target: { type: "experience", id: "experience-boc" } },
  "exp-banca-profilo": { label: "Banca Profilo — IT Audit Specialist", href: "#experience", target: { type: "experience", id: "experience-banca-profilo" } },
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

export const assistantPrompts = [
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

export const assistantCategories = [
  "Profile & Career Direction",
  "Audit, Banking & Financial Risk",
  "Technology Risk & Operational Resilience",
  "Information Security & AI Governance",
  "Projects & Technical Skills",
  "Professional Development",
  "Recruiter Concerns",
];
