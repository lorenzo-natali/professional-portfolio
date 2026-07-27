/**
 * Authoring-only keyboard layout editor loader.
 * Imported only from DEV / authoring builds (see MindARTrackingAdapter).
 * Public production builds resolve this path to interestLayoutKeyboard.stub.js.
 */
import { AR_INTERESTS_DEBUG } from "../arDebug";
import {
  createInterestObjectsDebug,
  isInterestObjectsDebugEnabled,
} from "../createInterestObjectsDebug";

/**
 * @returns {{
 *   enabled: boolean,
 *   create: null | typeof createInterestObjectsDebug,
 * }}
 */
export function loadInterestLayoutKeyboard() {
  const enabled = isInterestObjectsDebugEnabled({ forceFlag: AR_INTERESTS_DEBUG });
  return {
    enabled,
    create: enabled ? createInterestObjectsDebug : null,
  };
}
