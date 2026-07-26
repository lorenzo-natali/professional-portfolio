import {
  PORTFOLIO_BUILD_ID,
  PORTFOLIO_BUILD_TIME,
  PORTFOLIO_COMMIT,
  publishPortfolioBuildId,
} from "./arBuildId";
import { getArRuntimeFlags } from "./arRuntimeFlags";
import { collectArViewportMetrics, recordArViewportLifecycle } from "./arViewport";

const SELECTORS = {
  html: "html",
  body: "body",
  root: "#root",
  portalHost: "[data-ar-portal-host='true']",
  shell: "[data-ar-viewport-shell='true']",
  stage: "[data-ar-camera-stage='true']",
  container: "[data-ar-tracking-container='true']",
  video: "[data-ar-tracking-container='true'] video",
  canvas: "[data-ar-tracking-container='true'] canvas",
  css3d: "[data-ar-tracking-container='true'] > div",
  overlay: "[data-ar-ui-overlay='true']",
  calibrateUi: "[data-ar-interests-calibrate-ui='true']",
  calibrateHit: "[data-ar-calibrate-hit='true']",
  calibrateEarly: "[data-ar-calibrate-early-banner='true']",
};

/** @type {Array<Record<string, unknown>>} */
const lifecycleLog = [];
/** @type {Array<Record<string, unknown>>} */
const mutationLog = [];
/** @type {Array<Record<string, unknown>>} */
const errorLog = [];
/** @type {Record<string, unknown>} */
const runtimeState = {
  arComponent: null,
  trackingAdapter: null,
  calibrationModuleLoaded: false,
  calibrationUiMounted: false,
  calibrationControllerCreated: false,
  calibrationListenersInstalled: false,
  calibrateSkipReason: null,
  screen: null,
};

function pushLifecycle(phase, extra = {}) {
  const entry = {
    phase,
    timestamp: Date.now(),
    href: typeof location !== "undefined" ? location.href : "",
    ...extra,
  };
  lifecycleLog.push(entry);
  if (lifecycleLog.length > 80) lifecycleLog.splice(0, lifecycleLog.length - 80);
  if (typeof window !== "undefined") {
    window.__arRuntimeAuditLifecycle = lifecycleLog;
  }
  console.info("[ar-runtime-audit]", phase, extra);
  return entry;
}

/**
 * Snapshot one element's geometry + containing-block-relevant styles.
 * @param {Element | null} el
 */
export function snapshotElement(el) {
  if (!el || !(el instanceof Element)) return null;
  const rect = el.getBoundingClientRect();
  const cs = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
  const htmlEl = /** @type {HTMLElement} */ (el);
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || "",
    className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
    dataset: { .../** @type {HTMLElement} */ (el).dataset },
    offsetParent: htmlEl.offsetParent
      ? `${htmlEl.offsetParent.tagName.toLowerCase()}${htmlEl.offsetParent.id ? `#${htmlEl.offsetParent.id}` : ""}`
      : null,
    clientWidth: htmlEl.clientWidth,
    clientHeight: htmlEl.clientHeight,
    offsetWidth: htmlEl.offsetWidth,
    offsetHeight: htmlEl.offsetHeight,
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    },
    inline: {
      width: htmlEl.style?.width || "",
      height: htmlEl.style?.height || "",
      left: htmlEl.style?.left || "",
      right: htmlEl.style?.right || "",
      top: htmlEl.style?.top || "",
      bottom: htmlEl.style?.bottom || "",
      maxWidth: htmlEl.style?.maxWidth || "",
      transform: htmlEl.style?.transform || "",
      position: htmlEl.style?.position || "",
      overflow: htmlEl.style?.overflow || "",
    },
    computed: cs
      ? {
          position: cs.position,
          display: cs.display,
          width: cs.width,
          height: cs.height,
          maxWidth: cs.maxWidth,
          left: cs.left,
          right: cs.right,
          top: cs.top,
          bottom: cs.bottom,
          padding: cs.padding,
          margin: cs.margin,
          transform: cs.transform,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          boxSizing: cs.boxSizing,
          contain: cs.contain,
          filter: cs.filter,
          perspective: cs.perspective,
          clipPath: cs.clipPath,
          willChange: cs.willChange,
          zIndex: cs.zIndex,
        }
      : null,
  };
}

function collectElements() {
  /** @type {Record<string, ReturnType<typeof snapshotElement>>} */
  const elements = {};
  Object.entries(SELECTORS).forEach(([key, selector]) => {
    const el =
      key === "html"
        ? document.documentElement
        : key === "body"
          ? document.body
          : document.querySelector(selector);
    elements[key] = snapshotElement(el);
  });
  return elements;
}

