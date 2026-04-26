"use client";

import { useLanguage } from "../../../components/LanguageProvider";
import { BrandLogo } from "../../../components/BrandLogo";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { getLegalConfig, getLegalCopy, hasConfiguredLegalContact } from "../../../lib/legal";

export default function PrivacyPage() {
  const { language } = useLanguage();
  const legalCopy = getLegalCopy(language);
  const legalConfig = getLegalConfig(language);
  const contactConfigured = hasConfiguredLegalContact();

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo variant="header" />
          <LanguageSwitcher />
        </div>
        <section className="show-card p-6 md:p-8">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{legalCopy.privacyTitle}</p>
          <h1 className="display-copy mt-3 text-3xl font-black md:text-5xl">{legalCopy.privacyHeadline}</h1>
          <p className="mt-4 max-w-3xl text-sm text-arenaMuted md:text-base">
            {legalCopy.privacyIntro}
          </p>
        </section>

        <section className="show-card p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{legalCopy.operatorLabel}</p>
              <p className="mt-3 text-lg font-semibold text-white">{legalConfig.operatorName}</p>
            </div>
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{legalCopy.contactLabel}</p>
              <p className="mt-3 text-sm text-white">{legalConfig.operatorContact}</p>
              {!contactConfigured ? (
                <p className="mt-3 text-xs text-amber-200">
                  {legalCopy.productionTip}
                </p>
              ) : null}
            </div>
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{legalCopy.regionLabel}</p>
              <p className="mt-3 text-sm text-white">{legalConfig.dataRegion}</p>
            </div>
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{legalCopy.retentionLabel}</p>
              <p className="mt-3 text-sm text-white">{legalConfig.retentionNotice}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {legalCopy.privacySections.map((section) => (
            <article key={section.title} className="show-card p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">{section.title}</p>
              <p className="mt-4 text-sm text-arenaMuted md:text-base">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
