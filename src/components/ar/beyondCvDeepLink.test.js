import { describe, expect, it } from "vitest";
import {
  BEYOND_CV_QUERY_PARAM,
  shouldLaunchBeyondCvFromLocation,
} from "./beyondCvDeepLink";

describe("beyondCvDeepLink", () => {
  it("exports the beyond query param name", () => {
    expect(BEYOND_CV_QUERY_PARAM).toBe("beyond");
  });

  it("launches for ?beyond=1 / true / yes and bare ?beyond", () => {
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?beyond=1",
        search: "?beyond=1",
        hash: "",
      }),
    ).toBe(true);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?beyond=true",
        search: "?beyond=true",
        hash: "",
      }),
    ).toBe(true);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?beyond=yes",
        search: "?beyond=yes",
        hash: "",
      }),
    ).toBe(true);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?beyond",
        search: "?beyond",
        hash: "",
      }),
    ).toBe(true);
  });

  it("does not launch for missing or falsy beyond", () => {
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/",
        search: "",
        hash: "",
      }),
    ).toBe(false);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?beyond=0",
        search: "?beyond=0",
        hash: "",
      }),
    ).toBe(false);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/?arRuntimeAudit=1",
        search: "?arRuntimeAudit=1",
        hash: "",
      }),
    ).toBe(false);
  });

  it("reads beyond from hash query forms", () => {
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/#beyond=1",
        search: "",
        hash: "#beyond=1",
      }),
    ).toBe(true);
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/#/?beyond=1",
        search: "",
        hash: "#/?beyond=1",
      }),
    ).toBe(true);
  });

  it("works alongside other query params", () => {
    expect(
      shouldLaunchBeyondCvFromLocation({
        href: "https://example.com/portfolio/?foo=1&beyond=1&bar=2",
        search: "?foo=1&beyond=1&bar=2",
        hash: "",
      }),
    ).toBe(true);
  });
});
