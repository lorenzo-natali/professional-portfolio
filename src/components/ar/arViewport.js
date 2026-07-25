/**
 * Single AR viewport shell sizing authority (visualViewport when available).
 * Uses left/top offsets — not transform — so descendants are not trapped.
 * @param {HTMLElement | null} shell
 */
export function syncArViewportShell(shell) {
  if (!shell || typeof window === "undefined") return;

  const vv = window.visualViewport;
  const width = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const height = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  const offsetLeft = Math.round(vv?.offsetLeft ?? 0);
  const offsetTop = Math.round(vv?.offsetTop ?? 0);

  shell.style.position = "fixed";
  shell.style.left = `${offsetLeft}px`;
  shell.style.top = `${offsetTop}px`;
  shell.style.right = "auto";
  shell.style.bottom = "auto";
  shell.style.width = `${width}px`;
  shell.style.height = `${height}px`;
  shell.style.maxWidth = "none";
  shell.style.maxHeight = "none";
  shell.style.margin = "0";
  shell.style.transform = "none";
  shell.style.overflow = "hidden";
  shell.style.inset = "auto";
}

/**
 * Bind resize / orientation / visualViewport listeners. Returns cleanup.
 * @param {() => void} onChange
 */
export function bindArViewportListeners(onChange) {
  if (typeof window === "undefined") return () => {};

  let frame = 0;
  const run = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => onChange());
  };

  window.addEventListener("resize", run);
  window.addEventListener("orientationchange", run);
  window.visualViewport?.addEventListener("resize", run);
  window.visualViewport?.addEventListener("scroll", run);

  run();

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", run);
    window.removeEventListener("orientationchange", run);
    window.visualViewport?.removeEventListener("resize", run);
    window.visualViewport?.removeEventListener("scroll", run);
  };
}

/**
 * Read the shell box used as MindAR sizing authority.
 * @param {HTMLElement | null} shell
 */
export function getArShellRect(shell) {
  if (!shell) return null;
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  const rect = shell.getBoundingClientRect();
  return {
    width,
    height,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}
