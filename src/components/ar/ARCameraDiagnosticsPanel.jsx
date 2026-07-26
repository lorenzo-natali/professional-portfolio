import { useMemo, useState } from "react";
import { formatCameraDiagnosticsSummary } from "./arCameraDiagnostics";

/**
 * Compact temporary diagnostics panel (debug flag only).
 * Placed top-left so it avoids the central CV framing area.
 */
export default function ARCameraDiagnosticsPanel({ snapshot }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => formatCameraDiagnosticsSummary(snapshot), [snapshot]);

  if (!snapshot) return null;

  const copy = async () => {
    const payload = JSON.stringify(snapshot, null, 2);
    try {
      await navigator.clipboard?.writeText?.(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for environments without clipboard permissions.
      const area = document.createElement("textarea");
      area.value = payload;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      data-ar-camera-diagnostics="true"
      className="pointer-events-auto absolute left-2 top-[max(0.5rem,env(safe-area-inset-top))] z-40 max-w-[min(18rem,calc(100vw-1rem))] rounded border border-slate-600/80 bg-slate-950/85 text-[10px] leading-snug text-slate-100 shadow-md backdrop-blur-[1px]"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 px-2 py-1">
        <p className="font-medium tracking-wide text-amber-200/90">AR camera debug</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            className="rounded px-1.5 py-0.5 text-[9px] text-slate-200 hover:bg-slate-800"
          >
            {copied ? "Copied" : "Copy diagnostics"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="rounded px-1.5 py-0.5 text-[9px] text-slate-300 hover:bg-slate-800"
            aria-expanded={!collapsed}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <pre className="m-0 whitespace-pre-wrap px-2 py-1.5 text-[10px] text-slate-100">{summary}</pre>
      )}
    </div>
  );
}
