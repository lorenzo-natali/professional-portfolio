/**
 * Reversible iOS-safe page lock while the AR experience is open.
 * Preserves scroll position and restores html/body styles on unlock.
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
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyTouchAction: body.style.touchAction,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyHeight: body.style.height,
    bodyPaddingRight: body.style.paddingRight,
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.style.touchAction = "none";
  html.style.height = "100%";

  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.touchAction = "none";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = `-${scrollX}px`;
  body.style.right = "0px";
  body.style.width = "100%";
  body.style.height = "100%";

  let unlocked = false;
  return () => {
    if (unlocked) return;
    unlocked = true;

    html.style.overflow = previous.htmlOverflow;
    html.style.overscrollBehavior = previous.htmlOverscroll;
    html.style.touchAction = previous.htmlTouchAction;
    html.style.height = previous.htmlHeight;

    body.style.overflow = previous.bodyOverflow;
    body.style.overscrollBehavior = previous.bodyOverscroll;
    body.style.touchAction = previous.bodyTouchAction;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.width = previous.bodyWidth;
    body.style.height = previous.bodyHeight;
    body.style.paddingRight = previous.bodyPaddingRight;

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
