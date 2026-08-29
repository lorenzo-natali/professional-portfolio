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

  it("maps Technology Risk radar to ICT Risk and Operational Resilience only", () => {
    expect(tech.radar).toContain("radar-technology-ict-risk");
    expect(tech.radar).toContain("radar-operational-resilience");
    expect(tech.radar).not.toContain("radar-information-security-governance");
    expect(tech.radar).toEqual([
      "radar-technology-ict-risk",
      "radar-operational-resilience",
    ]);
  });

  it("gives Information Security Governance a primary InfoSec capability only", () => {
    expect(infoSec.capabilities).toContain("capability-information-security");
    expect(infoSec.capabilities).not.toContain("capability-technology-risk");
    expect(infoSec.capabilities).toEqual(["capability-information-security"]);
  });

  it("maps Information Security Governance radar to the InfoSec domain only", () => {
    expect(infoSec.radar).toContain("radar-information-security-governance");
    expect(infoSec.radar).not.toContain("radar-technology-ict-risk");
    expect(infoSec.radar).not.toContain("radar-operational-resilience");
    expect(infoSec.radar).toEqual(["radar-information-security-governance"]);
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
