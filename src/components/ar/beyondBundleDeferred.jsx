/**
 * Deferred Beyond surface (siteDiag full-no-preload).
 * Same light exports as beyondBundle.js — ARGovernanceView is never in this
 * chunk; App mounts it only while open via dynamic import.
 */

export { default as ARGovernanceCard } from "./ARGovernanceCard.jsx";
export { shouldLaunchBeyondCvFromLocation } from "./beyondCvDeepLink.js";
