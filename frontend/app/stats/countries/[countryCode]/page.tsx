import Link from "next/link";
import { ArrowLeft, Flag, Trophy } from "lucide-react";
import { SiteHeader } from "../../../../components/SiteHeader";

export default function CountryStatsPage({ params }: { params: { countryCode: string } }) {
  const code = params.countryCode.toUpperCase();

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-5">
        <SiteHeader />
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-5 md:p-8">
          <Link href="/stats" className="show-chip mb-5 inline-flex text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
            <ArrowLeft size={13} />
            Статистика
          </Link>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr] lg:items-end">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">Страна</p>
              <h1 className="display-copy mt-3 text-4xl font-black text-white md:text-6xl">{code}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-arenaMuted">
                Здесь будет отдельная история страны: участия по годам, лучшие места, победители, провалы,
                переоценка игроками и карточка последнего сильного результата.
              </p>
            </div>
            <div className="show-panel p-5">
              <Flag className="text-arenaBeam" size={28} />
              <p className="mt-4 text-sm leading-7 text-arenaMuted">
                Страница уже подключена как маршрут, данные подгрузим вместе с импортом архива.
              </p>
              <div className="mt-4 inline-flex rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                <Trophy size={16} className="mr-2" />
                Будущая витрина страны
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
