import { motion } from "framer-motion";
import linkedinLogo from "../../assets/linkedin-logo.png";
import { trackPortfolioEvent } from "../analytics/createPortfolioAnalytics.js";
import { languageItems, stackStreams } from "../portfolioData.js";
import TickerStream from "../TickerStream.jsx";

export default function HeroSection({ selectedLens = "Overview", sidebarSlot = null }) {
  return (
    <section id="hero" className="relative overflow-x-hidden bg-slate-950 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.9),transparent_42%)]" />
        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 text-sm font-medium uppercase tracking-[0.32em] text-cyan-300"
            >
              Professional Portfolio
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl text-5xl font-semibold tracking-tight !text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl"
            >
              Lorenzo Natali <span className="align-baseline text-3xl font-medium text-white sm:text-4xl lg:text-5xl">那罗成</span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-5 text-xl font-medium !text-slate-300 sm:text-2xl"
            >
              Banking Risk &amp; Controls | Technology &amp; Information Security Governance | AI Governance
            </motion.h2>

            {/* pt/pb not mt/mb: index.css `p { margin: 0 }` overrides Tailwind margin utilities on paragraphs. */}
            <p className="max-w-3xl pt-3 pb-6 text-sm leading-6 !text-white sm:text-base sm:leading-7">
              <span className="font-medium">Currently IT Audit Specialist</span>
              <span className="font-normal"> at Banca Profilo · Milan</span>
            </p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="max-w-3xl space-y-4 text-base leading-8 text-slate-300 sm:text-lg"
            >
              <p>
                I position my profile at the intersection of banking risk, technology &amp; information security
                governance and AI governance, with internal audit and assurance as the connecting backbone that ties
                financial risk, control thinking and emerging technology risks together.
              </p>
              <p>
                This interactive portfolio maps my experience, projects, skills and professional direction, showing how
                these areas connect and evolve across my career.
              </p>
            </motion.div>

            <div className="mt-9 max-w-4xl space-y-3">
              {stackStreams.map((stream) => (
                <TickerStream key={stream.label} stream={stream} selectedLens={selectedLens} />
              ))}
            </div>

            <div className="language-grid mt-5 grid max-w-4xl gap-3">
              {languageItems.map((item) => (
                <div
                  key={item.language}
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-950/25 px-3.5 py-3 backdrop-blur"
                >
                  <div className="language-flag shrink-0" aria-hidden="true">
                    <span>{item.flag}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-100">{item.language}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.level}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="https://www.linkedin.com/in/natalilorenzo/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackPortfolioEvent("outbound_click", { target: "linkedin" });
                }}
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/35 bg-slate-950/55 px-5 py-3.5 text-left font-semibold text-slate-100 shadow-lg shadow-black/50 transition hover:border-white/60 hover:bg-slate-900/75 hover:text-white hover:shadow-black/70"
              >
                <img
                  src={linkedinLogo}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 rounded object-cover"
                />
                <span className="flex flex-col leading-none">
                  <span>Connect on LinkedIn</span>
                  <span className="mt-1 text-xs font-normal text-slate-400">Request CV or discuss opportunities</span>
                </span>
              </a>
              <a
                href="https://github.com/lorenzo-natali"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackPortfolioEvent("outbound_click", { target: "github" });
                }}
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/35 bg-slate-950/55 px-5 py-3.5 text-left font-semibold text-slate-100 shadow-lg shadow-black/50 transition hover:border-white/60 hover:bg-slate-900/75 hover:text-white hover:shadow-black/70"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0 fill-current text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.16)]">
                  <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.51.47-3.16-.63-3.36-1.21-.11-.3-.6-1.21-1.03-1.46-.35-.19-.85-.66-.01-.67.79-.01 1.35.74 1.54 1.05.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.11.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.24 9.24 0 0 1 12 6.98c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.05.36.32.68.93.68 1.89 0 1.37-.01 2.47-.01 2.82 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
                </svg>
                <span className="flex flex-col leading-none">
                  <span>GitHub Profile</span>
                  <span className="mt-1 text-xs font-normal text-slate-400">View projects and code</span>
                </span>
              </a>
            </div>
          </div>
          <div className="flex w-full flex-col gap-14 lg:w-[320px]">
            {sidebarSlot}
          </div>
        </div>
      </section>
  );
}
