'use client';

import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, ExternalLink, Flag, Landmark, Medal, Sparkles, Trophy } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { useLanguage } from "./LanguageProvider";
import type { EurovisionCountryStat } from "../lib/eurovision-country-stats";
import { getCountryStory } from "../lib/country-stories";

export function CountryStatsDetail({ country }: { country: EurovisionCountryStat }) {
  const { language, getCountryName } = useLanguage();
  const countryName = getCountryName(country.code, country.name);
  const story = getCountryStory(country, language);
  const yearRange = country.firstYear === country.latestYear ? String(country.firstYear) : `${country.firstYear}-${country.latestYear}`;
  const heroPhoto = country.heroPhoto || country.highlightPhoto;

  const copy = language === "ru"
    ? {
        back: "Статистика",
        eyebrow: "Страна",
        appearances: "участий",
        wins: "Победы",
        top10: "Топ-10",
        averageRank: "Среднее место",
        lastPlaces: "Последних мест",
        bestResult: "Лучший результат",
        winningYears: "Годы побед",
        archiveShelf: "Статистическая полка",
        milestones: "Исторические вехи",
        sources: "Открытые источники",
        sourceNote: "Факты собраны из открытых архивов и текущей базы результатов сайта.",
        noWins: "Побед пока не было",
        top10Line: "Топ-10",
        thirteenth: "13-е место",
      }
    : {
        back: "Stats",
        eyebrow: "Country",
        appearances: "appearances",
        wins: "Wins",
        top10: "Top 10",
        averageRank: "Average place",
        lastPlaces: "Last places",
        bestResult: "Best result",
        winningYears: "Winning years",
        archiveShelf: "Stats shelf",
        milestones: "Historical milestones",
        sources: "Open sources",
        sourceNote: "Facts are structured from open archives and the site's current result database.",
        noWins: "No wins yet",
        top10Line: "Top 10",
        thirteenth: "13th place",
      };

  return (
    <main className="min-h-screen bg-arena-grid px-3 pb-28 pt-4 text-arenaText sm:px-4 md:px-8">
      <div className="mx-auto grid w-full max-w-[96rem] min-w-0 gap-5">
        <SiteHeader />

        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-5 md:p-8">
          <Link href="/stats" className="show-chip mb-5 inline-flex text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
            <ArrowLeft size={13} />
            {copy.back}
          </Link>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(22rem,0.62fr)] lg:items-stretch">
            <div className="min-w-0">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.eyebrow}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="country-detail-flag">
                  <img src={country.flagUrl} alt="" className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0">
                  <h1 className="display-copy break-words text-4xl font-black leading-none text-white md:text-6xl">{countryName}</h1>
                  <p className="mt-2 text-sm text-arenaMuted">{yearRange} · {country.appearances} {copy.appearances}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CountryDetailStat icon={Trophy} label={copy.wins} value={String(country.wins)} />
                <CountryDetailStat icon={Medal} label={copy.top10} value={`${country.top10} · ${country.top10Rate}%`} />
                <CountryDetailStat icon={BarChart3} label={copy.averageRank} value={country.averageRank.toFixed(1)} />
                <CountryDetailStat icon={Flag} label={copy.lastPlaces} value={String(country.lastPlaces)} />
              </div>

              <section className="show-panel mt-5 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.milestones}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-arenaMuted">{copy.sourceNote}</p>
                  </div>
                  <span className="show-chip">{story.milestones.length}</span>
                </div>

                <div className="mt-5 grid gap-3">
                  {story.milestones.map((milestone, index) => (
                    <article key={`${milestone.year}-${index}`} className="grid gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                      <div className="flex items-center gap-3 sm:block">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-sm font-black text-arenaBeam sm:h-14 sm:w-14">
                          {milestone.year}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black leading-tight text-white">{milestone.title[language]}</h2>
                        <p className="mt-2 text-sm leading-6 text-arenaMuted">{milestone.text[language]}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="grid gap-5">
              <section className="show-panel overflow-hidden p-0">
                <div className="relative min-h-[18rem] overflow-hidden">
                  {heroPhoto ? (
                    <img
                      src={heroPhoto}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-[0.72] brightness-75 saturate-110"
                      loading="eager"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-arenaVoid via-arenaVoid/58 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.bestResult}</p>
                    <p className="mt-3 text-3xl font-black text-white">{story.bestResult}</p>
                    <p className="mt-3 text-sm leading-6 text-white/76">
                      {country.highlightArtist}
                      {country.highlightSong ? ` · ${country.highlightSong}` : ""}
                    </p>
                    {country.heroPhotoCredit ? (
                      <p className="mt-4 text-[0.62rem] uppercase tracking-[0.14em] text-white/36">{country.heroPhotoCredit}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="show-panel grid gap-3 p-5">
                <InfoBlock
                  icon={CalendarDays}
                  label={copy.winningYears}
                  value={country.winYears.length ? story.winYears : copy.noWins}
                />
                <InfoBlock
                  icon={Sparkles}
                  label={copy.archiveShelf}
                  value={`${copy.thirteenth}: ${country.thirteenthPlaces}. ${copy.lastPlaces}: ${country.lastPlaces}. ${copy.top10Line}: ${country.top10Rate}%.`}
                />
              </section>

              <section className="show-panel p-5">
                <div className="flex items-center gap-2 text-arenaBeam">
                  <Landmark size={16} />
                  <p className="label-copy text-[11px] uppercase tracking-[0.24em]">{copy.sources}</p>
                </div>
                <div className="mt-4 grid gap-2">
                  {story.sources.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="show-chip justify-between text-left text-[0.72rem] normal-case tracking-normal text-white/78 transition hover:text-white"
                    >
                      <span className="truncate">{source.label}</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function CountryDetailStat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="show-panel p-4">
      <div className="flex items-center gap-2 text-arenaBeam">
        <Icon size={16} />
        <p className="label-copy text-[10px] uppercase tracking-[0.18em] text-arenaMuted">{label}</p>
      </div>
      <p className="display-copy mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-arenaBeam">
        <Icon size={16} />
        <p className="label-copy text-[10px] uppercase tracking-[0.2em] text-arenaMuted">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/82">{value}</p>
    </div>
  );
}