function classifyViewportGaps(elements) {
  const docW = document.documentElement.clientWidth;
  const innerW = window.innerWidth;
  const vv = window.visualViewport;
  const shell = elements.shell?.rect;
  const container = elements.container?.rect;
  const video = elements.video?.rect;
  const canvas = elements.canvas?.rect;
  const portal = elements.portalHost?.rect;

  /** @type {Record<string, "confirmed" | "excluded" | "unverifiable">} */
  const hypotheses = {
    A_portalShellNarrowerThanViewport: "unverifiable",
    B_containerOkVideoCanvasNarrow: "unverifiable",
    C_containerTranslatedLeft: "unverifiable",
    D_videoCoverCanvasMisaligned: "unverifiable",
    E_portfolioVisibleThroughTransformedAncestor: "unverifiable",
    F_visualViewportDiffers: "unverifiable",
    G_lifecycleShrinkLater: "unverifiable",
    H_staleBuild: "unverifiable",
  };

  if (shell) {
    const narrow = shell.width < docW - 2 || shell.right < docW - 2;
    hypotheses.A_portalShellNarrowerThanViewport = narrow ? "confirmed" : "excluded";
  }
  if (container && video && canvas) {
    const videoNarrow = video.width < container.width - 4;
    const canvasNarrow = canvas.width < container.width - 2;
    hypotheses.B_containerOkVideoCanvasNarrow =
      !hypotheses.A_portalShellNarrowerThanViewport ||
      hypotheses.A_portalShellNarrowerThanViewport === "excluded"
        ? videoNarrow || canvasNarrow
          ? "confirmed"
          : "excluded"
        : "unverifiable";
  }
  if (container) {
    hypotheses.C_containerTranslatedLeft = container.left < -1 ? "confirmed" : "excluded";
  }
  if (video && canvas && container) {
    const misaligned =
      Math.abs(canvas.left - container.left) > 2 ||
      Math.abs(canvas.width - container.width) > 2;
    hypotheses.D_videoCoverCanvasMisaligned = misaligned ? "confirmed" : "excluded";
  }
  if (portal && elements.body?.computed) {
    const bodyFixed = elements.body.computed.position === "fixed";
    const portalParentIsHtml =
      document.querySelector(SELECTORS.portalHost)?.parentElement === document.documentElement;
    hypotheses.E_portfolioVisibleThroughTransformedAncestor =
      bodyFixed && !portalParentIsHtml ? "confirmed" : portalParentIsHtml ? "excluded" : "unverifiable";
  }
  if (vv) {
    hypotheses.F_visualViewportDiffers =
      Math.abs(vv.width - innerW) > 1 || Math.abs(vv.offsetLeft) > 0.5
        ? "confirmed"
        : "excluded";
  }

  const gapRight = shell ? docW - shell.right : null;
  return {
    docW,
    innerW,
    gapRight,
    hypotheses,
    portalParent:
      document.querySelector(SELECTORS.portalHost)?.parentElement?.tagName?.toLowerCase() ?? null,
  };
}

async function collectServiceWorkerInfo() {
  const out = {
    controller: null,
    registrations: /** @type {unknown[]} */ ([]),
    cacheNames: /** @type {string[]} */ ([]),
  };
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return { ...out, supported: false };
  }
  out.supported = true;
  out.controller = navigator.serviceWorker.controller
    ? {
        scriptURL: navigator.serviceWorker.controller.scriptURL,
        state: navigator.serviceWorker.controller.state,
      }
    : null;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    out.registrations = regs.map((r) => ({
      scope: r.scope,
      active: r.active?.scriptURL ?? null,
      waiting: r.waiting?.scriptURL ?? null,
    }));
  } catch (error) {
    errorLog.push({ type: "sw-registrations", message: String(error) });
  }
  try {
    if (typeof caches !== "undefined") {
      out.cacheNames = await caches.keys();
    }
  } catch (error) {
    errorLog.push({ type: "caches", message: String(error) });
  }
  return out;
}

function collectBundleUrls() {
  return [...document.querySelectorAll("script[src], link[rel='modulepreload'], link[rel='stylesheet']")]
    .map((node) => {
      if (node instanceof HTMLScriptElement) return node.src;
      if (node instanceof HTMLLinkElement) return node.href;
      return "";
    })
    .filter(Boolean);
}

/**
 * Build the copyable audit report.
 */
