import { GraduationCap } from "lucide-react";
import { education } from "../portfolioData.js";
import { AcademicFocusInfo, Section, SurfaceCard } from "../portfolioUi.jsx";

export default function EducationSection() {
  return (
      <Section id="education" title="Education" className="bg-slate-950/80">
        <div className="education-rail -mx-4 -mt-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-2 sm:px-2">
          {education.map((item) => (
            <SurfaceCard
              key={item.degree}
              data-role-lens-id={item.id}
              className="flex w-[78%] shrink-0 snap-start flex-col p-5 sm:w-[20rem]"
            >
              <GraduationCap className="mb-4 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium text-slate-400">{item.period}</p>
              <h3 className="mt-3 text-base font-semibold leading-6 text-slate-50">
                {item.degree}
                {item.focus && <AcademicFocusInfo id={`${item.id}-focus`} text={item.focus} />}
              </h3>
              {item.qualifier && (
                <p className="mt-1.5 text-sm font-medium text-slate-400">{item.qualifier}</p>
              )}
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.school}</p>
              {item.detail && (
                <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-400">{item.detail}</p>
              )}
            </SurfaceCard>
          ))}
        </div>
      </Section>
  );
}
