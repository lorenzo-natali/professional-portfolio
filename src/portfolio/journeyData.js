/**
 * Journey milestones for Professional Snapshot.
 * Order: newest first (index 0) → oldest last.
 * month: 1–12, or null when only a year is known (never invent a month).
 */

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
  month = null,
  title,
  subtitle = null,
  type,
  explanation,
  highlights = [],
  sections,
}) {
  return {
    id,
    year,
    month,
    monthLabel: month == null ? null : MONTH_LABELS[month],
    title,
    subtitle,
    type,
    explanation,
    highlights,
    sections: sections ?? sectionsForType(type),
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
    explanation:
      "Upcoming Internal Audit role within Banca Profilo’s business and technology transformation context.",
  }),
  entry({
    id: "journey-cisa",
    year: 2026,
    month: null,
    title: "CISA",
    subtitle: "In Progress",
    type: "Certification",
    explanation: "Professional certification pathway currently in progress.",
  }),
  entry({
    id: "journey-postgrad-complete",
    year: 2026,
    month: 1,
    title: "Postgraduate Master's Completed",
    subtitle: "A-",
    type: "Education",
    explanation: "Completion of postgraduate master's studies.",
  }),
  entry({
    id: "journey-boc",
    year: 2025,
    month: 10,
    title: "Bank of China — Milan Branch",
    subtitle: "Internal Auditor",
    type: "Professional",
    explanation:
      "Internal audit role within an international banking environment in Milan.",
  }),
  entry({
    id: "journey-prelios",
    year: 2025,
    month: 5,
    title: "Prelios Credit Servicing",
    subtitle: "Accounting & Administration",
    type: "Professional",
    explanation:
      "Accounting and administration experience within credit servicing operations.",
  }),
  entry({
    id: "journey-postgrad-start",
    year: 2025,
    month: 1,
    title: "Auditing, Accounting & Sustainability Reporting",
    subtitle: "Postgraduate Master's",
    type: "Education",
    explanation: "Postgraduate master's programme in auditing, accounting and sustainability reporting.",
  }),
  entry({
    id: "journey-masters-complete",
    year: 2023,
    month: 12,
    title: "Master's Degree Completed",
    subtitle: "105/110",
    type: "Education",
    explanation: "Completion of master's degree studies.",
  }),
  entry({
    id: "journey-hsk3",
    year: 2023,
    month: 10,
    title: "Chinese HSK3 Programme",
    subtitle: "Confucius Institute",
    type: "Training",
    explanation: "Structured Chinese language training through the Confucius Institute.",
  }),
  entry({
    id: "journey-icd-masters",
    year: 2021,
    month: 9,
    title: "International Cooperation for Development",
    subtitle: "Master's Degree",
    type: "Education",
    explanation: "Master's degree studies in international cooperation for development.",
  }),
  entry({
    id: "journey-bachelors",
    year: 2021,
    month: 7,
    title: "Bachelor's Degree",
    subtitle: "Languages for International Relations",
    type: "Education",
    explanation: "Bachelor's degree in languages for international relations.",
  }),
  entry({
    id: "journey-toplife",
    year: 2020,
    month: 7,
    title: "TopLife Concierge",
    subtitle: "Front Office & CRM",
    type: "Professional",
    explanation:
      "Front-office and CRM role in a luxury residential environment alongside university studies.",
  }),
  entry({
    id: "journey-languages-degree",
    year: 2017,
    month: 9,
    title: "Languages for International Relations",
    subtitle: "English & Chinese",
    type: "Education",
    explanation: "University studies in languages for international relations.",
  }),
  entry({
    id: "journey-round-table",
    year: 2017,
    month: 9,
    title: "Round Table International",
    subtitle: "RT75 Milan",
    type: "Network",
    explanation: "Participation in Round Table International — RT75 Milan.",
  }),
  entry({
    id: "journey-banking-sciences",
    year: 2016,
    month: 9,
    title: "Banking, Insurance & Financial Sciences",
    subtitle: "Catholic University",
    type: "Education",
    explanation:
      "University studies in banking, insurance and financial sciences at Catholic University.",
  }),
  entry({
    id: "journey-green-cross",
    year: 2015,
    month: 12,
    title: "Emergency Responder",
    subtitle: "Green Cross Milano",
    type: "Volunteering",
    explanation: "Volunteer emergency responder activity with Green Cross Milano.",
  }),
  entry({
    id: "journey-australia-complete",
    year: 2014,
    month: 1,
    title: "Australia Experience Completed",
    subtitle: null,
    type: "Experience",
    explanation: "Completion of the Australia international experience.",
  }),
  entry({
    id: "journey-australia-wwoof",
    year: 2013,
    month: 10,
    title: "Australia",
    subtitle: "WWOOF International Experience",
    type: "Experience",
    explanation: "International WWOOF experience in Australia.",
  }),
  entry({
    id: "journey-high-school",
    year: 2012,
    month: null,
    title: "High School Diploma",
    subtitle: "Scientific & Technological Studies",
    type: "Education",
    explanation: "High school diploma in scientific and technological studies.",
  }),
];

export function formatJourneyPeriod(milestone) {
  if (!milestone) return "";
  if (milestone.month == null) return String(milestone.year);
  return `${MONTH_NAMES[milestone.month]} ${milestone.year}`;
}

/** Unique years in display order (newest → oldest). */
export function getJourneyYears(milestones) {
  const years = [];
  for (const milestone of milestones) {
    if (years[years.length - 1] !== milestone.year) {
      years.push(milestone.year);
    }
  }
  return years;
}

export function getYearIndexForMilestone(milestones, milestoneIndex) {
  const year = milestones[milestoneIndex]?.year;
  if (year == null) return 0;
  const years = getJourneyYears(milestones);
  const index = years.indexOf(year);
  return index < 0 ? 0 : index;
}

export function getFirstMilestoneIndexForYear(milestones, year) {
  return milestones.findIndex((milestone) => milestone.year === year);
}

/** All milestones for a year, preserving newest→oldest order with original indices. */
export function getYearMilestoneEntries(milestones, year) {
  return milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) => milestone.year === year);
}

