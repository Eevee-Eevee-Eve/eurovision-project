"use client";

import { useLanguage } from "../../../components/LanguageProvider";
import { getLegalConfig, getLegalCopy } from "../../../lib/legal";

export default function CookiesPage() {
  const { language } = useLanguage();
  const legalCopy = getLegalCopy(language);
  const legalConfig = getLegalConfig(language);

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <section className="show-card p-6 md:p-8">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{legalCopy.cookiesTitle}</p>
          <h1 className="display-copy mt-3 text-3xl font-black md:text-5xl">{legalCopy.cookiesHeadline}</h1>
          <p className="mt-4 max-w-3xl text-sm text-arenaMuted md:text-base">
            {legalCopy.cookiesIntro}
          </p>
        </section>

        <section className="show-card p-6 md:p-8">
          <div className="grid gap-3">
            {legalConfig.requiredStorage.map((entry) => (
              <article key={entry.key} className="show-panel p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{entry.type}</p>
                    <p className="mt-2 text-base font-semibold text-white">{entry.key}</p>
                  </div>
                  <p className="max-w-2xl text-sm text-arenaMuted">{entry.purpose}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="show-card p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">{legalCopy.cookiesRequiredTitle}</p>
            <p className="mt-4 text-sm text-arenaMuted md:text-base">
              {legalCopy.cookiesRequiredBody}
            </p>
          </article>
          <article className="show-card p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">{legalCopy.cookiesFutureTitle}</p>
            <p className="mt-4 text-sm text-arenaMuted md:text-base">
              {legalCopy.cookiesFutureBody}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
