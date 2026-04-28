import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, Flag, Medal, Trophy } from "lucide-react";
import { SiteHeader } from "../../../../components/SiteHeader";
import { EUROVISION_COUNTRY_STATS } from "../../../../lib/eurovision-country-stats";
import { getCountryName } from "../../../../lib/i18n";

export const dynamic = "force-dynamic";

export default function CountryStatsPage({ params }: { params: { countryCode: string } }) {
  const code = params.countryCode.toUpperCase();
  const country = EUROVISION_COUNTRY_STATS.find((item) => item.code === code);

  if (!country) {
    notFound();
  }

  const countryName = getCountryName("ru", country.code, country.name);
  const yearRange = country.firstYear === country.latestYear ? String(country.firstYear) : `${country.firstYear}—${country.latestYear}`;
  const winYears = country.winYears.length ? country.winYears.join(", ") : "Побед пока не было";
  const bestResult = country.highlightRank === 1 ? `Победа ${country.highlightYear}` : `Лучшее место: #${country.highlightRank}`;
  const character = country.lastPlaces >= 5
    ? "У страны яркая, но нервная история: верхние места соседствуют с болезненными провалами."
    : country.top10Rate >= 55
      ? "Это одна из самых стабильных стран конкурса: часто оказывается в верхней десятке."
      : country.thirteenthPlaces >= 4
        ? "Любит странные пограничные позиции: 13-е место встречается подозрительно часто."
        : "История страны ровная: без одной простой легенды, но с хорошим материалом для сравнения по годам.";

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-5">
        <SiteHeader />

        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-5 md:p-8">
          <Link href="/stats" className="show-chip mb-5 inline-flex text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
            <ArrowLeft size={13} />
            Статистика
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-stretch">
            <div className="min-w-0">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">Страна</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="country-detail-flag">
                  <img src={country.flagUrl} alt="" className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0">
                  <h1 className="display-copy break-words text-4xl font-black leading-none text-white md:text-6xl">{countryName}</h1>
                  <p className="mt-2 text-sm text-arenaMuted">{yearRange} · {country.appearances} участий</p>
                </div>
              </div>

              <p className="mt-6 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{character}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CountryDetailStat icon={Trophy} label="Победы" value={String(country.wins)} />
                <CountryDetailStat icon={Medal} label="Топ-10" value={`${country.top10} · ${country.top10Rate}%`} />
                <CountryDetailStat icon={BarChart3} label="Среднее место" value={country.averageRank.toFixed(1)} />
                <CountryDetailStat icon={Flag} label="Последних мест" value={String(country.lastPlaces)} />
              </div>
            </div>

            <aside className="show-panel grid content-between gap-5 p-5">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">Лучший результат</p>
                <p className="mt-3 text-3xl font-black text-white">{bestResult}</p>
                <p className="mt-3 text-sm leading-6 text-arenaMuted">
                  {country.highlightArtist}
                  {country.highlightSong ? ` · ${country.highlightSong}` : ""}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-arenaBeam">
                    <CalendarDays size={16} />
                    <p className="label-copy text-[10px] uppercase tracking-[0.2em]">Годы побед</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/82">{winYears}</p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="label-copy text-[10px] uppercase tracking-[0.2em] text-arenaPulse">Странная полка</p>
                  <p className="mt-3 text-sm leading-6 text-white/82">
                    13-е место: {country.thirteenthPlaces}. Последние места: {country.lastPlaces}.
                  </p>
                </div>
              </div>
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
