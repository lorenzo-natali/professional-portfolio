/**
 * Smallest deterministic resolver between knowledge entity ids and curated signalMap aliases.
 * Frontend may understand either; free-form /ask should expose both when known.
 */

/** Knowledge / entity id → signalMap alias (when different). */
export const ENTITY_TO_SIGNAL_ALIAS = Object.freeze({
  "experience-boc": "exp-boc",
  "experience-banca-profilo": "exp-banca-profilo",
  "experience-prelios": null,
  "experience-toplife": null,
  "project-ai-audit-workflow": "project-cbi",
  "project-codeiak": "project-codeiak",
  "credential-cisa": "cred-cisa",
  "credential-crisc": "cred-crisc",
  "credential-aair": "cred-aair",
  "credential-frm": "cred-frm",
  "capability-audit-control": "cap-internal-audit",
  "capability-banking-risk": "cap-banking-risk",
  "capability-technology-risk": "cap-technology-risk",
  "capability-information-security": "cap-information-security",
  "capability-ai-governance": "cap-ai-governance",
  "radar-control-audit-risk": "radar-internal-audit",
  "radar-credit-risk": "radar-credit",
  "radar-regulatory-compliance-risk": "radar-regulatory",
  "radar-technology-ict-risk": "radar-technology",
  "radar-information-security-governance": "radar-information-security",
  "radar-operational-resilience": "radar-operational-resilience",
  "radar-ai-model-governance": "radar-ai-governance",
});

/**
 * @param {{ id?: string, signalIds?: string[] }} item
 * @returns {string[]}
 */
export function resolvePublicSignalIds(item) {
  /** @type {Set<string>} */
  const out = new Set();
  const raw = Array.isArray(item?.signalIds) ? item.signalIds : [];
  for (const id of raw) {
    if (!id) continue;
    out.add(id);
    const alias = ENTITY_TO_SIGNAL_ALIAS[id];
    if (alias) out.add(alias);
  }
  // Profile navigates to current employer surface
  if (item?.id === "profile-lorenzo-natali") {
    out.add("experience-banca-profilo");
    out.add("exp-banca-profilo");
  }
  return [...out];
}
