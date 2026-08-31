/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import RiskRadar from "./RiskRadar.jsx";
import {
  currentBase,
  preferredLocations,
} from "./mobilityData.js";

describe("International Mobility snapshot tab", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      queueMicrotask(() => cb(0));
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exposes International Mobility as the third tab", () => {
    render(<RiskRadar />);
    const tabs = screen.getAllByRole("button").filter((btn) =>
      ["Career Timeline", "Risk Exposure", "International Mobility"].includes(
        btn.textContent ?? ""
      )
    );
    expect(tabs.map((btn) => btn.textContent)).toEqual([
      "Career Timeline",
      "Risk Exposure",
      "International Mobility",
    ]);
    const risk = screen.getByRole("button", { name: "Risk Exposure" });
    const journey = screen.getByRole("button", { name: "Career Timeline" });
    const mobility = screen.getByRole("button", { name: "International Mobility" });
    expect(journey).toHaveAttribute("aria-pressed", "true");
    expect(risk).toHaveAttribute("aria-pressed", "false");
    expect(mobility).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Profile Coverage" })).toBeNull();
  });

  it("keeps Risk Exposure selectable", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "Risk Exposure" }));
    expect(
      screen.getByRole("button", { name: "Risk Exposure" })
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(document.querySelector(".radar-sweep")).toBeTruthy();
      expect(screen.getByRole("img", { name: "My Profile" })).toBeTruthy();
    });
  });

  it("keeps Career Timeline as the default active view", async () => {
    render(<RiskRadar />);
    expect(
      screen.getByRole("button", { name: "Career Timeline" })
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(document.querySelector(".radar-sweep")).toBeNull();
      expect(screen.getByRole("button", { name: "Older year" })).toBeTruthy();
    });
  });

  it("renders the Europe map with seven markers and a beyond-Europe summary", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "International Mobility" }));

    expect(
      screen.getByRole("button", { name: "International Mobility" })
    ).toHaveAttribute("aria-pressed", "true");

    await waitFor(() => {
      expect(screen.getByTestId("international-mobility-map")).toBeTruthy();
      expect(screen.getByTestId("europe-mobility-map-image")).toBeTruthy();
      expect(screen.getByTestId("international-mobility-summary")).toBeTruthy();
    });

    expect(screen.queryByText("European Priority Locations")).toBeNull();

    const mapImg = screen.getByTestId("europe-mobility-map-image");
    expect(mapImg).toHaveAttribute("alt", "");
    expect(mapImg).toHaveAttribute("aria-hidden", "true");
    expect(mapImg.getAttribute("src") || "").toMatch(/europe-mobility-map/);

    expect(preferredLocations).toHaveLength(6);
    expect(preferredLocations.map((l) => l.id)).toEqual([
      "dublin",
      "london",
      "luxembourg",
      "amsterdam",
      "frankfurt",
      "zurich",
    ]);

    expect(currentBase.displayPosition).toEqual({ x: 40.36, y: 64.92 });
    expect(
      preferredLocations.find((l) => l.id === "amsterdam")?.displayPosition
    ).toEqual({ x: 35.75, y: 50.38 });
    expect(
      preferredLocations.find((l) => l.id === "frankfurt")?.displayPosition
    ).toEqual({ x: 40.53, y: 56.6 });

    expect(
      screen.getByRole("button", {
        name: "Milan, Italy — current professional base",
      })
    ).toBeTruthy();

    for (const location of preferredLocations) {
      expect(
        screen.getByRole("img", {
          name: `${location.city}, ${location.country} — preferred relocation location`,
        })
      ).toBeTruthy();
    }

    const summary = screen.getByTestId("international-mobility-summary");
    expect(within(summary).getByText("Current base")).toBeTruthy();
    expect(within(summary).getByRole("heading", { name: "Milan, Italy" })).toBeTruthy();
    expect(within(summary).getByText("Open to relocation")).toBeTruthy();
    expect(within(summary).getByText("European preferred locations")).toBeTruthy();
    expect(within(summary).getByText("Beyond Europe")).toBeTruthy();
    expect(within(summary).getByText("Asia / APAC")).toBeTruthy();
    expect(within(summary).getByText("Singapore · Hong Kong · Sydney")).toBeTruthy();
    expect(within(summary).getByText("United States")).toBeTruthy();
    expect(within(summary).getByText("New York · Boston · San Francisco")).toBeTruthy();
    expect(within(summary).getByText("Middle East")).toBeTruthy();
    expect(within(summary).getByText("Dubai · Abu Dhabi")).toBeTruthy();
    expect(within(summary).queryByText("Preferred locations")).toBeNull();

    const map = screen.getByTestId("international-mobility-map");
    expect(within(map).getByText("Dublin")).toBeTruthy();
    expect(within(map).getByText("Milan")).toBeTruthy();
    expect(within(map).getByText("Amsterdam")).toBeTruthy();
    expect(within(map).getByText("Frankfurt")).toBeTruthy();
    expect(within(map).queryByText("Ireland")).toBeNull();
    expect(within(map).queryByText("United Kingdom")).toBeNull();
    expect(within(map).queryByText("Netherlands")).toBeNull();
    expect(within(map).queryByText("Germany")).toBeNull();
    expect(within(map).queryByText("Switzerland")).toBeNull();
    expect(within(map).queryByText("Current base · Italy")).toBeNull();
  });

  it("unmounts mobility when switching away", async () => {
    render(<RiskRadar />);
    fireEvent.click(screen.getByRole("button", { name: "International Mobility" }));
    await waitFor(() => {
      expect(screen.getByTestId("international-mobility-map")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Risk Exposure" }));
    await waitFor(() => {
      expect(screen.queryByTestId("international-mobility-map")).toBeNull();
      expect(document.querySelector(".radar-sweep")).toBeTruthy();
    });
  });

  it("mobility modules introduce no timer/observer runtime owners", () => {
    const mobilitySource = readFileSync(
      resolve("src/portfolio/InternationalMobility.jsx"),
      "utf8"
    );
    const dataSource = readFileSync(
      resolve("src/portfolio/mobilityData.js"),
      "utf8"
    );
    for (const src of [mobilitySource, dataSource]) {
      expect(src).not.toMatch(/\buseEffect\b/);
      expect(src).not.toMatch(/\bsetInterval\b/);
      expect(src).not.toMatch(/\bsetTimeout\b/);
      expect(src).not.toMatch(/\brequestAnimationFrame\b/);
      expect(src).not.toMatch(/\bIntersectionObserver\b/);
      expect(src).not.toMatch(/\bResizeObserver\b/);
      expect(src).not.toMatch(/EUROPE_CONTINENT|EUROPE_GREAT_BRITAIN|EUROPE_IRELAND/);
      expect(src).not.toMatch(/backdrop-filter|WebGL|leaflet|mapbox/i);
    }
    expect(mobilitySource).toMatch(/europe-mobility-map\.png/);
    expect(mobilitySource).not.toMatch(/group-hover/);
    expect(dataSource).toMatch(/displayPosition/);
    expect(dataSource).toMatch(/labelOffset/);
  });

  it("removes all calibration tooling from the repository", () => {
    expect(
      existsSync(resolve("src/portfolio/InternationalMobilityCalibration.jsx"))
    ).toBe(false);

    const mobilitySource = readFileSync(
      resolve("src/portfolio/InternationalMobility.jsx"),
      "utf8"
    );
    const dataSource = readFileSync(
      resolve("src/portfolio/mobilityData.js"),
      "utf8"
    );
    for (const src of [mobilitySource, dataSource]) {
      expect(src).not.toMatch(/VITE_MOBILITY_CALIBRATION/);
      expect(src).not.toMatch(/Calibration/);
      expect(src).not.toMatch(/\blazy\b/);
      expect(src).not.toMatch(/\bSuspense\b/);
      expect(src).not.toMatch(/pointermove|pointerdown|clipboard/);
    }
  });

  it("production Europe map asset is an RGBA PNG with transparency", () => {
    const buf = readFileSync(resolve("src/assets/europe-mobility-map.png"));
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47);
    const ihdr = buf.indexOf(Buffer.from("IHDR"));
    expect(ihdr).toBeGreaterThan(0);
    const colorTypeAt = ihdr + 4 + 4 + 4 + 1;
    expect(buf[colorTypeAt]).toBe(6); // RGBA
  });
});
