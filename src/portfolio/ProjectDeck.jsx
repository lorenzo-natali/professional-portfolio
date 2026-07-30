import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import CodeiakMascotVideo from "../components/CodeiakMascotVideo";
import { projects } from "./portfolioData.js";
import { lensSurfaceClass } from "./portfolioLens.js";
import { ProjectStageIndicator, SurfaceCard } from "./portfolioUi.jsx";

const slideVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
  }),
};

export default function ProjectDeck({ selectedLens = "Overview" }) {
  const [activeProject, setActiveProject] = useState(0);
  const [direction, setDirection] = useState(1);
  const project = projects[activeProject];
  const isCodeiakProject = project.id === "project-codeiak";

  const showPrevious = () => {
    setDirection(-1);
    setActiveProject((current) => (current === 0 ? projects.length - 1 : current - 1));
  };

  const showNext = () => {
    setDirection(1);
    setActiveProject((current) => (current === projects.length - 1 ? 0 : current + 1));
  };

  const showProject = (index) => {
    if (index === activeProject) return;
    setDirection(index > activeProject ? 1 : -1);
    setActiveProject(index);
  };

  useEffect(() => {
    const handleActivateProject = (event) => {
      const index = projects.findIndex((item) => item.id === event.detail);
      if (index < 0) return;
      setDirection(1);
      setActiveProject(index);
    };
    window.addEventListener("assistant:activate-project", handleActivateProject);
    return () =>
      window.removeEventListener("assistant:activate-project", handleActivateProject);
  }, []);

  const projectLensClass = lensSurfaceClass(selectedLens, "projects", project.id, "cyan");

  return (
    <SurfaceCard data-role-lens-id={project.id} className={`overflow-hidden ${projectLensClass}`}>
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Project Deck</p>
          <p className="mt-1 text-sm text-slate-400">
            {activeProject + 1} / {projects.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Previous project"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/45 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next project"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/45 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-[330px] overflow-hidden p-5 sm:min-h-[300px] sm:p-7">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={project.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <p className="text-sm font-medium text-cyan-300/90">{project.status}</p>
              <ProjectStageIndicator stage={project.stage} />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 sm:mt-3">{project.title}</h3>
            <p className="mt-6 max-w-3xl leading-7 text-slate-300 sm:mt-5">{project.text}</p>

            {isCodeiakProject && (
              <div className="codeiak-project-mascot">
                <CodeiakMascotVideo size={336} />
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2 sm:mt-6">
              {project.tech.map((tech) => (
                <span key={tech} className="rounded-md border border-slate-700/70 bg-slate-950/45 px-3 py-1.5 text-xs text-slate-300">
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:mt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {projects.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => showProject(index)}
                    aria-label={`Show project ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeProject ? "w-8 bg-cyan-300" : "w-2.5 bg-slate-700 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>

              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-400/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  View repository
                </a>
              )}
              {!project.link && project.repositoryStatus && (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/45 px-4 py-2.5 text-sm font-medium text-slate-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  {project.repositoryStatus}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </SurfaceCard>
  );
}
