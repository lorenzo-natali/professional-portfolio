/**
 * Keep the AR camera shell locked to the visible viewport (iOS Safari safe).
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
  shell.style.left = "0px";
  shell.style.top = "0px";
  shell.style.right = "auto";
  shell.style.bottom = "auto";
  shell.style.width = `${width}px`;
  shell.style.height = `${height}px`;
  shell.style.maxWidth = "100vw";
  shell.style.maxHeight = "100dvh";
  shell.style.overflow = "hidden";
  shell.style.transform = `translate(${offsetLeft}px, ${offsetTop}px)`;
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
