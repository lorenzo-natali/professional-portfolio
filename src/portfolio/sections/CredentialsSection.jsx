import { Award } from "lucide-react";
import { additionalTraining, credentials } from "../portfolioData.js";
import { isOverviewLens, lensSurfaceClass } from "../portfolioLens.js";
import { Section, SurfaceCard } from "../portfolioUi.jsx";
import { PORTFOLIO_SECTION_TITLES } from "../sectionCatalog.js";

export default function CredentialsSection({ selectedLens = "Overview" }) {
  const additionalTrainingLensClass = isOverviewLens(selectedLens)
    ? ""
    : "opacity-55";

  return (
      <Section id="credentials" title={PORTFOLIO_SECTION_TITLES.credentials} className="bg-slate-950/80">
        <div className="credentials-rail -mx-4 -mt-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-2 sm:px-2">
          {credentials.map((credential) => (
            <SurfaceCard
              data-role-lens-id={credential.id}
              key={credential.title}
              className={`flex w-[78%] shrink-0 snap-start flex-col p-5 sm:w-[20rem] ${lensSurfaceClass(selectedLens, "credentials", credential.id)}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-50">{credential.title}</h3>
                  <p className="mt-0.5 text-sm text-cyan-200/80">{credential.subtitle}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-300">{credential.description}</p>
              {credential.certificate && (
                <div className="mt-4 border-t border-slate-800/80 pt-3 text-xs">
                  <p className="font-semibold uppercase tracking-[0.18em] text-slate-600">{credential.certificate.label}</p>
                  {credential.certificate.url ? (
                    <a
                      href={credential.certificate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-cyan-200/85 transition hover:text-cyan-100"
                    >
                      View certificate
                    </a>
                  ) : (
                    <p className="mt-1 text-slate-500">{credential.certificate.text}</p>
                  )}
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>
        <div
          data-additional-training-subsection
          className={`mt-6 ${additionalTrainingLensClass}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-50">{additionalTraining.label}</p>
          <div className="attestation-rail mt-2 flex gap-4 overflow-x-auto pb-3 pt-1">
            {additionalTraining.items.map((item) => (
              <div
                key={item.id}
                data-role-lens-id={item.id}
                className="attestation-card group relative min-w-[20rem] snap-start overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/55 p-4 text-sm shadow-lg shadow-slate-950/10 backdrop-blur transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/75 hover:shadow-xl hover:shadow-slate-950/30 sm:min-w-[23rem] lg:min-w-[24rem]"
              >
                <h3 className="font-medium leading-6 text-slate-50">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-cyan-200/80">{item.subtitle}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                {item.attestation?.url ? (
                  <a
                    href={item.attestation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-xs text-slate-300 underline decoration-slate-700/80 underline-offset-2 transition hover:text-cyan-200/70 hover:decoration-cyan-400/35"
                  >
                    {item.attestation.label}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Section>
  );
}
