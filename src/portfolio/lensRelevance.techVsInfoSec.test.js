import { describe, expect, it } from "vitest";
import { lensRelevance } from "./portfolioData.js";

const tech = lensRelevance["Technology Risk"];
const infoSec = lensRelevance["Information Security Governance"];

describe("Technology Risk vs Information Security Governance differentiation", () => {
  it("gives Technology Risk a primary Technology & ICT Risk capability only", () => {
    expect(tech.capabilities).toContain("capability-technology-risk");
    expect(tech.capabilities).not.toContain("capability-information-security");
    expect(tech.capabilities).toEqual(["capability-technology-risk"]);
  });

  it("keeps Technology Risk radar mappings empty (Risk Exposure is Role Lens–neutral)", () => {
    expect(tech.radar).toEqual([]);
  });

  it("gives Information Security Governance a primary InfoSec capability only", () => {
    expect(infoSec.capabilities).toContain("capability-information-security");
    expect(infoSec.capabilities).not.toContain("capability-technology-risk");
    expect(infoSec.capabilities).toEqual(["capability-information-security"]);
  });

  it("keeps Information Security Governance radar mappings empty", () => {
    expect(infoSec.radar).toEqual([]);
  });

  it("differentiates training evidence without forcing eIDAS onto InfoSec", () => {
    expect(tech.additionalTraining).toEqual([
      "additional-training-digital-banking-eidas-ai-act",
    ]);
    expect(infoSec.additionalTraining).toEqual(["additional-training-gdpr-banking"]);
    expect(infoSec.additionalTraining).not.toContain(
      "additional-training-digital-banking-eidas-ai-act"
    );
  });

  it("keeps legitimate shared experience and credential evidence", () => {
    for (const lens of [tech, infoSec]) {
      expect(lens.experiences).toContain("experience-boc");
      expect(lens.experiences).toContain("experience-banca-profilo");
      expect(lens.credentials).toContain("credential-cisa");
      expect(lens.credentials).toContain("credential-crisc");
    }
  });
});
