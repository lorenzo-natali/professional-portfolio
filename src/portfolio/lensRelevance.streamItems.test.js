import { describe, expect, it } from "vitest";
import { lensRelevance, stackStreams } from "./portfolioData.js";

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

  it("maps DORA and operational resilience components to Technology Risk", () => {
    const tech = streamItemsFor("Technology Risk");
    expect(tech).toContain("DORA");
    expect(tech).toContain("Business Impact Analysis");
    expect(tech).toContain("Business Continuity Planning");
    expect(tech).toContain("Disaster Recovery");
  });

  it("maps ISO/IEC 27001 and NIST CSF to Information Security Governance", () => {
    const infoSec = streamItemsFor("Information Security Governance");
    expect(infoSec).toContain("ISO/IEC 27001");
    expect(infoSec).toContain("NIST CSF");
  });

  it("places Power BI and Cline Desktop once in Technology, Security & AI only", () => {
    const techItems = stackStreams.find((s) => s.label === "Technology, Security & AI")?.items ?? [];
    const riskItems = stackStreams.find((s) => s.label === "Risk & Regulatory")?.items ?? [];

    expect(techItems.filter((item) => item === "Power BI")).toHaveLength(1);
    expect(techItems.filter((item) => item === "Cline Desktop")).toHaveLength(1);
    expect(techItems.indexOf("Power BI")).toBe(techItems.indexOf("Advanced Excel") + 1);
    expect(techItems.indexOf("Cline Desktop")).toBe(techItems.indexOf("Cursor") + 1);
    expect(riskItems).not.toContain("Power BI");
    expect(riskItems).not.toContain("Cline Desktop");
  });

  it("maps Cline Desktop to AI Governance only, like adjacent AI tooling", () => {
    expect(streamItemsFor("AI Governance")).toContain("Cline Desktop");
    expect(streamItemsFor("AI Governance")).toContain("AI Agents");
    expect(streamItemsFor("AI Governance")).toContain("Local LLMs");
    expect(streamItemsFor("IT Audit")).not.toContain("Cline Desktop");
    expect(streamItemsFor("Technology Risk")).not.toContain("Cline Desktop");
    expect(streamItemsFor("Information Security Governance")).not.toContain("Cline Desktop");
    expect(streamItemsFor("Banking Risk")).not.toContain("Cline Desktop");
    // Precedent: Cursor is an AI-assisted IDE and remains unmapped.
    expect(streamItemsFor("AI Governance")).not.toContain("Cursor");
  });

  it("maps the six analytical tools to Banking Risk and IT Audit only", () => {
    const analyticalTools = [
      "Advanced Excel",
      "SQL",
      "Python",
      "pandas",
      "Data Analysis",
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

  it("keeps Cline Desktop and AI Strategy & Adoption on AI Governance only", () => {
    expect(streamItemsFor("AI Governance")).toContain("Cline Desktop");
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
});
