import { describe, expect, it } from "vitest";
import {
  additionalTraining,
  credentials,
  education,
  experiences,
  expertise,
  lensRelevance,
  projects,
  radarDomains,
  stackStreams,
} from "./portfolioData.js";

const sliderItems = new Set(stackStreams.flatMap((stream) => stream.items));

function streamItemsFor(lensName) {
  return lensRelevance[lensName]?.streamItems ?? [];
}

describe("lensRelevance streamItems ↔ stackStreams consistency", () => {
  it("references only labels that exist in the current slider dataset", () => {
    const mapped = Object.values(lensRelevance).flatMap(
      (groups) => groups.streamItems ?? []
    );
    const missing = [...new Set(mapped)].filter((item) => !sliderItems.has(item));
    expect(missing).toEqual([]);
  });

  it("maps NIS2 only to Information Security Governance", () => {
    expect(streamItemsFor("Information Security Governance")).toContain("NIS2");
    expect(streamItemsFor("Technology Risk")).not.toContain("NIS2");
    expect(streamItemsFor("IT Audit")).not.toContain("NIS2");
    expect(streamItemsFor("Banking Risk")).not.toContain("NIS2");
    expect(streamItemsFor("AI Governance")).not.toContain("NIS2");
  });

  it("maps DORA to IT Audit and Technology Risk, and the resilience label to Technology Risk", () => {
    const tech = streamItemsFor("Technology Risk");
    expect(tech).toContain("DORA");
    expect(streamItemsFor("IT Audit")).toContain("DORA");
    expect(streamItemsFor("IT Audit").filter((item) => item === "DORA")).toHaveLength(1);
    expect(tech.filter((item) => item === "DORA")).toHaveLength(1);
    expect(tech).toContain("BIA / BCP / DRP");
    expect(tech).not.toContain("Business Impact Analysis");
    expect(tech).not.toContain("Business Continuity Planning");
    expect(tech).not.toContain("Disaster Recovery");
    expect(tech).not.toContain("Operational Resilience");
  });

  it("maps ISO/IEC 27001 and NIST CSF to Information Security Governance", () => {
    const infoSec = streamItemsFor("Information Security Governance");
    expect(infoSec).toContain("ISO/IEC 27001");
    expect(infoSec).toContain("NIST CSF");
  });

  it("keeps the Risk & Regulatory slider to the consolidated twelve labels", () => {
    const riskItems = stackStreams.find((stream) => stream.label === "Risk & Regulatory")?.items ?? [];
    const techItems = stackStreams.find((stream) => stream.label === "Technology, Security & AI")?.items ?? [];

    expect(riskItems).toEqual([
      "Internal Audit",
      "Internal Controls",
      "Risk Assessment",
      "Credit Risk",
      "IFRS 9 / ECL",
      "ECB Supervision",
      "Basel III / IV",
      "CRD VI / Third-Country Branches",
      "RAF",
      "ICAAP / ILAAP",
      "Pillar III",
      "AML / KYC",
    ]);
    expect(riskItems).toHaveLength(12);
  });

  it("keeps the Technology, Security & AI slider to the specified thirty labels", () => {
    const techItems = stackStreams.find((stream) => stream.label === "Technology, Security & AI")?.items ?? [];
    const removed = [
      "Operational Resilience",
      "Data Analysis",
      "Audit Traceability",
      "Cursor",
      "Cline Desktop",
      "Business Impact Analysis",
      "Business Continuity Planning",
      "Disaster Recovery",
      "Python",
      "pandas",
    ];

    expect(techItems).toEqual([
      "COBIT",
      "ITGC",
      "ISO/IEC 27001",
      "NIST CSF",
      "DORA",
      "NIS2",
      "EBA ICT & Security Risk",
      "EBA Outsourcing Guidelines",
      "ICT Third-Party Risk",
      "BIA / BCP / DRP",
      "EU AI Act",
      "NIST AI RMF",
      "ISO/IEC 23894",
      "ISO/IEC 42001",
      "ISO/IEC 42005",
      "ISO/IEC 42006",
      "AI Transparency / Article 50",
      "Python / pandas",
      "SQL",
      "Advanced Excel",
      "Power BI",
      "SAP",
      "HFM / Oracle",
      "Local LLMs",
      "Hugging Face",
      "RAG Workflows",
      "AI Agents",
      "LLM Evaluation",
      "Structured Data Extraction",
      "GitHub",
    ]);
    expect(techItems).toHaveLength(30);
    expect(new Set(techItems).size).toBe(30);
    for (const item of removed) {
      expect(techItems).not.toContain(item);
    }
    expect(techItems.filter((item) => item === "BIA / BCP / DRP")).toHaveLength(1);
    expect(techItems.filter((item) => item === "Python / pandas")).toHaveLength(1);
  });

  it("places Power BI once in Technology, Security & AI only", () => {
    const techItems = stackStreams.find((s) => s.label === "Technology, Security & AI")?.items ?? [];
    const riskItems = stackStreams.find((s) => s.label === "Risk & Regulatory")?.items ?? [];

    expect(techItems.filter((item) => item === "Power BI")).toHaveLength(1);
    expect(techItems.indexOf("Power BI")).toBe(techItems.indexOf("Advanced Excel") + 1);
    expect(riskItems).not.toContain("Power BI");
  });

  it("maps the new AI governance labels to AI Governance only", () => {
    const aiLabels = ["ISO/IEC 23894", "ISO/IEC 42005", "ISO/IEC 42006", "AI Transparency / Article 50"];
    for (const label of aiLabels) {
      expect(streamItemsFor("AI Governance")).toContain(label);
      expect(streamItemsFor("IT Audit")).not.toContain(label);
      expect(streamItemsFor("Technology Risk")).not.toContain(label);
      expect(streamItemsFor("Information Security Governance")).not.toContain(label);
      expect(streamItemsFor("Banking Risk")).not.toContain(label);
    }
    expect(streamItemsFor("AI Governance")).toContain("AI Agents");
    expect(streamItemsFor("AI Governance")).toContain("Local LLMs");
    expect(streamItemsFor("AI Governance")).not.toContain("Cline Desktop");
    expect(streamItemsFor("AI Governance")).not.toContain("Cursor");
  });

  it("maps the analytical tools to Banking Risk and IT Audit only", () => {
    const analyticalTools = [
      "Advanced Excel",
      "SQL",
      "Python / pandas",
      "Power BI",
    ];

    for (const tool of analyticalTools) {
      expect(streamItemsFor("Banking Risk")).toContain(tool);
      expect(streamItemsFor("IT Audit")).toContain(tool);
      expect(streamItemsFor("AI Governance")).not.toContain(tool);
      expect(streamItemsFor("Information Security Governance")).not.toContain(tool);
      expect(streamItemsFor("Technology Risk")).not.toContain(tool);
      expect(streamItemsFor("Overview")).not.toContain(tool);
    }

    for (const lens of ["Banking Risk", "IT Audit"]) {
      for (const tool of analyticalTools) {
        expect(streamItemsFor(lens).filter((item) => item === tool)).toHaveLength(1);
      }
    }
  });

  it("keeps AI Strategy & Adoption on AI Governance only", () => {
    expect(lensRelevance["AI Governance"].capabilities).toContain(
      "capability-ai-strategy-adoption"
    );
    expect(lensRelevance["IT Audit"].capabilities).not.toContain(
      "capability-ai-strategy-adoption"
    );
    expect(lensRelevance["Banking Risk"].capabilities).not.toContain(
      "capability-ai-strategy-adoption"
    );
  });

  it("applies the nine agreed Role Lens mapping corrections", () => {
    expect(lensRelevance["AI Governance"].experiences).toEqual(["experience-banca-profilo"]);
    expect(lensRelevance["AI Governance"].capabilities).toEqual([
      "capability-ai-governance",
      "capability-ai-strategy-adoption",
    ]);
    expect(lensRelevance["AI Governance"].capabilities).not.toContain("capability-technology-risk");
    expect(lensRelevance["IT Audit"].capabilities).toContain("capability-technology-risk");
    expect(lensRelevance["Technology Risk"].capabilities).toContain("capability-technology-risk");
    expect(lensRelevance["IT Audit"].experiences).toContain("experience-banca-profilo");
    expect(lensRelevance["Technology Risk"].experiences).toContain("experience-banca-profilo");

    expect(streamItemsFor("Banking Risk")).toEqual([
      "IFRS 9 / ECL",
      "Credit Risk",
      "ICAAP / ILAAP",
      "Pillar III",
      "Basel III / IV",
      "CRD VI / Third-Country Branches",
      "Advanced Excel",
      "SQL",
      "Python / pandas",
      "Power BI",
      "RAF",
      "AML / KYC",
      "ECB Supervision",
    ]);
    expect(streamItemsFor("Technology Risk")).toEqual([
      "DORA",
      "ICT Third-Party Risk",
      "BIA / BCP / DRP",
      "ITGC",
      "COBIT",
      "EBA ICT & Security Risk",
      "EBA Outsourcing Guidelines",
    ]);
    expect(streamItemsFor("IT Audit")).toEqual([
      "Internal Audit",
      "Internal Controls",
      "ITGC",
      "Advanced Excel",
      "SQL",
      "Python / pandas",
      "Power BI",
      "Risk Assessment",
      "DORA",
    ]);
    expect(lensRelevance["Information Security Governance"]).toEqual({
      capabilities: ["capability-information-security"],
      credentials: ["credential-cisa", "credential-crisc"],
      experiences: ["experience-banca-profilo", "experience-boc"],
      projects: [],
      radar: [],
      education: [],
      additionalTraining: ["additional-training-gdpr-banking"],
      streamItems: ["ISO/IEC 27001", "NIST CSF", "COBIT", "ITGC", "NIS2"],
    });

    const aiLabels = [
      "EU AI Act",
      "NIST AI RMF",
      "ISO/IEC 23894",
      "ISO/IEC 42001",
      "ISO/IEC 42005",
      "ISO/IEC 42006",
      "AI Transparency / Article 50",
    ];
    for (const label of aiLabels) {
      expect(streamItemsFor("AI Governance")).toContain(label);
    }
    for (const label of ["GitHub", "SAP", "HFM / Oracle", "Hugging Face"]) {
      expect(Object.values(lensRelevance).flatMap((groups) => groups.streamItems)).not.toContain(label);
    }
  });

  it("keeps mapping keys unique, current, and resolvable", () => {
    const removed = [
      "SOX Principles",
      "Banking Regulatory Frameworks",
      "ESG Reporting",
      "Operational Resilience",
      "Data Analysis",
      "Audit Traceability",
      "Cursor",
      "Cline Desktop",
      "Business Impact Analysis",
      "Business Continuity Planning",
      "Disaster Recovery",
      "Python",
      "pandas",
    ];
    const ids = {
      capabilities: new Set(expertise.map((item) => item.id)),
      credentials: new Set(credentials.map((item) => item.id)),
      experiences: new Set(experiences.map((item) => item.id)),
      projects: new Set(projects.map((item) => item.id)),
      education: new Set(education.map((item) => item.id)),
      additionalTraining: new Set(additionalTraining.items.map((item) => item.id)),
      radar: new Set(radarDomains.map((item) => item.id)),
      streamItems: sliderItems,
    };

    for (const groups of Object.values(lensRelevance)) {
      for (const [group, values] of Object.entries(groups)) {
        expect(new Set(values).size).toBe(values.length);
        for (const value of values) {
          expect(ids[group].has(value)).toBe(true);
          expect(removed).not.toContain(value);
        }
      }
    }
  });
});
