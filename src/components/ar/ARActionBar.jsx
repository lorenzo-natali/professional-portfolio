import { AR_VCARD_SRC } from "./arConfig";

export default function ARActionBar({ onBack, onExploreProjects, onOpenAbout }) {
  const saveContact = () => {
    const link = document.createElement("a");
    link.href = AR_VCARD_SRC;
    link.download = "Lorenzo_Natali.vcf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-400"
      >
        Back to Portfolio
      </button>
      <button
        type="button"
        onClick={onExploreProjects}
        className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60"
      >
        Explore Projects
      </button>
      <button
        type="button"
        onClick={saveContact}
        className="rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-400"
      >
        Save Contact
      </button>
      <button
        type="button"
        onClick={onOpenAbout}
        className="rounded-md border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
        aria-label="About this experience"
      >
        About
      </button>
    </div>
  );
}
