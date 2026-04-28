import { BarChart3, Crown, Flag, Upload } from "lucide-react";
import { SiteHeader } from "../../components/SiteHeader";

export default function StatsPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <SiteHeader />

        <section className="glass-panel ghost-grid home-hero-compact rounded-shell border border-white/10">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
            Статистика
          </p>
          <h1 className="display-copy mt-3 text-3xl font-black leading-[0.96] tracking-tight md:text-5xl">
            Игроки, страны и история сезонов
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted">
            Здесь будет общий раздел с историей игроков по годам, статистикой стран,
            победителями и импортом прошлых сезонов из админки.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="show-card p-5 md:p-6">
            <BarChart3 className="text-arenaBeam" size={26} />
            <h2 className="mt-4 text-xl font-black text-white">Статистика игроков</h2>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">
              Сводка по аккаунтам: места, попадания в топ, динамика по годам и личные рекорды.
            </p>
          </div>

          <div className="show-card p-5 md:p-6">
            <Flag className="text-arenaPulse" size={26} />
            <h2 className="mt-4 text-xl font-black text-white">Статистика стран</h2>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">
              Графики по странам, пересечения с выбором игроков, победы и средние позиции.
            </p>
          </div>

          <div className="show-card p-5 md:p-6">
            <Upload className="text-arenaDanger" size={26} />
            <h2 className="mt-4 text-xl font-black text-white">Импорт сезонов</h2>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">
              Заглушка под загрузку CSV/JSON в админке и привязку прошлых результатов к аккаунтам.
            </p>
          </div>
        </section>

        <section className="show-card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
                Значки
              </p>
              <h2 className="mt-2 text-xl font-black text-white">Победители и достижения</h2>
            </div>
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-amber-100">
              <Crown size={30} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
