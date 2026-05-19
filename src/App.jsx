import { useEffect, useRef, useState } from "react";
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
  Share2,
  ShieldCheck,
} from "lucide-react";
import CodeiakMascotVideo from "./components/CodeiakMascotVideo";
import "./index.css";

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

const expertise = [
  {
    id: "capability-audit-control",
    title: "Audit & Control Assurance",
    icon: ShieldCheck,
    text: "Audit documentation, control testing, working papers and analytical reporting to assess control design, effectiveness and governance structures.",
  },
  {
    id: "capability-banking-risk",
    title: "Banking Risk & Regulation",
    icon: BriefcaseBusiness,
    text: "Analysis of credit risk, IFRS 9 ECL concepts, RAF, ICAAP, ILAAP, Pillar III and supervisory frameworks within regulated banking environments.",
  },
  {
    id: "capability-technology-risk",
    title: "Technology Risk & Resilience",
    icon: Database,
    text: "Assessment of IT systems, access controls, business continuity, operational resilience and DORA-related risk areas.",
  },
  {
    id: "capability-ai-governance",
    title: "AI Governance & Data Systems",
    icon: Brain,
    text: "Focus on AI-related risks, audit traceability, local LLM workflows, structured data extraction and controlled automation.",
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
      "Analyzing credit risk, regulatory frameworks, IFRS 9 ECL methodologies and operational resilience.",
      "Assessing internal controls, AML/KYC processes and banking governance structures.",
      "Producing analytical reports and working papers to support control improvements.",
    ],
    details: [
      "Analyzed corporate credit and syndicated loan portfolios, assessing credit risk drivers, financial covenants and capital structure exposure.",
      "Evaluated risk management and regulatory frameworks including RAF, ICAAP, ILAAP and Pillar III, focusing on data flows, control effectiveness and alignment with capital requirements.",
      "Reviewed IFRS 9 ECL methodologies, analyzing key risk parameters such as PD and LGD and their impact on credit risk provisioning and portfolio quality.",
      "Assessed IT systems and operational resilience under DORA, including access controls, business continuity processes and system reliability.",
      "Analyzed AML/KYC processes, identifying risk exposure and evaluating control design in line with ECB and Bank of Italy supervisory expectations.",
      "Performed regulatory compliance analysis related to the Italian Interbank Deposit Protection Scheme (FITD), assessing internal control processes and governance structures.",
      "Produced analytical reports and working papers, supporting management in identifying risk areas and strengthening internal control frameworks.",
      "Operated in a multicultural banking environment requiring confidentiality, analytical rigor and strong regulatory awareness.",
    ],
  },
  {
    id: "experience-prelios",
    role: "Accounting & Administration Intern",
    company: "Prelios – Financial Service",
    period: "May 2025 – Oct 2025",
    points: [
      "Managed accounting lifecycle activities for NPL/UTP portfolios.",
      "Prepared IFRS financial statements and supported group consolidation.",
      "Processed and reconciled accounting data across SAP and HFM/Oracle.",
    ],
    details: [
      "Managed the accounting lifecycle of NPL/UTP portfolios.",
      "Prepared IFRS financial statements and supported group consolidation.",
      "Processed and reconciled accounting data in SAP and HFM/Oracle.",
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
      "Managed daily operations for HNWI residential clients.",
      "Coordinated vendors, events and real-time client requests.",
      "Developed stakeholder communication, multitasking and problem-solving skills.",
    ],
    details: [
      "Managed daily operations in a luxury residential building serving HNWI clients.",
      "Coordinated vendors and exclusive events.",
      "Handled real-time client requests requiring multitasking and problem-solving.",
      "Developed stakeholder communication skills in a high-expectation service environment.",
    ],
  },
];

