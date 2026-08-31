/**
 * International mobility snapshot data (v1).
 *
 * Semantic geography (city / country / lat / lon) is separate from
 * displayPosition, which is calibrated visually against
 * src/assets/europe-mobility-map.png (not a formal map projection).
 *
 * displayPosition { x, y } are percentages of the rendered image box:
 * 0,0 = top-left · 100,100 = bottom-right.
 * Marker positions are FINAL — do not derive from lat/lon.
 * labelOffset / labelAnchor are presentation-only (markers never move).
 */

/** @typedef {{ x: number, y: number }} MobilityPoint */

/** @typedef {{
 *   id: string,
 *   city: string,
 *   country: string,
 *   lat: number,
 *   lon: number,
 *   displayPosition: MobilityPoint,
 *   labelOffset: MobilityPoint,
 *   labelAnchor?: "start" | "end" | "middle",
 * }} MobilityLocation */

/** @typedef {{ id: string, region: string, cities: string[] }} BeyondEuropeRegion */

/** Intrinsic pixel size of europe-mobility-map.png. */
export const EUROPE_MAP_INTRINSIC = Object.freeze({
  width: 1024,
  height: 935,
});

/** @type {MobilityLocation} */
export const currentBase = {
  id: "milan",
  city: "Milan",
  country: "Italy",
  lat: 45.4642,
  lon: 9.19,
  displayPosition: { x: 40.36, y: 64.92 },
  // Below-center — clear of Zurich to the right
  labelOffset: { x: 0, y: 2.8 },
  labelAnchor: "middle",
};

/**
 * Preferred European priority locations (map markers).
 * displayPosition values are FINAL approved calibration.
 */
/** @type {MobilityLocation[]} */
export const preferredLocations = [
  {
    id: "dublin",
    city: "Dublin",
    country: "Ireland",
    lat: 53.3498,
    lon: -6.2603,
    displayPosition: { x: 16.86, y: 42.53 },
    // Above-right
    labelOffset: { x: 1.5, y: -1.9 },
    labelAnchor: "start",
  },
  {
    id: "london",
    city: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
    displayPosition: { x: 27.55, y: 50.88 },
    // Above-left — clears Luxembourg's long below-center label
    labelOffset: { x: -1.6, y: -1.8 },
    labelAnchor: "end",
  },
  {
    id: "luxembourg",
    city: "Luxembourg",
    country: "Luxembourg",
    lat: 49.6116,
    lon: 6.1319,
    displayPosition: { x: 35.35, y: 56.32 },
    // Below-center — long name stays under its node (avoids London corridor)
    labelOffset: { x: 0, y: 2.2 },
    labelAnchor: "middle",
  },
  {
    id: "amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    lat: 52.3676,
    lon: 4.9041,
    displayPosition: { x: 35.75, y: 50.38 },
    // Above-right — north of Luxembourg
    labelOffset: { x: 1.5, y: -1.9 },
    labelAnchor: "start",
  },
  {
    id: "frankfurt",
    city: "Frankfurt",
    country: "Germany",
    lat: 50.1109,
    lon: 8.6821,
    displayPosition: { x: 40.53, y: 56.60 },
    // Right / slightly above
    labelOffset: { x: 1.8, y: -0.9 },
    labelAnchor: "start",
  },
  {
    id: "zurich",
    city: "Zurich",
    country: "Switzerland",
    lat: 47.3769,
    lon: 8.5417,
    displayPosition: { x: 39.18, y: 61.05 },
    // Right — between Frankfurt above and Milan below
    labelOffset: { x: 1.8, y: 0.9 },
    labelAnchor: "start",
  },
];

/** Non-European mobility communicated textually (not on the Europe map). */
/** @type {BeyondEuropeRegion[]} */
export const beyondEuropeRegions = [
  {
    id: "asia-apac",
    region: "Asia / APAC",
    cities: ["Singapore", "Hong Kong", "Sydney"],
  },
  {
    id: "united-states",
    region: "United States",
    cities: ["New York", "Boston", "San Francisco"],
  },
  {
    id: "middle-east",
    region: "Middle East",
    cities: ["Dubai", "Abu Dhabi"],
  },
];
