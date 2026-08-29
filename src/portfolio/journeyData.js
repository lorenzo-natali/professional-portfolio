/**
 * Journey milestones for Professional Snapshot.
 * Order: newest first (index 0) → oldest last.
 * month: 1–12, or null when only a year is known (never invent a month).
 */

import {
  additionalTraining,
  credentials,
  education,
  experiences,
  expertise,
  radarDomains,
} from "./portfolioData.js";

const MONTH_LABELS = [
  null,
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const MONTH_NAMES = [
  null,
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function sectionsForType(type) {
  switch (type) {
    case "Professional":
    case "Experience":
    case "Volunteering":
    case "Network":
      return ["Experience"];
    case "Education":
    case "Training":
      return ["Education"];
    case "Certification":
      return ["Credentials"];
    default:
      return ["Experience"];
  }
}

function entry({
  id,
  year,
  startYear = null,
  endYear = null,
  month = null,
  title,
  subtitle = null,
  type,
  explanation = null,
  highlights = [],
  sections,
  // Display-only narrative panel fields (not taxonomy / not Role Lens keys).
  stage = null,
  narrativeHeading = null,
  narrativeBody = null,
  narrativeContext = null,
  narrativeDetail = null,
  // Optional connected-evidence links: { label, section } where section is a sectionAnchors key.
  connectedEvidence = null,
}) {
  const start = startYear ?? year;
  const end = endYear ?? start;
  const isMultiYear = end > start;
  return {
    id,
    year: start,
    startYear: start,
    endYear: end,
    month: isMultiYear ? null : month,
    monthLabel: isMultiYear || month == null ? null : MONTH_LABELS[month],
    title,
    subtitle,
    type,
    explanation,
    highlights,
    sections: sections ?? sectionsForType(type),
    stage,
    narrativeHeading,
    narrativeBody,
    narrativeContext,
    narrativeDetail,
    connectedEvidence,
  };
}

function connectedEvidenceFromTraining(trainingId, section = "Credentials") {
  const item = additionalTraining.items.find((entry) => entry.id === trainingId);
  if (!item) return null;
  return {
    label: item.title,
    section,
    entityId: item.id,
  };
}

function connectedEvidenceFromCredential(credentialId) {
  const item = credentials.find((entry) => entry.id === credentialId);
  if (!item) return null;
  return {
    label: item.title,
    section: "Credentials",
    entityId: item.id,
  };
}

function connectedEvidenceFromExperience(experienceId) {
  const item = experiences.find((entry) => entry.id === experienceId);
  if (!item) return null;
  return {
    label: item.company,
    section: "Experience",
    entityId: item.id,
  };
}

function connectedEvidenceFromEducation(educationId, label) {
  const item = education.find((entry) => entry.id === educationId);
  if (!item) return null;
  return {
    label: label ?? item.degree,
    section: "Education",
    entityId: item.id,
  };
}

function connectedEvidenceFromCapability(capabilityId) {
  const item = expertise.find((entry) => entry.id === capabilityId);
  if (!item) return null;
  return {
    label: item.title,
    section: "Expertise",
    entityId: item.id,
  };
}

function connectedEvidenceFromRadar(radarId, label) {
  const item = radarDomains.find((entry) => entry.id === radarId);
  if (!item) return null;
  return {
    // Prefix keeps radar evidence distinct from same-titled capability cards.
    label: label ?? `Risk Radar: ${item.title}`,
    section: "Risk Radar",
    entityId: item.id,
  };
}

/** Newest → oldest */
export const journeyMilestones = [
  entry({
    id: "journey-banca-profilo",
    year: 2026,
    month: 9,
    title: "Banca Profilo",
    subtitle: "IT Audit Specialist",
    type: "Professional",
    connectedEvidence: [
      connectedEvidenceFromExperience("experience-banca-profilo"),
      // IT Audit + Technology Risk lenses map experience-banca-profilo to these
      // canonical targets. AI Governance lens has no banca-profilo experience — omit.
      connectedEvidenceFromCapability("capability-audit-control"),
      connectedEvidenceFromCapability("capability-technology-risk"),
      connectedEvidenceFromRadar("radar-control-audit-risk"),
      connectedEvidenceFromRadar("radar-technology-ict-risk"),
    ].filter(Boolean),
    // Display-only narrative panel (SPECIALIZATION is not a Journey type / taxonomy key).
    stage: "SPECIALIZATION",
    narrativeHeading: "From Internal Audit to Technology Risk",
    narrativeBody:
      "After gaining broad Internal Audit exposure in banking, I chose to specialize in IT Audit, combining my experience in risk and controls with a longstanding interest in technology and AI. I joined Banca Profilo attracted by the challenge of its 2026–2028 focus on Digital Excellence and by the technology-driven environment created by the Bank's fintech ecosystem.",
  }),
  entry({
    id: "journey-cisa",
    year: 2026,
    month: null,
    title: "Started CISA Preparation",
    subtitle: "ISACA · Exam planned 2026",
    type: "Certification",
    connectedEvidence: [
      // credential-cisa is explicitly "CISA — In Progress" / exam planned end 2026.
      connectedEvidenceFromCredential("credential-cisa"),
    ].filter(Boolean),
    // Display-only narrative panel (PROFESSIONAL DEVELOPMENT is not a Journey type / taxonomy key).
    stage: "PROFESSIONAL DEVELOPMENT",
    narrativeHeading: "Building Technology Audit Expertise",
    narrativeBody:
      "Began preparing for the CISA certification to deepen expertise in information systems audit, governance, controls and technology risk.",
  }),
  entry({
    id: "journey-postgrad-complete",
    year: 2026,
    month: 1,
    title: "Completed Postgraduate Master's in Auditing, Accounting & Sustainability Reporting",
    subtitle:
      "ALTIS · Università Cattolica del Sacro Cuore — Milan · In partnership with EY · 26/30 (A−)",
    type: "Education",
    connectedEvidence: [
      connectedEvidenceFromEducation(
        "education-altis-ey",
        "Auditing, Accounting & Sustainability Reporting"
      ),
    ].filter(Boolean),
    // Display-only narrative panel (ACADEMIC MILESTONE is not a Journey type / taxonomy key).
    stage: "ACADEMIC MILESTONE",
    narrativeHeading: "Applied Finance, Audit & Controls",
    narrativeBody:
      "Completed the postgraduate programme with 26/30 (A−), consolidating applied knowledge across accounting, auditing, financial reporting, internal controls and sustainability reporting.",
  }),
  entry({
    id: "journey-boc",
    year: 2025,
    month: 10,
    title: "Bank of China — Milan Branch",
    subtitle: "Internal Auditor Staff",
    type: "Professional",
    connectedEvidence: [
      connectedEvidenceFromExperience("experience-boc"),
      // Existing Banking Risk / IT Audit canonical targets already linked to experience-boc
      // in lensRelevance — no Technology Risk / AI Governance signals here.
      connectedEvidenceFromCapability("capability-audit-control"),
      connectedEvidenceFromCapability("capability-banking-risk"),
      connectedEvidenceFromRadar("radar-control-audit-risk"),
      connectedEvidenceFromRadar("radar-credit-risk"),
    ].filter(Boolean),
    // Display-only narrative panel (CAREER PIVOT is not a Journey type / taxonomy key).
    stage: "CAREER PIVOT",
    narrativeHeading: "Into Banking Risk & Internal Audit",
    narrativeBody:
      "Moved into Internal Audit within the Milan Branch of a global banking group, shifting my professional focus toward risk, controls and banking governance while building experience in a strongly international environment.",
  }),
  entry({
    id: "journey-prelios",
    year: 2025,
    month: 5,
    title: "Prelios Credit Servicing",
    subtitle: "Accounting & Administration Intern · NPL/UTP Portfolios · Milan",
    type: "Professional",
    connectedEvidence: [
      connectedEvidenceFromExperience("experience-prelios"),
      // Banking Risk lens already maps experience-prelios → capability-banking-risk / radar-credit-risk.
      connectedEvidenceFromCapability("capability-banking-risk"),
      connectedEvidenceFromRadar("radar-credit-risk"),
    ].filter(Boolean),
    // Display-only narrative panel (APPLIED EXPERIENCE is not a Journey type / taxonomy key).
    stage: "APPLIED EXPERIENCE",
    narrativeHeading: "From Accounting to Credit & Financial Risk",
    narrativeBody:
      "Applied accounting and financial reporting in the management of distressed credit portfolios, gaining direct exposure to NPL/UTP assets and developing a stronger interest in credit and financial risk.",
  }),
  entry({
    id: "journey-postgrad-start",
    year: 2025,
    month: 1,
    title:
      "Started Postgraduate Master's in Auditing, Accounting & Sustainability Reporting",
    subtitle: "ALTIS · Università Cattolica del Sacro Cuore — Milan · In partnership with EY",
    type: "Education",
    connectedEvidence: [
      connectedEvidenceFromEducation(
        "education-altis-ey",
        "Auditing, Accounting & Sustainability Reporting"
      ),
    ].filter(Boolean),
    // Display-only narrative panel (PROFESSIONAL PIVOT is not a Journey type / taxonomy key).
    stage: "PROFESSIONAL PIVOT",
    narrativeHeading: "From Economic Analysis to Accounting & Assurance",
    narrativeBody:
      "Building on earlier studies in banking and international finance, I pursued applied training in accounting, auditing and financial reporting to develop a more practical understanding of corporate financial processes and controls.",
  }),
  entry({
    id: "journey-masters-complete",
    year: 2023,
    month: 12,
    title: "Master's Degree in International Cooperation for Development",
    subtitle: "Università Cattolica del Sacro Cuore — Milan · 105/110",
    type: "Education",
    connectedEvidence: [
      connectedEvidenceFromEducation(
        "education-international-cooperation",
        "International Cooperation for Development"
      ),
    ].filter(Boolean),
    // Display-only narrative panel (ACADEMIC MILESTONE is not a Journey type / taxonomy key).
    stage: "ACADEMIC MILESTONE",
    narrativeHeading: "Economics, Policy & Impact",
    narrativeBody:
      "Completed the Master's Degree with 105/110, consolidating an interdisciplinary perspective across development economics, macroeconomic analysis, public policy, impact evaluation and Theory of Change.",
  }),
  entry({
    id: "journey-hsk3",
    year: 2023,
    month: 10,
    title: "Chinese HSK3 Preparation Programme",
    subtitle: "Confucius Institute · Università Cattolica del Sacro Cuore — Milan",
    type: "Training",
    // Training evidence lives under Credentials; override default Training→Education.
    sections: ["Credentials"],
    connectedEvidence: [
      connectedEvidenceFromTraining("additional-training-chinese-language"),
    ].filter(Boolean),
    // Display-only narrative panel (LANGUAGE DEVELOPMENT is not a Journey type / taxonomy key).
    stage: "LANGUAGE DEVELOPMENT",
    narrativeHeading: "Strengthening Chinese Proficiency",
    narrativeBody:
      "Completed an HSK3 preparation programme at the Confucius Institute to further develop Chinese language proficiency alongside my international academic background.",
  }),
  entry({
    id: "journey-icd-masters",
    year: 2021,
    month: 9,
    title: "Started Master's in International Cooperation for Development",
    subtitle: "Università Cattolica del Sacro Cuore — Milan",
    type: "Education",
    connectedEvidence: [
      connectedEvidenceFromEducation(
        "education-international-cooperation",
        "International Cooperation for Development"
      ),
    ].filter(Boolean),
    // Display-only narrative panel (NEW DIRECTION is not a Journey type / taxonomy key).
    stage: "NEW DIRECTION",
    narrativeHeading: "Economics, Policy & Development",
    narrativeBody:
      "Chose to pursue a Master's degree in International Cooperation for Development, drawn by development economics and its intersection with social and policy dimensions, alongside a broader interest in macroeconomics, impact evaluation and Theory of Change.",
  }),
  entry({
    id: "journey-bachelors",
    year: 2021,
    month: 7,
    title: "Bachelor's Degree in Languages for International Relations",
    subtitle: "Università Cattolica del Sacro Cuore — Milan · 100/110",
    type: "Education",
    connectedEvidence: [
      connectedEvidenceFromEducation(
        "education-languages",
        "Languages for International Relations"
      ),
    ].filter(Boolean),
    // Display-only narrative panel (ACADEMIC MILESTONE is not a Journey type / taxonomy key).
    stage: "ACADEMIC MILESTONE",
    narrativeHeading: "International & Cross-Cultural Foundation",
    narrativeBody:
      "Completed a Bachelor's Degree in Languages for International Relations, with English and Chinese, graduating with 100/110 and consolidating an international and cross-cultural academic background.",
  }),
  entry({
    id: "journey-toplife",
    year: 2020,
    month: 7,
    title: "TopLife Concierge",
    subtitle: "Front Office & CRM · Part-time alongside university",
    type: "Professional",
    connectedEvidence: [
      connectedEvidenceFromExperience("experience-toplife"),
    ].filter(Boolean),
    // Display-only narrative panel (WORK & STUDY is not a Journey type / taxonomy key).
    stage: "WORK & STUDY",
    narrativeHeading: "Building Professional Experience Alongside University",
    narrativeBody:
      "Began a five-year part-time role at TopLife Concierge, working primarily on weekends throughout my university studies and gaining continuous experience in front-office operations, CRM and client-facing services within a high-profile residential environment serving an international HNW clientele, including senior professionals from the banking sector.",
  }),
  entry({
    id: "journey-languages-degree",
    year: 2017,
    month: 9,
    title: "Started Bachelor's Degree in Languages for International Relations",
    subtitle: "English & Chinese · Università Cattolica del Sacro Cuore — Milan",
    type: "Education",
    narrativeHeading: "Starting the Bachelor's Degree",
    narrativeBody:
      "An interdisciplinary programme spanning Political Science and Language Studies, with English and Chinese as specialization languages.",
  }),
  entry({
    id: "journey-round-table",
    year: 2017,
    month: 9,
    title: "RT75 Milan — Round Table International",
    subtitle: null,
    type: "Network",
    narrativeHeading: "RT75 Milan — Round Table International",
    narrativeBody:
      "Three-year membership in RT75 Milan, including one year as Secretary, contributing to service initiatives, volunteering events, networking and relationships with other organizations across Milan.",
  }),
  entry({
    id: "journey-banking-sciences",
    year: 2016,
    month: 9,
    title: "Banking, Insurance & Financial Sciences",
    subtitle: "Università Cattolica del Sacro Cuore — Milan",
    type: "Education",
    // Display-only narrative panel (ACADEMIC EXPLORATION is not a Journey type / taxonomy key).
    // Canonical entity education-banking-sciences exists under Education but has no signalMap
    // deep-link; connected evidence stays at section level (Education →).
    stage: "ACADEMIC EXPLORATION",
    narrativeHeading: "First Academic Exposure to Finance",
    narrativeBody:
      "My first university year provided an introduction to banking, insurance and financial systems, before I moved toward international relations and languages.",
  }),
  entry({
    id: "journey-green-cross",
    year: 2015,
    month: 12,
    title: "Emergency Response Volunteer",
    subtitle: "Croce Verde Milano Sempione — Milan",
    type: "Volunteering",
    // Training evidence lives under Credentials; override default Volunteering→Experience.
    sections: ["Credentials"],
    connectedEvidence: [
      connectedEvidenceFromTraining("additional-training-healthcare-transport"),
      { label: "Credentials", section: "Credentials" },
    ].filter(Boolean),
    // Display-only narrative panel (SERVICE is not a Journey type / taxonomy key).
    stage: "SERVICE",
    narrativeHeading: "Volunteering in Emergency Response",
    narrativeBody:
      "Volunteer experience with Croce Verde Milano Sempione, supporting healthcare transport and emergency-response activities after completing the required training.",
  }),
  entry({
    id: "journey-australia",
    year: 2013,
    endYear: 2014,
    title: "Living & Working in Australia",
    subtitle: "Two-year international experience · Working Holiday Visa",
    type: "Experience",
    // Display-only narrative panel (EXPLORATION is not a Journey type / taxonomy key).
    stage: "EXPLORATION",
    narrativeHeading: "Living & Working in Australia",
    narrativeBody:
      "A two-year period living and working across Australia under the Working Holiday Visa programme, combining independent travel with work in hospitality, construction trades and rural environments, including volunteering in permaculture and agricultural activities.",
  }),
  entry({
    id: "journey-high-school",
    year: 2012,
    month: null,
    title: "Scientific & Technological High School Diploma",
    subtitle: "Sant’Ambrogio Don Bosco — Milan",
    type: "Education",
    // Display-only narrative panel (FOUNDATION is not a Journey type / taxonomy key).
    stage: "FOUNDATION",
    narrativeHeading: "High School Diploma",
    narrativeBody:
      "Completed a scientific and technology-oriented secondary education at Sant’Ambrogio Don Bosco in Milan.",
  }),
];

export function getPeriodKey(milestone) {
  if (!milestone) return "";
  const start = milestone.startYear ?? milestone.year;
  const end = milestone.endYear ?? start;
  return end > start ? `${start}–${end}` : String(start);
}

export function formatJourneyPeriod(milestone) {
  if (!milestone) return "";
  const start = milestone.startYear ?? milestone.year;
  const end = milestone.endYear ?? start;
  if (end > start) return `${start}–${end}`;
  if (milestone.month == null) return String(start);
  return `${MONTH_NAMES[milestone.month]} ${start}`;
}

/** Unique period keys in display order (newest → oldest). Multi-year spans appear once. */
export function getJourneyYears(milestones) {
  const periods = [];
  for (const milestone of milestones) {
    const key = getPeriodKey(milestone);
    if (periods[periods.length - 1] !== key) {
      periods.push(key);
    }
  }
  return periods;
}

export function getYearIndexForMilestone(milestones, milestoneIndex) {
  const milestone = milestones[milestoneIndex];
  if (!milestone) return 0;
  const periods = getJourneyYears(milestones);
  const index = periods.indexOf(getPeriodKey(milestone));
  return index < 0 ? 0 : index;
}

export function getFirstMilestoneIndexForYear(milestones, periodKey) {
  const key = String(periodKey);
  return milestones.findIndex((milestone) => getPeriodKey(milestone) === key);
}

/** All milestones for a period key, preserving newest→oldest order with original indices. */
export function getYearMilestoneEntries(milestones, periodKey) {
  const key = String(periodKey);
  return milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) => getPeriodKey(milestone) === key);
}

