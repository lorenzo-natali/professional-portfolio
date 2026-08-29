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
});