const projects = [
  {
    id: "project-ai-audit-workflow",
    title: "AI-Assisted Audit Workflow",
    status: "Ongoing personal project",
    stage: "Functional Build",
    text: "Designing an AI-assisted audit knowledge system using local models to extract findings, recommendations and evidence from audit documentation while preserving traceability.",
    tech: ["Python", "Local LLMs", "VLM Models", "AI Agents", "Structured Data Extraction"],
    link: "https://github.com/lorenzo-natali/ai-audit-workflow",
  },
  {
    id: "project-codeiak",
    title: "CodeIAK — Local AI Coding Agent",
    status: "Ongoing personal project",
    stage: "Advanced Iteration",
    text: "Building a local-first AI coding agent that integrates multi-model orchestration, structured agentic workflows, reviewable and reversible code changes, and live execution transparency to help users inspect, modify and validate software projects offline.",
    tech: ["Local LLMs", "AI Agents", "Multi-Model Orchestration", "OpenClaw Integration", "Offline-First"],
    repositoryStatus: "Repository coming soon",
  },
  {
    id: "project-esg-audit",
    title: "ESG Auditing – Illy Caffè",
    status: "Academic project",
    text: "Conducted an ESG audit of Illy Caffè's 2023 sustainability report, assessing compliance with GRI standards and contributing to the audit report.",
    tech: ["ESG", "GRI", "Sustainability Reporting", "Audit"],
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
];

const credentials = [
  {
    id: "credential-cisa",
    title: "CISA Candidate",
    subtitle: "Exam planned end 2026",
    description:
      "Preparing for the Certified Information Systems Auditor certification, focused on information systems audit, IT governance, control assurance and technology risk.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
  {
    id: "credential-frm",
    title: "FRM Certification",
    subtitle: "Planned 2027",
    description:
      "Planned Financial Risk Manager certification path, focused on financial risk management, credit risk, market risk and quantitative risk foundations.",
    certificate: {
      label: "Certificate",
      text: "Coming soon",
      url: null,
    },
  },
  {
    id: "credential-chinese-language",
    title: "Chinese Language Track",
    subtitle: "HSK3 preparation course · Jan 2024",
    description:
      "Completed HSK3 exam preparation course at the Confucius Institute of Università Cattolica del Sacro Cuore, Milan, supporting a cross-cultural professional profile.",
  },
];

const additionalTraining = {
  label: "Additional Training",
  title: "Healthcare Transport Operator Certification, Basic Life Support",
  subtitle: "AREU / Green Cross Milano Sempione · Sep–Dec 2015",
  description:
    "Training in healthcare transport, basic life support and emergency response.",
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
      "Risk Assessment",
      "Credit Risk",
      "IFRS 9 / ECL",
      "DORA",
      "Operational Resilience",
      "Business Impact Analysis",
      "Business Continuity Planning",
      "Banking Regulatory Frameworks",
      "ECB Supervision",
      "Basel III / IV",
      "CRD VI",
      "ICAAP / ILAAP",
      "Pillar III",
      "AML / KYC",
      "ESG Reporting",
    ],
  },
  {
    label: "Technology & Data",
    description: "Tools and workflows for analysis, automation and AI-assisted audit.",
    accent: "violet",
    direction: "right",
    items: [
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
      "Codex",
      "Cursor",
      "Notion",
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
    title: "Control & Audit Risk",
    maturity: "Primary domain",
    category: "Control / Assurance",
    x: 50,
    y: 12,
    explanation:
      "Assessment of internal controls, control design, audit documentation, working papers and governance structures.",
    signals: ["Internal control systems", "Control testing", "Audit documentation", "Analytical reports and working papers"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-credit-risk",
    title: "Credit Risk",
    maturity: "Primary domain",
    category: "Banking / Credit",
    x: 82,
    y: 30,
    explanation:
      "Analysis of credit risk drivers, corporate credit portfolios, IFRS 9 ECL concepts, PD/LGD parameters and provisioning impacts.",
    signals: ["Corporate credit portfolios", "IFRS 9 / ECL", "PD and LGD concepts", "Financial covenants"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-regulatory-compliance-risk",
    title: "Regulatory & Compliance Risk",
    maturity: "Primary domain",
    category: "Regulatory / Compliance",
    x: 82,
    y: 70,
    explanation:
      "Assessment of regulatory expectations, governance structures and compliance-related controls within international banking environments.",
    signals: ["RAF, ICAAP, ILAAP, Pillar III", "AML / KYC processes", "ECB and Bank of Italy expectations", "Basel and CRD VI awareness"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-technology-ict-risk",
    title: "Technology & ICT Risk",
    maturity: "Developing domain",
    category: "Technology / ICT",
    x: 50,
    y: 88,
    explanation:
      "Review of IT systems, access controls, information systems governance and technology-enabled control environments.",
    signals: ["IT systems exposure", "Access controls", "Information systems governance", "CISA-oriented learning path"],
    sections: ["Professional Capabilities", "Credentials"],
  },
  {
    id: "radar-operational-resilience",
    title: "Operational Resilience",
    maturity: "Developing domain",
    category: "Resilience / Continuity",
    x: 18,
    y: 70,
    explanation:
      "Assessment of business continuity, system reliability, outsourcing dependencies and DORA-related resilience areas.",
    signals: ["DORA", "Business continuity", "System reliability", "Operational resilience"],
    sections: ["Experience", "Professional Capabilities"],
  },
  {
    id: "radar-ai-model-governance",
    title: "AI & Model Governance",
    maturity: "Emerging focus",
    category: "AI / Model Governance",
    x: 18,
    y: 30,
    explanation:
      "Developing focus on AI-related risks, model governance, audit traceability, LLM evaluation and controlled automation.",
    signals: ["AI-assisted audit workflow", "Local LLM/VLM experimentation", "Audit traceability", "Model governance interest"],
    sections: ["Project Deck", "Credentials"],
  },
];

const profileRadarAxes = [
  { domainId: "radar-control-audit-risk", value: 65, targetValue: 85 },
  { domainId: "radar-credit-risk", value: 55, targetValue: 75 },
  { domainId: "radar-regulatory-compliance-risk", value: 55, targetValue: 80 },
  { domainId: "radar-technology-ict-risk", value: 50, targetValue: 80 },
  { domainId: "radar-operational-resilience", value: 50, targetValue: 80 },
  { domainId: "radar-ai-model-governance", value: 45, targetValue: 75 },
];

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
    explanation: "Explore the full profile across audit, risk, technology and AI governance.",
    signals: [
      "Internal audit and control assurance",
      "Banking risk and regulatory frameworks",
      "Technology risk and operational resilience",
      "AI-assisted audit workflows",
    ],
  },
  {
    name: "IT Audit",
    explanation: "Relevant for roles focused on control assurance, information systems governance and audit documentation.",
    signals: [
      "Internal control assessment",
      "IT systems and access controls",
      "CISA-oriented learning path",
      "Working papers and audit reporting",
    ],
  },
  {
    name: "Technology Risk",
    explanation: "Relevant for roles involving operational resilience, ICT risk, DORA-related controls and technology-enabled environments.",
    signals: [
      "DORA and operational resilience",
      "IT systems exposure",
      "Access controls and business continuity",
      "Technology Risk & Resilience capability",
    ],
  },
  {
    name: "AI Governance",
    explanation: "Relevant for roles exploring AI-related risks, model governance, audit traceability and controlled automation.",
    signals: [
      "AI-Assisted Audit Workflow",
      "Local LLM/VLM experimentation",
      "Audit traceability",
      "AI & Model Governance radar domain",
    ],
  },
  {
    name: "Banking Risk",
    explanation: "Relevant for roles focused on credit risk, IFRS 9, supervisory frameworks and banking control environments.",
    signals: [
      "Credit risk exposure",
      "IFRS 9 / ECL concepts",
      "RAF, ICAAP, ILAAP, Pillar III",
      "Regulatory & Compliance Risk radar domain",
    ],
  },
  {
    name: "Audit Analytics",
    label: "Data & Audit Analytics",
    explanation: "Relevant for roles combining audit judgment with data analysis, structured extraction and automation.",
    signals: [
      "Python and pandas",
      "Structured extraction",
      "Data-oriented audit workflows",
      "AI-assisted audit project",
    ],
  },
];

const lensOptions = roleLenses.filter((lens) => lens.name !== "Overview");

const lensSummaries = {
  "IT Audit": "Highlights control assurance, information systems governance and audit documentation signals.",
  "Technology Risk": "Highlights ICT risk, operational resilience, DORA-related controls and technology-enabled environments.",
  "AI Governance": "Highlights AI-related risks, audit traceability, local LLM workflows and controlled automation.",
  "Banking Risk": "Highlights credit risk, IFRS 9, supervisory frameworks and banking control environments.",
  "Audit Analytics": "Highlights audit judgment, data analysis, structured extraction and automation signals.",
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
    assistantQuestions: [],
  },
  "IT Audit": {
    capabilities: ["capability-audit-control", "capability-technology-risk", "capability-international-cross-cultural"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc"],
    projects: ["project-ai-audit-workflow"],
    radar: ["radar-control-audit-risk", "radar-technology-ict-risk", "radar-operational-resilience"],
    education: [],
    streamItems: [],
    assistantQuestions: [
      "assistant-internal-audit-experience",
      "assistant-technology-risk-experience",
      "assistant-cisa-preparation",
      "assistant-control-areas",
    ],
  },
  "Technology Risk": {
    capabilities: ["capability-technology-risk", "capability-banking-risk", "capability-international-cross-cultural"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-technology-ict-risk", "radar-operational-resilience", "radar-regulatory-compliance-risk"],
    education: [],
    streamItems: [],
    assistantQuestions: [
      "assistant-technology-risk-experience",
      "assistant-operational-resilience-dora",
      "assistant-cisa-preparation",
      "assistant-hands-on-technical-skills",
      "assistant-codeiak-project",
    ],
  },
  "AI Governance": {
    capabilities: ["capability-ai-governance", "capability-technology-risk", "capability-international-cross-cultural"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-ai-model-governance", "radar-technology-ict-risk", "radar-control-audit-risk"],
    education: [],
    streamItems: ["Local LLMs", "RAG Workflows", "AI Agents", "LLM Evaluation", "Audit Traceability"],
    assistantQuestions: [
      "assistant-ai-governance-exposure",
      "assistant-ai-projects-built",
      "assistant-audit-traceability",
      "assistant-too-junior-tech-ai",
      "assistant-codeiak-project",
    ],
  },
  "Banking Risk": {
    capabilities: ["capability-banking-risk", "capability-audit-control", "capability-international-cross-cultural"],
    credentials: ["credential-frm", "credential-cisa"],
    experiences: ["experience-boc", "experience-prelios"],
    projects: [],
    radar: ["radar-credit-risk", "radar-regulatory-compliance-risk", "radar-control-audit-risk"],
    education: [],
    streamItems: ["IFRS 9 / ECL", "Credit Risk", "ICAAP / ILAAP", "Pillar III", "Basel III / IV", "CRD VI"],
    assistantQuestions: [
      "assistant-credit-risk-exposure",
      "assistant-banking-regulation-exposure",
      "assistant-frm-planning",
      "assistant-control-areas",
    ],
  },
  "Audit Analytics": {
    capabilities: ["capability-ai-governance", "capability-audit-control"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc", "experience-prelios"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-control-audit-risk", "radar-ai-model-governance", "radar-technology-ict-risk"],
    education: [],
    streamItems: ["Python", "pandas", "Data Analysis", "Structured Data Extraction", "Audit Traceability"],
    assistantQuestions: [
      "assistant-python-data-analysis",
      "assistant-audit-traceability",
      "assistant-ai-audit-workflow-project",
      "assistant-hands-on-technical-skills",
    ],
  },
};

const signalMap = {
  "role-lens": {
    label: "Role Lens",
    href: "#role-lens",
    lenses: ["IT Audit", "Technology Risk", "AI Governance", "Banking Risk", "Audit Analytics"],
  },
  "professional-capabilities": {
    label: "Professional Capabilities",
    href: "#capabilities",
    capabilities: expertise.map((item) => item.id),
  },
  "risk-radar": {
    label: "Professional Risk Map",
    href: "#risk-radar",
    radar: radarDomains.map((domain) => domain.id),
  },
  experience: {
    label: "Experience",
    href: "#experience",
    experiences: ["experience-boc", "experience-prelios"],
  },
  "bank-of-china-experience": {
    label: "Experience",
    href: "#experience",
    experiences: ["experience-boc"],
  },
  "learning-roadmap": {
    label: "Learning Roadmap",
    href: "#credentials",
    credentials: credentials.map((item) => item.id),
  },
  "audit-control-assurance": {
    label: "Audit & Control Assurance",
    href: "#capabilities",
    capabilities: ["capability-audit-control"],
    experiences: ["experience-boc"],
    radar: ["radar-control-audit-risk"],
  },
  "banking-risk-regulation": {
    label: "Banking Risk & Regulation",
    href: "#capabilities",
    capabilities: ["capability-banking-risk"],
    experiences: ["experience-boc"],
    radar: ["radar-credit-risk", "radar-regulatory-compliance-risk"],
  },
  "technology-risk-resilience": {
    label: "Technology Risk & Resilience",
    href: "#capabilities",
    capabilities: ["capability-technology-risk"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc"],
    radar: ["radar-technology-ict-risk", "radar-operational-resilience"],
  },
  "ai-governance-data-systems": {
    label: "AI Governance & Data Systems",
    href: "#capabilities",
    capabilities: ["capability-ai-governance"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-ai-model-governance"],
  },
  "international-cross-cultural-work": {
    label: "International & Cross-Cultural Work",
    href: "#capabilities",
    capabilities: ["capability-international-cross-cultural"],
    experiences: ["experience-boc"],
    education: ["education-languages"],
    credentials: ["credential-chinese-language"],
  },
  "control-audit-risk": {
    label: "Control & Audit Risk",
    href: "#risk-radar",
    capabilities: ["capability-audit-control"],
    experiences: ["experience-boc"],
    radar: ["radar-control-audit-risk"],
  },
  "credit-risk": {
    label: "Credit Risk",
    href: "#risk-radar",
    capabilities: ["capability-banking-risk"],
    experiences: ["experience-boc", "experience-prelios"],
    credentials: ["credential-frm"],
    radar: ["radar-credit-risk"],
    streamItems: ["Credit Risk", "IFRS 9 / ECL"],
  },
  "regulatory-compliance-risk": {
    label: "Regulatory & Compliance Risk",
    href: "#risk-radar",
    capabilities: ["capability-banking-risk", "capability-audit-control"],
    experiences: ["experience-boc"],
    radar: ["radar-regulatory-compliance-risk"],
    streamItems: ["Banking Regulatory Frameworks", "ECB Supervision", "ICAAP / ILAAP", "Pillar III", "AML / KYC"],
  },
  "technology-ict-risk": {
    label: "Technology & ICT Risk",
    href: "#risk-radar",
    capabilities: ["capability-technology-risk"],
    credentials: ["credential-cisa"],
    experiences: ["experience-boc"],
    radar: ["radar-technology-ict-risk"],
  },
  "operational-resilience": {
    label: "Operational Resilience",
    href: "#risk-radar",
    capabilities: ["capability-technology-risk"],
    experiences: ["experience-boc"],
    radar: ["radar-operational-resilience"],
    streamItems: ["DORA", "Operational Resilience", "Business Impact Analysis", "Business Continuity Planning"],
  },
  "ai-model-governance": {
    label: "AI & Model Governance",
    href: "#risk-radar",
    capabilities: ["capability-ai-governance", "capability-technology-risk"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
    radar: ["radar-ai-model-governance"],
    streamItems: ["Local LLMs", "RAG Workflows", "AI Agents", "LLM Evaluation", "Audit Traceability", "Multi-Model Orchestration", "Offline-First"],
  },
  "ai-audit-workflow": {
    label: "AI-Assisted Audit Workflow",
    href: "#projects",
    projects: ["project-ai-audit-workflow"],
    capabilities: ["capability-ai-governance", "capability-audit-control"],
    radar: ["radar-ai-model-governance", "radar-control-audit-risk"],
  },
  codeiak: {
    label: "CodeIAK — Local AI Coding Agent",
    href: "#projects",
    projects: ["project-codeiak"],
    capabilities: ["capability-ai-governance", "capability-technology-risk"],
    radar: ["radar-ai-model-governance", "radar-technology-ict-risk"],
    streamItems: ["Local LLMs", "AI Agents", "LLM Evaluation", "GitHub"],
  },
  "technology-data-stream": {
    label: "Technology & Data Stream",
    href: "#hero",
    streamItems: ["Python", "pandas", "SQL", "Data Analysis", "Local LLMs", "RAG Workflows", "AI Agents", "Audit Traceability", "Structured Data Extraction"],
  },
  "risk-regulatory-stream": {
    label: "Risk & Regulatory Stream",
    href: "#hero",
    streamItems: ["Internal Audit", "Internal Controls", "Credit Risk", "IFRS 9 / ECL", "DORA", "Operational Resilience"],
  },
  "audit-analytics-lens": {
    label: "Data & Audit Analytics lens",
    href: "#role-lens",
    lenses: ["Audit Analytics"],
    capabilities: ["capability-ai-governance", "capability-audit-control"],
    projects: ["project-ai-audit-workflow", "project-codeiak"],
  },
  "cisa-candidate": {
    label: "CISA Candidate",
    href: "#credentials",
    credentials: ["credential-cisa"],
    capabilities: ["capability-technology-risk"],
    radar: ["radar-technology-ict-risk"],
  },
  "frm-certification": {
    label: "FRM Certification",
    href: "#credentials",
    credentials: ["credential-frm"],
    capabilities: ["capability-banking-risk"],
    radar: ["radar-credit-risk"],
  },
  "chinese-language-track": {
    label: "Chinese Language Track",
    href: "#credentials",
    credentials: ["credential-chinese-language"],
    education: ["education-languages"],
  },
  "hero-languages": {
    label: "Hero Languages",
    href: "#hero",
    education: ["education-languages"],
    credentials: ["credential-chinese-language"],
  },
  education: {
    label: "Education",
    href: "#education",
    education: education.map((item) => item.id),
  },
  "audit-traceability": {
    label: "Audit Traceability",
    href: "#hero",
    streamItems: ["Audit Traceability", "Structured Data Extraction"],
    projects: ["project-ai-audit-workflow"],
    radar: ["radar-ai-model-governance"],
  },
};

const assistantPrompts = [
  {
    id: "assistant-role-orientation",
    categories: ["Profile Fit"],
    question: "What kind of roles are you oriented toward?",
    answer:
      "I am oriented toward roles at the intersection of internal audit, technology risk, banking regulation, data-driven control systems and AI governance. I am particularly interested in environments where risk, systems and regulatory expectations overlap.",
    signalIds: ["role-lens", "professional-capabilities", "risk-radar", "international-cross-cultural-work"],
    signals: [
      { label: "Role Lens", href: "#role-lens" },
      { label: "Professional Capabilities", href: "#capabilities" },
      { label: "Risk Radar", href: "#risk-radar" },
    ],
  },
  {
    id: "assistant-strongest-profile",
    categories: ["Profile Fit"],
    question: "What is the strongest part of your profile?",
    answer:
      "My strongest point is the combination of audit discipline, banking risk exposure and growing technical orientation. I am not positioned only as an auditor, but as someone developing toward risk, systems and governance-oriented work.",
    signalIds: ["experience", "learning-roadmap", "professional-capabilities"],
    signals: [
      { label: "Experience", href: "#experience" },
      { label: "Learning Roadmap", href: "#credentials" },
      { label: "Professional Capabilities", href: "#capabilities" },
    ],
  },
  {
    id: "assistant-bank-of-china-experience",
    categories: ["Profile Fit"],
    question: "What does your experience at Bank of China add to your profile?",
    answer:
      "My experience at Bank of China – Milan Branch adds an international and cross-border dimension to my profile. It allows me to work on internal audit, risk management, regulatory frameworks and operational resilience within a banking environment where local European supervisory expectations intersect with the governance of a major global Chinese financial institution.\n\nI see this as particularly relevant for the future of finance and technology: global banking is increasingly shaped by cross-border regulatory coordination, data governance, payment infrastructures and the resilience of interconnected financial systems. Working in this setting strengthens my ability to read risk not only as a control issue, but as something embedded in international business models, technology flows and evolving supervisory expectations.",
    signalIds: ["bank-of-china-experience", "banking-risk-regulation", "international-cross-cultural-work"],
    signals: [
      { label: "Experience", href: "#experience" },
      { label: "Banking Risk & Regulation", href: "#capabilities" },
      { label: "International & Cross-Cultural Work", href: "#capabilities" },
    ],
  },
  {
    id: "assistant-future-career-direction",
    categories: ["Profile Fit"],
    question: "Where would you like your career to develop in the future?",
    answer:
      "I would like to continue growing in audit and risk-oriented roles within complex international organizations, ideally where finance, technology and governance intersect. Large global banks are a natural environment for this path, particularly in internal audit, IT audit, technology risk and AI governance.\n\nAt the same time, I am also interested in multinational companies beyond banking—such as technology, life sciences or other highly regulated sectors—where digital systems, operational resilience, data governance and emerging AI-related risks create a broader and evolving audit landscape.\n\nWhat attracts me most is working in environments that combine intellectual complexity, international exposure and continuous learning: roles that allow me to engage with different risk domains, collaborate with colleagues from diverse professional and cultural backgrounds, and ideally travel across locations or business contexts.",
    signalIds: ["technology-risk-resilience", "ai-governance-data-systems", "international-cross-cultural-work"],
    signals: [
      { label: "Technology Risk & Resilience", href: "#capabilities" },
      { label: "AI Governance & Data Systems", href: "#capabilities" },
      { label: "International & Cross-Cultural Work", href: "#capabilities" },
    ],
  },
  {
    id: "assistant-different-from-standard-audit",
    categories: ["Profile Fit"],
    question: "What makes your profile different from a standard internal audit profile?",
    answer:
      "My audit background is combined with an active interest in technology risk, data workflows and AI-related governance. I try to connect control assessment with how systems, data and automation actually shape risk in modern organizations.",
    signalIds: ["technology-data-stream", "ai-model-governance", "ai-audit-workflow"],
    signals: [
      { label: "Technology & Data Stream", href: "#hero" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
    ],
  },
  {
    id: "assistant-business-or-technical",
    categories: ["Profile Fit"],
    question: "Are you more business-oriented or technical?",
    answer:
      "I am currently more risk and business-control oriented, with a growing technical profile. My technical learning is not abstract: I focus on Python, data analysis, local AI workflows and structured extraction in audit and risk use cases.",
    signalIds: ["professional-capabilities", "technology-data-stream", "ai-audit-workflow"],
    signals: [
      { label: "Professional Capabilities", href: "#capabilities" },
      { label: "Technology & Data Stream", href: "#hero" },
      { label: "Project Deck", href: "#projects" },
    ],
  },
  {
    id: "assistant-recruiter-spend-time",
    categories: ["Profile Fit"],
    question: "Why should a recruiter spend time on your profile?",
    answer:
      "Because my profile sits in a space that is becoming increasingly relevant: audit, technology risk, operational resilience, data and AI governance. I bring a control-oriented mindset and I am actively building the technical layer needed to work on these topics.",
    signalIds: ["risk-radar", "experience", "learning-roadmap"],
    signals: [
      { label: "Risk Radar", href: "#risk-radar" },
      { label: "Experience", href: "#experience" },
      { label: "Learning Roadmap", href: "#credentials" },
    ],
  },
  {
    id: "assistant-internal-audit-experience",
    categories: ["Audit & Risk"],
    question: "What is your experience in internal audit?",
    answer:
      "I work in internal audit within an international banking environment, supporting reviews on credit risk, regulatory frameworks, internal controls, AML/KYC processes, operational resilience and audit documentation.",
    signalIds: ["experience", "audit-control-assurance", "control-audit-risk", "international-cross-cultural-work"],
    signals: [
      { label: "Experience", href: "#experience" },
      { label: "Audit & Control Assurance", href: "#capabilities" },
      { label: "Control & Audit Risk", href: "#risk-radar" },
    ],
  },
  {
    id: "assistant-credit-risk-exposure",
    categories: ["Audit & Risk"],
    question: "What is your exposure to credit risk?",
    answer:
      "I have exposure to corporate credit and syndicated loan portfolios, including credit risk drivers, financial covenants, capital structure exposure and IFRS 9 ECL concepts such as PD, LGD and provisioning impacts.",
    signalIds: ["banking-risk-regulation", "credit-risk", "experience"],
    signals: [
      { label: "Banking Risk & Regulation", href: "#capabilities" },
      { label: "Credit Risk", href: "#risk-radar" },
      { label: "Experience", href: "#experience" },
    ],
  },
  {
    id: "assistant-banking-regulation-exposure",
    categories: ["Audit & Risk"],
    question: "What is your exposure to banking regulation?",
    answer:
      "I have worked around banking supervisory frameworks such as RAF, ICAAP, ILAAP, Pillar III, IFRS 9/ECL, AML/KYC and regulatory expectations from ECB and Bank of Italy perspectives.",
    signalIds: ["banking-risk-regulation", "regulatory-compliance-risk", "risk-regulatory-stream"],
    signals: [
      { label: "Banking Risk & Regulation", href: "#capabilities" },
      { label: "Regulatory & Compliance Risk", href: "#risk-radar" },
      { label: "Risk & Regulatory Stream", href: "#hero" },
    ],
  },
  {
    id: "assistant-operational-resilience-dora",
    categories: ["Audit & Risk"],
    question: "What is your exposure to operational resilience and DORA?",
    answer:
      "My exposure includes IT systems, access controls, business continuity processes, system reliability and DORA-related risk areas. I see operational resilience as a bridge between technology, governance and internal control.",
    signalIds: ["technology-risk-resilience", "operational-resilience", "experience"],
    signals: [
      { label: "Technology Risk & Resilience", href: "#capabilities" },
      { label: "Operational Resilience", href: "#risk-radar" },
      { label: "Experience", href: "#experience" },
    ],
  },
  {
    id: "assistant-control-areas",
    categories: ["Audit & Risk"],
    question: "What control areas have you worked on?",
    answer:
      "I have worked around internal controls, governance structures, audit documentation, working papers, AML/KYC control design, credit risk controls and regulatory compliance-related processes.",
    signalIds: ["audit-control-assurance", "control-audit-risk", "experience"],
    signals: [
      { label: "Audit & Control Assurance", href: "#capabilities" },
      { label: "Control & Audit Risk", href: "#risk-radar" },
      { label: "Experience", href: "#experience" },
    ],
  },
  {
    id: "assistant-technology-risk-experience",
    categories: ["Technology & AI"],
    question: "What is your experience in technology risk?",
    answer:
      "My technology risk profile is developing around IT systems exposure, access controls, operational resilience and DORA-related control areas. My internal audit experience gives me a control-oriented perspective, while my CISA roadmap strengthens the information systems governance angle.",
    signalIds: ["technology-risk-resilience", "technology-ict-risk", "cisa-candidate"],
    signals: [
      { label: "Technology Risk & Resilience", href: "#capabilities" },
      { label: "Technology & ICT Risk", href: "#risk-radar" },
      { label: "CISA Candidate", href: "#credentials" },
    ],
  },
  {
    id: "assistant-ai-governance-exposure",
    categories: ["Technology & AI"],
    question: "What is your exposure to AI governance?",
    answer:
      "My focus on AI governance is emerging. I am interested in AI-related risks, audit traceability, model governance, explainability and the controlled use of local LLM workflows—both in audit contexts and in agentic systems where outputs, tool use and code changes must remain inspectable and reversible.",
    signalIds: ["ai-governance-data-systems", "ai-model-governance", "codeiak"],
    signals: [
      { label: "AI Governance & Data Systems", href: "#capabilities" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "CodeIAK — Local AI Coding Agent", href: "#projects" },
    ],
  },
  {
    id: "assistant-ai-projects-built",
    categories: ["Technology & AI"],
    question: "What AI-related projects have you built?",
    answer:
      "I am building two complementary local-AI projects. The AI-Assisted Audit Workflow applies local LLM/VLM models, structured extraction and audit traceability to audit documentation. CodeIAK is a local-first AI coding agent with multi-model orchestration, structured agentic workflows, reviewable and reversible code changes, and live execution transparency for offline inspection and validation of software projects. Together they reflect the same control-oriented mindset: useful automation with evidence, reversibility and transparency.",
    signalIds: ["ai-audit-workflow", "codeiak", "ai-model-governance"],
    signals: [
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
      { label: "CodeIAK — Local AI Coding Agent", href: "#projects" },
      { label: "AI & Model Governance", href: "#risk-radar" },
    ],
  },
  {
    id: "assistant-python-data-analysis",
    categories: ["Technology & AI"],
    question: "How do you use Python and data analysis?",
    answer:
      "I use Python and pandas mainly for data analysis, automation and risk-oriented workflows. My aim is not generic coding, but applying technical tools to audit evidence, structured extraction and control-oriented analysis.",
    signalIds: ["technology-data-stream", "audit-analytics-lens", "ai-audit-workflow"],
    signals: [
      { label: "Technology & Data Stream", href: "#hero" },
      { label: "Audit Analytics lens", href: "#role-lens" },
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
    ],
  },
  {
    id: "assistant-audit-traceability",
    categories: ["Technology & AI"],
    question: "What do you mean by audit traceability?",
    answer:
      "By audit traceability I mean the ability to link findings, supporting evidence, recommendations and regulatory references in a clear and verifiable way. In audit, an answer is only useful if its evidence path can be reconstructed.",
    signalIds: ["ai-audit-workflow", "ai-model-governance", "technology-data-stream"],
    signals: [
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "Technology & Data Stream", href: "#hero" },
    ],
  },
  {
    id: "assistant-tools-technologies",
    categories: ["Technology & AI"],
    question: "What tools and technologies do you use?",
    answer:
      "I work with Python, pandas, SQL, Advanced Excel, SAP, HFM/Oracle, GitHub and AI-oriented workflows involving local LLMs, RAG concepts, multi-model orchestration, structured data extraction, audit traceability and AI agents.",
    signalIds: ["technology-data-stream", "ai-audit-workflow", "codeiak"],
    signals: [
      { label: "Technology & Data Stream", href: "#hero" },
      { label: "CodeIAK — Local AI Coding Agent", href: "#projects" },
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
    ],
  },
  {
    id: "assistant-ai-audit-workflow-project",
    categories: ["Projects & Learning"],
    question: "What is the AI-Assisted Audit Workflow project?",
    answer:
      "I am building it as a personal project to support the preparation and analysis of audit documentation. The goal is to extract findings, recommendations, evidence and regulatory references while maintaining traceability between documents and outputs.",
    signalIds: ["ai-audit-workflow", "ai-model-governance", "audit-traceability"],
    signals: [
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "Audit Traceability", href: "#hero" },
    ],
  },
  {
    id: "assistant-codeiak-project",
    categories: ["Projects & Learning"],
    question: "What is CodeIAK?",
    answer:
      "CodeIAK is my ongoing personal project to build a local-first AI coding agent. It integrates multi-model orchestration, structured agentic workflows, reviewable and reversible code changes, and live execution transparency so users can inspect, modify and validate software projects offline—with an offline-first, control-oriented design rather than opaque automation.",
    signalIds: ["codeiak", "ai-model-governance", "technology-ict-risk"],
    signals: [
      { label: "CodeIAK — Local AI Coding Agent", href: "#projects" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "Technology & ICT Risk", href: "#risk-radar" },
    ],
  },
  {
    id: "assistant-cisa-preparation",
    categories: ["Projects & Learning"],
    question: "Why are you preparing for CISA?",
    answer:
      "I am preparing for CISA because I want to strengthen my credibility in information systems audit, IT governance, control assurance and technology risk. It fits naturally with my transition from internal audit toward IT and technology risk.",
    signalIds: ["cisa-candidate", "technology-risk-resilience", "technology-ict-risk"],
    signals: [
      { label: "CISA Candidate", href: "#credentials" },
      { label: "Technology Risk & Resilience", href: "#capabilities" },
      { label: "Technology & ICT Risk", href: "#risk-radar" },
    ],
  },
  {
    id: "assistant-frm-planning",
    categories: ["Projects & Learning"],
    question: "Why are you planning the FRM?",
    answer:
      "I am planning the FRM to strengthen my understanding of financial risk management, especially credit risk, market risk and quantitative risk foundations. It complements my banking audit exposure and supports a broader risk profile.",
    signalIds: ["frm-certification", "credit-risk", "banking-risk-regulation"],
    signals: [
      { label: "FRM Certification", href: "#credentials" },
      { label: "Credit Risk", href: "#risk-radar" },
      { label: "Banking Risk & Regulation", href: "#capabilities" },
    ],
  },
  {
    id: "assistant-languages",
    categories: ["Projects & Learning"],
    question: "What languages do you speak?",
    answer:
      "I speak Italian as my native language, English at C2 level, French at B1 level and Mandarin Chinese at B1 level. My academic background in languages supports my ability to work in international and multicultural environments.",
    signalIds: ["hero-languages", "education", "chinese-language-track", "international-cross-cultural-work"],
    signals: [
      { label: "Hero Languages", href: "#hero" },
      { label: "Education", href: "#education" },
      { label: "Learning Roadmap", href: "#credentials" },
    ],
  },
  {
    id: "assistant-limited-seniority",
    categories: ["Recruiter Concerns"],
    question: "Why should we consider you if you do not have high seniority yet?",
    answer:
      "I do not position myself as a senior specialist. My value lies in the combination of audit discipline, banking risk exposure, regulatory awareness and a growing technical profile. I can contribute to structured analysis, documentation quality, control assessment and technology-oriented risk work while developing quickly.",
    signalIds: ["experience", "professional-capabilities", "learning-roadmap"],
    signals: [
      { label: "Experience", href: "#experience" },
      { label: "Professional Capabilities", href: "#capabilities" },
      { label: "Learning Roadmap", href: "#credentials" },
    ],
  },
  {
    id: "assistant-too-junior-tech-ai",
    categories: ["Recruiter Concerns"],
    question: "Are you too junior for technology risk or AI governance roles?",
    answer:
      "I am not presenting myself as a senior AI governance or technology risk expert. I am building toward those areas from an audit, control and risk perspective. I am suitable for roles where analytical discipline, regulatory awareness and willingness to grow are important.",
    signalIds: ["technology-risk-resilience", "ai-model-governance", "cisa-candidate"],
    signals: [
      { label: "Technology Risk & Resilience", href: "#capabilities" },
      { label: "AI & Model Governance", href: "#risk-radar" },
      { label: "CISA Candidate", href: "#credentials" },
    ],
  },
  {
    id: "assistant-profile-too-broad",
    categories: ["Recruiter Concerns"],
    question: "Is your profile too broad?",
    answer:
      "My profile is broad, but not random. The common thread is control over complex systems: banking risk, internal audit, technology dependencies, data workflows and emerging AI risks. The breadth becomes useful where regulation, risk and technology increasingly overlap.",
    signalIds: ["risk-radar", "role-lens", "professional-capabilities"],
    signals: [
      { label: "Risk Radar", href: "#risk-radar" },
      { label: "Role Lens", href: "#role-lens" },
      { label: "Professional Capabilities", href: "#capabilities" },
    ],
  },
  {
    id: "assistant-hands-on-technical-skills",
    categories: ["Recruiter Concerns"],
    question: "Do you have hands-on technical skills or only theoretical interest?",
    answer:
      "My technical profile is developing through practical work with Python, pandas, local AI workflows, structured extraction and hands-on builds such as the AI-Assisted Audit Workflow and CodeIAK. It is not purely theoretical, but it is still growing and grounded in audit, risk and governance-oriented use cases.",
    signalIds: ["technology-data-stream", "ai-audit-workflow", "codeiak"],
    signals: [
      { label: "Technology & Data Stream", href: "#hero" },
      { label: "AI-Assisted Audit Workflow", href: "#projects" },
      { label: "CodeIAK — Local AI Coding Agent", href: "#projects" },
    ],
  },
];

const assistantCategories = [
  "Profile Fit",
  "Audit & Risk",
  "Technology & AI",
  "Projects & Learning",
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
  if (prompt.signalIds?.length) {
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

  return prompt.signals.map((signal) => ({ ...signal, id: signal.label }));
}

function getSignalTargetElement(signal) {
  const targetIds = [
    ...(signal.capabilities ?? []),
    ...(signal.credentials ?? []),
    ...(signal.experiences ?? []),
    ...(signal.projects ?? []),
    ...(signal.radar ?? []),
    ...(signal.education ?? []),
  ];

  for (const targetId of targetIds) {
    const target = document.querySelector(`[data-role-lens-id="${targetId}"]`);
    if (target) return target;
  }

  if (signal.href?.startsWith("#")) {
    return document.getElementById(signal.href.slice(1));
  }

  return null;
}

function highlightSignalTarget(target) {
  target.classList.add("assistant-signal-target");
  window.setTimeout(() => {
    target.classList.remove("assistant-signal-target");
  }, 1800);
}

async function copyCurrentPageUrl() {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(window.location.href);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = window.location.href;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
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

  return (
    <div
      className="flex items-center gap-2 text-xs text-slate-400"
      aria-label={`Development stage: ${stage}`}
      title={`Development stage: ${stage}`}
    >
      <span className="font-medium text-slate-500">Development stage</span>
      <span className="text-slate-700">·</span>
      <span className="font-medium text-cyan-100/80">{stage}</span>
      <div className="ml-1 flex items-center gap-1.5" aria-hidden="true">
        {projectStages.map((item, index) => {
          const isCurrent = index === stageIndex;
          const isReached = index <= stageIndex;
          return (
            <span
              key={item}
              className={`h-1.5 w-5 rounded-full ${
                isCurrent
                  ? "bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,0.28)]"
                  : isReached
                    ? "bg-cyan-400/45"
                    : "bg-slate-700/70"
              }`}
            />
          );
        })}
      </div>
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

    if (signal.missing || !signal.href) {
      console.warn("Missing Portfolio Assistant signal mapping:", signal.id);
      return;
    }

    const target = getSignalTargetElement(signal);
    if (!target) {
      console.warn("Missing Portfolio Assistant signal target:", signal.id, signal.href);
      return;
    }

    setIsDrawerOpen(false);
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightSignalTarget(target);
    }, 160);
  };

  return (
    <>
      <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-800 pb-4">
          <img
            src={publicAsset("profile.png")}
            alt="Lorenzo Natali"
            className="h-11 w-11 rounded-full border border-cyan-400/30 object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-slate-50">Portfolio Assistant</p>
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Guided answers on my background, projects and professional direction.
        </p>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">Example questions</p>
          <div className="mt-2 min-h-[3rem] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={previewQuestion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="text-xs leading-5 text-slate-300"
              >
                {previewQuestion}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAssistant()}
          className="mt-5 w-full rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-cyan-300/90">{project.status}</p>
              <ProjectStageIndicator stage={project.stage} />
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">{project.title}</h3>
            <p className="mt-5 max-w-3xl leading-7 text-slate-300">{project.text}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span key={tech} className="rounded-md border border-slate-700/70 bg-slate-950/45 px-3 py-1.5 text-xs text-slate-300">
                  {tech}
                </span>
              ))}
            </div>

            {isCodeiakProject && (
              <div className="codeiak-project-mascot">
                <CodeiakMascotVideo size={336} />
              </div>
            )}

            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
    <section id="role-lens" className="border-t border-slate-800/70 bg-slate-950/95 px-5 py-2 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="sticky top-0 z-30 overflow-hidden bg-slate-950/90 py-3 backdrop-blur">
          <div className="relative flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80" aria-label="Role Lens">
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
                <p className="mt-0.5 text-xs font-medium text-slate-400 sm:text-sm">
                  Select a lens to highlight relevant sections across the portfolio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {lensOptions.map((item) => {
                const isActive = item.name === selectedLens;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onSelectLens(item.name)}
                    className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
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
                  className="role-lens-reset-active self-center text-xs font-medium text-cyan-100/80 underline decoration-cyan-300/20 underline-offset-4 transition hover:text-cyan-50 hover:decoration-cyan-200/50"
                >
                  Reset lens
                </button>
              ) : (
                <span className="self-center text-xs text-slate-600">No lens selected</span>
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

function ProfileRadarChart({ selectedDomainId, onSelectDomain }) {
  const centerX = 80;
  const centerY = 72;
  const maxRadius = 28;
  const labelRadius = 45;
  const labelLinesByDomain = {
    "radar-control-audit-risk": ["Control & Audit", "Risk"],
    "radar-credit-risk": ["Credit Risk"],
    "radar-regulatory-compliance-risk": ["Regulatory &", "Compliance Risk"],
    "radar-technology-ict-risk": ["Technology & ICT", "Risk"],
    "radar-operational-resilience": ["Operational", "Resilience"],
    "radar-ai-model-governance": ["AI & Model", "Governance"],
  };
  const angleFor = (index) => (-90 + index * (360 / profileRadarAxes.length)) * (Math.PI / 180);
  const pointFor = (index, radius) => {
    const angle = angleFor(index);
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };
  const currentPolygonPoints = profileRadarAxes
    .map((axis, index) => {
      const point = pointFor(index, (axis.value / 100) * maxRadius);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const targetPolygonPoints = profileRadarAxes
    .map((axis, index) => {
      const point = pointFor(index, (axis.targetValue / 100) * maxRadius);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center justify-center overflow-visible rounded-2xl border border-slate-800/80 bg-slate-950/45 px-2 py-4 sm:px-4">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_52%)]" />
      <div className="relative z-10 mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
          Current coverage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-violet-300/70" />
          Target direction
        </span>
      </div>
      <svg className="relative z-10 aspect-[160/130] w-full max-w-[560px] overflow-visible" viewBox="0 0 160 130" role="img" aria-label="Indicative profile coverage chart">
        {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
          <polygon
            key={level}
            points={profileRadarAxes
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
        {profileRadarAxes.map((axis, index) => {
          const outer = pointFor(index, maxRadius);
          const domain = radarDomains.find((item) => item.id === axis.domainId);
          const isActive = selectedDomainId === axis.domainId;
          const label = pointFor(index, labelRadius);
          const labelAnchor = label.x > centerX + 8 ? "start" : label.x < centerX - 8 ? "end" : "middle";
          const labelLines = labelLinesByDomain[axis.domainId] ?? [domain?.title];
          return (
            <g
              key={axis.domainId}
              role="button"
              tabIndex="0"
              className="cursor-pointer outline-none"
              onClick={() => onSelectDomain(axis.domainId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDomain(axis.domainId);
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
                className={`${isActive ? "fill-cyan-100" : "fill-slate-300"} text-[3.75px] font-medium`}
              >
                {labelLines.map((line, lineIndex) => (
                  <tspan key={line} x={label.x} dy={lineIndex === 0 ? 0 : 4.2}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        <polygon
          points={targetPolygonPoints}
          fill="rgba(167,139,250,0.035)"
          stroke="rgba(167,139,250,0.52)"
          strokeWidth="0.55"
          strokeDasharray="2 2"
        />
        <polygon
          points={currentPolygonPoints}
          fill="rgba(34,211,238,0.16)"
          stroke="rgba(103,232,249,0.78)"
          strokeWidth="0.65"
        />
        {profileRadarAxes.map((axis, index) => {
          const point = pointFor(index, (axis.value / 100) * maxRadius);
          const isActive = selectedDomainId === axis.domainId;
          return (
            <circle
              key={axis.domainId}
              cx={point.x}
              cy={point.y}
              r={isActive ? "1.45" : "1.05"}
              fill={isActive ? "rgba(224,251,255,0.98)" : "rgba(165,243,252,0.94)"}
              className="cursor-pointer drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]"
              onClick={() => onSelectDomain(axis.domainId)}
            />
          );
        })}
      </svg>
      <p className="relative z-10 mt-6 max-w-md text-center text-xs leading-5 text-slate-400">
        Current coverage and target direction across the same risk domains.
      </p>
    </div>
  );
}

function RiskRadar({ selectedLens = "Overview" }) {
  const [activeDomain, setActiveDomain] = useState(0);
  const [mapView, setMapView] = useState("risk-map");
  const selectedDomain = radarDomains[activeDomain];
  const selectedTone = getRadarTone(selectedDomain.maturity);
  const selectDomainById = (domainId) => {
    const nextIndex = radarDomains.findIndex((domain) => domain.id === domainId);
    if (nextIndex >= 0) setActiveDomain(nextIndex);
  };

  return (
    <section id="risk-radar" className="border-t border-slate-800/70 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Risk & Competence Map</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight !text-slate-50 sm:text-3xl">
            Professional Risk Map
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            Explore the risk and governance domains where my profile is developing.
          </p>
          {mapView === "risk-map" ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-[0.2em] text-slate-400">Domain status:</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                <span><span className="text-cyan-200/80">Primary</span> · stronger current exposure</span>
                <span><span className="text-violet-200/80">Developing</span> · active competence-building</span>
                <span><span className="text-amber-200/80">Emerging</span> · forward-looking focus</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-500">
              Indicative view of my current coverage across the same risk domains.
            </p>
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
                  <div className="absolute inset-[8%] rounded-full border border-slate-700/35" />
                  <div className="absolute inset-[21%] rounded-full border border-slate-800/75" />
                  <div className="absolute inset-[34%] rounded-full border border-slate-800/60" />
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    {radarDomains.map((domain) => (
                      <line
                        key={domain.title}
                        x1="50"
                        y1="50"
                        x2={domain.x}
                        y2={domain.y}
                        stroke="rgba(148, 163, 184, 0.12)"
                        strokeWidth="0.25"
                      />
                    ))}
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
                          className={`max-w-[92px] rounded-md bg-slate-950/55 px-1.5 py-0.5 text-[10px] font-medium leading-4 transition sm:max-w-[130px] sm:text-xs ${
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
                  <ProfileRadarChart selectedDomainId={selectedDomain.id} onSelectDomain={selectDomainById} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <SurfaceCard className="min-h-[380px] p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDomain.title}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Expertise Areas</p>
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
            </AnimatePresence>
          </SurfaceCard>
        </div>

        <div className="mt-14 border-t border-slate-800 pt-7 text-sm leading-6 text-slate-500">
          <p className="font-medium text-slate-400">Lorenzo Natali</p>
          <p className="mt-2">
            Designed as a static professional portfolio at the intersection of audit, risk, data and technology.
          </p>
          <p className="mt-1">
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

function App() {
  const [selectedLens, setSelectedLens] = useState("Overview");
  const [expandedExperiences, setExpandedExperiences] = useState({});

  const toggleExperienceDetails = (experienceId) => {
    setExpandedExperiences((current) => ({
      ...current,
      [experienceId]: !current[experienceId],
    }));
  };

  const handleSharePortfolio = async () => {
    const shareData = {
      title: "Lorenzo Natali — Risk, Audit & Technology Portfolio",
      text: "Professional portfolio at the intersection of audit, risk, data and technology.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyCurrentPageUrl();
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <section id="hero" className="relative overflow-hidden bg-slate-950 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
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
              Internal Audit | Technology Risk | AI Governance
            </motion.h2>

            <div className="h-12" aria-hidden="true" />

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="max-w-3xl space-y-4 text-base leading-8 text-slate-300 sm:text-lg"
            >
              <p>
                I work across internal audit, banking risk and technology governance, focusing on control effectiveness,
                operational resilience, regulatory frameworks and emerging AI-related risks.
              </p>
              <p>
                This interactive portfolio maps my experience, projects, skills and professional direction across audit,
                risk, data and technology.
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
              <div className="group/share relative flex items-center sm:items-center">
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  aria-label="Share portfolio"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-950/45 text-cyan-100/80 shadow-lg shadow-cyan-950/10 transition hover:border-cyan-300/45 hover:bg-cyan-950/25 hover:text-cyan-50 hover:shadow-cyan-950/25 focus:outline-none focus:ring-2 focus:ring-cyan-300/35"
                >
                  <Share2 className="h-4.5 w-4.5 shrink-0" />
                </button>
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-800 bg-slate-950/95 px-2 py-1 text-[11px] font-medium text-slate-300 opacity-0 shadow-lg shadow-slate-950/40 transition group-hover/share:opacity-100 group-focus-within/share:opacity-100">
                  Share portfolio
                </span>
              </div>
            </div>
          </div>

          <PortfolioAssistant />
        </div>
      </section>

      <RoleLens selectedLens={selectedLens} onSelectLens={setSelectedLens} />

      <Section id="capabilities" eyebrow="Capability Map" title="Professional Capabilities">
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

      <Section id="credentials" eyebrow="Certifications & Roadmap" title="Ongoing & Planned Certifications" className="bg-slate-950/80">
        <div className="grid gap-4 lg:grid-cols-3">
          {credentials.map((credential) => (
            <SurfaceCard
              data-role-lens-id={credential.id}
              key={credential.title}
              className={`p-5 ${lensSurfaceClass(selectedLens, "credentials", credential.id)}`}
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
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/25 p-4 text-sm shadow-lg shadow-slate-950/10 backdrop-blur">
              <h3 className="font-medium leading-6 text-slate-300">{additionalTraining.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-cyan-200/55">{additionalTraining.subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">{additionalTraining.description}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="experience" eyebrow="Professional Track" title="Experience" className="bg-slate-950/80">
        <div className="relative max-w-5xl">
          <div className="absolute bottom-0 left-3 top-2 w-px bg-slate-800 sm:left-4" />
          <div className="space-y-6">
            {experiences.map((exp) => {
              const isExpanded = Boolean(expandedExperiences[exp.id]);

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
                          <li className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">
                            Summary
                          </li>
                          {exp.points.map((point) => (
                            <li key={point} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>

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
                  </SurfaceCard>
                </motion.article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section id="projects" eyebrow="Projects & Applied Work" title="Projects & Applied Work">
        <ProjectDeck selectedLens={selectedLens} />
      </Section>

      <Section id="education" eyebrow="Academic Foundation" title="Education" className="bg-slate-950/80">
        <div className="grid gap-5 lg:grid-cols-3">
          {education.map((item) => (
            <SurfaceCard key={item.degree} data-role-lens-id={item.id} className="p-5">
              <GraduationCap className="mb-4 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium text-slate-400">{item.period}</p>
              <h3 className="mt-3 text-base font-semibold leading-6 text-slate-50">{item.degree}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.school}</p>
              <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-400">{item.detail}</p>
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <RiskRadar selectedLens={selectedLens} />
    </main>
  );
}

export default App;
