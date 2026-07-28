/**
 * Eager Beyond-the-CV module surface for the production homepage.
 * Importing this module pulls the AR governance view graph into the same
 * JavaScript chunk as the caller (MindAR adapter code, .mind/.glb path strings).
 * mind-ar / three / tensorflow packages themselves remain dynamic inside the adapter.
 */

export { default as ARGovernanceCard } from "./ARGovernanceCard.jsx";
export { default as ARGovernanceView } from "./ARGovernanceView.jsx";
export { shouldLaunchBeyondCvFromLocation } from "./beyondCvDeepLink.js";
