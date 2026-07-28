/**
 * Light Beyond-the-CV surface for the production homepage.
 * Card + deep-link only — does NOT pull ARGovernanceView / MindAR adapter graph.
 * App lazy-imports ARGovernanceView only while Beyond is open.
 */

export { default as ARGovernanceCard } from "./ARGovernanceCard.jsx";
export { shouldLaunchBeyondCvFromLocation } from "./beyondCvDeepLink.js";