export async function buildArRuntimeAuditReport() {
  const flags = getArRuntimeFlags();
  publishPortfolioBuildId();
  const elements = collectElements();
  const gap = classifyViewportGaps(elements);
  const metrics = collectArViewportMetrics(
    document.querySelector(SELECTORS.shell),
    { phase: "runtime-audit" },
  );
  const sw = await collectServiceWorkerInfo();

  runtimeState.calibrationUiMounted = Boolean(document.querySelector(SELECTORS.calibrateUi));
  runtimeState.calibrationModuleLoaded = Boolean(
    window.__arInterestsCalibrate || runtimeState.calibrationControllerCreated,
  );

  return {
    build: {
      id: PORTFOLIO_BUILD_ID,
      commit: PORTFOLIO_COMMIT,
      builtAt: PORTFOLIO_BUILD_TIME,
      bundleUrls: collectBundleUrls(),
      metaBuildId:
        document.querySelector('meta[name="portfolio-build-id"]')?.getAttribute("content") ?? null,
    },
    location: {
      href: location.href,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      origin: location.origin,
      referrer: document.referrer || "",
    },
    flags: {
      arRuntimeAudit: flags.arRuntimeAudit,
      arInterestsCalibrate: flags.arInterestsCalibrate,
      arViewportDebug: flags.arViewportDebug,
      source: flags.source,
      calibrateSource: flags.calibrateSource,
      capturedAt: flags.capturedAt,
      initialHref: flags.href,
      currentMatchesInitialSearch:
        location.search === flags.search ||
        new URLSearchParams(location.search).get("arInterestsCalibrate") ===
          new URLSearchParams(flags.search).get("arInterestsCalibrate"),
    },
    runtime: { ...runtimeState },
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentClientWidth: document.documentElement.clientWidth,
      documentClientHeight: document.documentElement.clientHeight,
      visualViewport: window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            offsetLeft: window.visualViewport.offsetLeft,
            offsetTop: window.visualViewport.offsetTop,
            scale: window.visualViewport.scale,
          }
        : null,
      userAgent: navigator.userAgent,
      gapAnalysis: gap,
      elements,
      metrics,
    },
    lifecycle: [...lifecycleLog],
    mutations: [...mutationLog].slice(-60),
    serviceWorker: sw,
    localStorageKeys: (() => {
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    })(),
    sessionStorageKeys: (() => {
      try {
        return Object.keys(sessionStorage);
      } catch {
        return [];
      }
    })(),
    errors: [...errorLog],
  };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      ta.remove();
    }
  }
}

/**
 * @param {{ enabled?: boolean }} [options]
 */
