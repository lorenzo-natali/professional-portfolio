/**
 * Closed signal for the Beyond CV invitation.
 * This does not decide the answer and does not call a model.
 * A miss is intentional: ordinary professional questions must not match.
 */

export const BEYOND_CV_ACTION = "beyond-cv";

/**
 * @param {string} question
 */
function normalize(question) {
  return String(question || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'");
}

/** Personal life outside work. Bare "interests" is not enough. */
const OUTSIDE_FRAME = [
  /\bpersonal interests?\b/,
  /\binteressi personali\b/,
  /\bvita personale\b/,
  /\bhobb(?:y|ies)\b/,
  /\bfree time\b/,
  /\bspare time\b/,
  /\btempo libero\b/,
  /\boutside (?:of )?(?:his |the |lorenzo'?s )?(?:work|job|career|professional life)\b/,
  /\bbeyond (?:his |the |lorenzo'?s )?(?:professional (?:life|career|work)|work life|job)\b/,
  /\bapart from (?:his |the )?(?:work|job|career|professional life)\b/,
  /\bwhen (?:he(?:'s| is) )?not working\b/,
  /\blife outside (?:of )?(?:work|his career)\b/,
  /\bfuori dal lavoro\b/,
  /\bfuori dalla (?:sua )?carriera\b/,
  /\boltre (?:alla |la )?(?:sua )?carriera\b/,
  /\boltre (?:al |il )?(?:suo )?lavoro\b/,
  /\boltre (?:alla |la )?vita professionale\b/,
  /\bbeyond (?:his |the |lorenzo's )?(?:cv|curriculum vitae|curriculum|resume)\b/,
  /\boutside (?:of )?(?:his |the |lorenzo's )?(?:cv|curriculum vitae|curriculum)\b/,
  /\bal di la (?:della |dalla |del |di )?(?:sua |suo )?(?:carriera|vita professionale|curriculum|lavoro)\b/,
  /\bal di fuori (?:del |della |dal |dalla |di )?(?:suo |sua )?(?:curriculum|cv|lavoro|carriera|vita professionale)\b/,
  /\b(?:his |lorenzo's |personal )passions?\b/,
  /\binteressi e (?:le )?passioni\b/,
  /\bpassioni personali\b/,
  /\b(?:sue |le sue )passioni\b/,
  /\bpassioni di lorenzo\b/,
];

/** Requests for a hidden feature, or a professional topic wearing a hobby word. */
const VETO = [
  /\beaster\s*egg\b/,
  /\bsecrets?\b/,
  /\bsegret[oi]\b/,
  /\bunexpected\b/,
  /\binaspettat[oa]\b/,
  /\bsurprise me\b/,
  /\bsorprendimi\b/,
  /\bpersonalit/,
  /\b(?:good|natural|buon) leader\b/,
  /\bteam fit\b/,
  /\bbeyond banking\b/,
  /\bbeyond europe\b/,
  /\bprofessional interests?\b/,
  /\bcareer interests?\b/,
  /\binteressi professionali\b/,
  /\binteressi di carriera\b/,
  /\bpassioni professionali\b/,
  /\bprofessional passions?\b/,
  /\bcareer aspirations?\b/,
  /\baspirazioni professionali\b/,
  /\b(?:internal audit|it audit|technology risk|ai governance|information security|cisa|crisc|dora|certification|technical projects?)\b/,
  /\b(?:salary|stipendio|relationship|fidanzat|home address|phone number)\b/,
];

/**
 * @param {string} question
 * @returns {boolean}
 */
export function isBeyondCvEligible(question) {
  const normalized = normalize(question);
  if (!normalized.trim()) return false;
  if (VETO.some((pattern) => pattern.test(normalized))) return false;
  return OUTSIDE_FRAME.some((pattern) => pattern.test(normalized));
}
