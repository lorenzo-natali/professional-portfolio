/**
 * Reversible iOS-safe page lock while the AR experience is open.
 * Preserves scroll position and restores html/body styles on unlock.
 *
 * Do NOT use body { position: fixed }. On iOS Safari a fixed body becomes a
 * containing block / layout root that can leave a persistent right-edge gap
 * even when the AR portal is parented under <html>.
 */
export function lockArPage() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  const html = document.documentElement;
  const body = document.body;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  const scrollY = window.scrollY || window.pageYOffset || 0;

  const previous = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    htmlTouchAction: html.style.touchAction,
    htmlHeight: html.style.height,
    htmlWidth: html.style.width,
    htmlTransform: html.style.transform,
    htmlFilter: html.style.filter,
    htmlPerspective: html.style.perspective,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyTouchAction: body.style.touchAction,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyBottom: body.style.bottom,
    bodyWidth: body.style.width,
    bodyHeight: body.style.height,
    bodyMaxWidth: body.style.maxWidth,
    bodyMargin: body.style.margin,
    bodyPadding: body.style.padding,
    bodyPaddingRight: body.style.paddingRight,
    bodyTransform: body.style.transform,
    bodyFilter: body.style.filter,
    bodyPerspective: body.style.perspective,
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.style.touchAction = "none";
  html.style.height = "100%";
  html.style.width = "100%";
  html.style.transform = "none";
  html.style.filter = "none";
  html.style.perspective = "none";

  // Keep body in normal flow — only freeze scroll/overscroll.
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.touchAction = "none";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.bottom = "";
  body.style.width = "100%";
  body.style.maxWidth = "none";
  body.style.height = "";
  body.style.margin = "0";
  body.style.padding = "0";
  body.style.transform = "none";
  body.style.filter = "none";
  body.style.perspective = "none";

  // Freeze visual scroll without taking body out of flow.
  window.scrollTo(0, 0);

  let unlocked = false;
  return () => {
    if (unlocked) return;
    unlocked = true;

    html.style.overflow = previous.htmlOverflow;
    html.style.overscrollBehavior = previous.htmlOverscroll;
    html.style.touchAction = previous.htmlTouchAction;
    html.style.height = previous.htmlHeight;
    html.style.width = previous.htmlWidth;
    html.style.transform = previous.htmlTransform;
    html.style.filter = previous.htmlFilter;
    html.style.perspective = previous.htmlPerspective;

    body.style.overflow = previous.bodyOverflow;
    body.style.overscrollBehavior = previous.bodyOverscroll;
    body.style.touchAction = previous.bodyTouchAction;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.bottom = previous.bodyBottom;
    body.style.width = previous.bodyWidth;
    body.style.height = previous.bodyHeight;
    body.style.maxWidth = previous.bodyMaxWidth;
    body.style.margin = previous.bodyMargin;
    body.style.padding = previous.bodyPadding;
    body.style.paddingRight = previous.bodyPaddingRight;
    body.style.transform = previous.bodyTransform;
    body.style.filter = previous.bodyFilter;
    body.style.perspective = previous.bodyPerspective;

    window.scrollTo(scrollX, scrollY);
  };
}

/**
 * Mark the portfolio root inert so it cannot receive pointer/focus while AR is open.
 * @param {HTMLElement | null} root
 */
export function setPortfolioInert(root, inert) {
  if (!root) return;
  if (inert) {
    root.setAttribute("inert", "");
    root.setAttribute("aria-hidden", "true");
    root.style.pointerEvents = "none";
  } else {
    root.removeAttribute("inert");
    root.removeAttribute("aria-hidden");
    root.style.pointerEvents = "";
  }
}