export function createArRuntimeAudit(options = {}) {
  const flags = getArRuntimeFlags();
  const enabled = Boolean(options.enabled ?? flags.arRuntimeAudit);
  if (!enabled || typeof document === "undefined") {
    return {
      enabled: false,
      dispose() {},
      recordPhase() {},
      setRuntime() {},
      buildReport: async () => null,
    };
  }

  publishPortfolioBuildId();
  pushLifecycle("audit-enabled", { buildId: PORTFOLIO_BUILD_ID });

  // With calibrate, keep a single small control — the multiline badge covers the scene.
  const compactWithCalibrate = Boolean(flags.arInterestsCalibrate);

  const host = document.createElement("div");
  host.dataset.arRuntimeAuditUi = "true";
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "right:0",
    "bottom:0",
    "top:0",
    "z-index:2147483646",
    "pointer-events:none",
    "font:11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
    "color:#e2e8f0",
  ].join(";");

  const badge = document.createElement("div");
  badge.style.cssText = [
    "pointer-events:none",
    "margin:0.4rem",
    "padding:0.45rem 0.6rem",
    "border-radius:0.4rem",
    "background:rgba(127,29,29,0.92)",
    "color:#fef2f2",
    "font-weight:700",
    "letter-spacing:0.04em",
    "display:" + (compactWithCalibrate ? "none" : "inline-block"),
    "max-width:min(96vw,28rem)",
    "white-space:pre-wrap",
  ].join(";");
  host.appendChild(badge);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = compactWithCalibrate ? "Audit" : "Copy runtime audit";
  copyBtn.style.cssText = compactWithCalibrate
    ? [
        "pointer-events:auto",
        "position:absolute",
        "right:0.45rem",
        "top:max(0.4rem,env(safe-area-inset-top))",
        "padding:0.35rem 0.55rem",
        "border-radius:0.35rem",
        "border:1px solid rgba(252,165,165,0.45)",
        "background:rgba(69,10,10,0.9)",
        "color:#fff1f2",
        "font:11px/1.2 ui-sans-serif, system-ui, sans-serif",
        "font-weight:700",
      ].join(";")
    : [
        "pointer-events:auto",
        "position:absolute",
        "right:0.5rem",
        "bottom:0.5rem",
        "padding:0.55rem 0.75rem",
        "border-radius:0.45rem",
        "border:1px solid rgba(252,165,165,0.55)",
        "background:rgba(69,10,10,0.95)",
        "color:#fff1f2",
        "font:12px/1.2 ui-sans-serif, system-ui, sans-serif",
        "font-weight:700",
      ].join(";");
  host.appendChild(copyBtn);

  function refreshBadge() {
    const f = getArRuntimeFlags();
    const shell = document.querySelector(SELECTORS.shell);
    const gapRight = shell
      ? (document.documentElement.clientWidth - shell.getBoundingClientRect().right).toFixed(1)
      : "?";
    badge.textContent = [
      `BUILD ${PORTFOLIO_BUILD_ID}`,
      `calibrate=${f.arInterestsCalibrate} (${f.calibrateSource})`,
      `adapter=${runtimeState.trackingAdapter || "—"} screen=${runtimeState.screen || "—"}`,
      `calibUI=${Boolean(document.querySelector(SELECTORS.calibrateUi))} gapR=${gapRight}px`,
      `${location.pathname}${location.search}`,
    ].join("\n");
  }

  const timers = [0, 100, 500, 1000].map((ms) =>
    window.setTimeout(() => {
      pushLifecycle(`t+${ms}ms`, {
        elements: collectElements(),
        gap: classifyViewportGaps(collectElements()),
      });
      refreshBadge();
    }, ms),
  );

  const onResize = () => {
    pushLifecycle("visualViewport-or-resize", {
      gap: classifyViewportGaps(collectElements()),
    });
    refreshBadge();
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => {
    pushLifecycle(document.visibilityState === "visible" ? "foreground" : "background");
    refreshBadge();
  });

  const mo = new MutationObserver((records) => {
    records.forEach((record) => {
      if (!(record.target instanceof HTMLElement)) return;
      const el = record.target;
      if (
        !el.closest?.(
          "[data-ar-portal-host],[data-ar-viewport-shell],[data-ar-tracking-container],.ar-portal-host,.ar-viewport-shell,.ar-tracking-container",
        ) &&
        el !== document.body &&
        el !== document.documentElement
      ) {
        return;
      }
      mutationLog.push({
        timestamp: Date.now(),
        tag: el.tagName.toLowerCase(),
        id: el.id,
        attr: record.attributeName,
        className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
        inline: {
          width: el.style.width,
          height: el.style.height,
          left: el.style.left,
          right: el.style.right,
          top: el.style.top,
          transform: el.style.transform,
          position: el.style.position,
        },
        rect: (() => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, height: r.height };
        })(),
      });
      if (mutationLog.length > 120) mutationLog.splice(0, mutationLog.length - 120);
    });
  });
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
    subtree: true,
  });

  const onError = (event) => {
    errorLog.push({
      type: "window.error",
      message: event.message || String(event.error || "error"),
      timestamp: Date.now(),
    });
  };
  window.addEventListener("error", onError);

  async function onCopy(event) {
    event.preventDefault();
    event.stopPropagation();
    const report = await buildArRuntimeAuditReport();
    window.__arRuntimeAuditReport = report;
    const text = JSON.stringify(report, null, 2);
    const ok = await copyText(text);
    copyBtn.textContent = ok ? "Copied ✓" : "Copy failed — see console";
    if (!ok) console.info("[ar-runtime-audit] report\n", report);
    window.setTimeout(() => {
      copyBtn.textContent = "Copy runtime audit";
    }, 1800);
  }
  copyBtn.addEventListener("click", onCopy);

  document.documentElement.appendChild(host);
  refreshBadge();
  const badgeTimer = window.setInterval(refreshBadge, 500);

  window.__arRuntimeAudit = {
    buildReport: buildArRuntimeAuditReport,
    recordPhase: pushLifecycle,
    setRuntime: (patch) => Object.assign(runtimeState, patch),
    getRuntime: () => ({ ...runtimeState }),
  };

  return {
    enabled: true,
    recordPhase: pushLifecycle,
    setRuntime(patch) {
      Object.assign(runtimeState, patch);
      refreshBadge();
    },
    buildReport: buildArRuntimeAuditReport,
    dispose() {
      timers.forEach((id) => clearTimeout(id));
      clearInterval(badgeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("error", onError);
      copyBtn.removeEventListener("click", onCopy);
      mo.disconnect();
      host.remove();
      if (window.__arRuntimeAudit) delete window.__arRuntimeAudit;
    },
  };
}

export function isArRuntimeAuditEnabled({
  forceFlag = false,
} = {}) {
  if (forceFlag) return true;
  return Boolean(getArRuntimeFlags().arRuntimeAudit);
}

export function recordArRuntimeAuditPhase(phase, extra) {
  const flags = getArRuntimeFlags();
  if (!flags.arRuntimeAudit) {
    // Still mirror into viewport lifecycle for continuity when debug is on.
    if (flags.arViewportDebug) recordArViewportLifecycle(null, phase, extra);
    return null;
  }
  return pushLifecycle(phase, extra);
}

export function setArRuntimeAuditState(patch) {
  Object.assign(runtimeState, patch);
  if (typeof window !== "undefined" && window.__arRuntimeAudit?.setRuntime) {
    window.__arRuntimeAudit.setRuntime(patch);
  }
}
