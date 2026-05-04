import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import { SiteHeader } from "../../../../components/SiteHeader";

export const dynamic = "force-dynamic";

export default function CountryStatsPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-5">
        <SiteHeader />

        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-5 md:p-8">
          <Link href="/stats" className="show-chip mb-5 inline-flex text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
            <ArrowLeft size={13} />
            Статистика
          </Link>

          <div className="show-card p-6 md:p-8">
            <div className="achievement-icon bg-gradient-to-br from-sky-300/24 to-blue-500/10 text-sky-100">
              <Flag size={22} />
            </div>
            <p className="label-copy mt-5 text-[11px] uppercase tracking-[0.32em] text-arenaPulse">Страны</p>
            <h1 className="display-copy mt-3 max-w-4xl text-3xl font-black leading-none text-white md:text-5xl">
              Страновая статистика появится после сезона
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
              Сейчас не показываем старые заготовки как готовые данные. После Евровидения сюда можно будет вернуть
              раздел стран уже с понятной логикой, источниками и аккуратной визуализацией.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
