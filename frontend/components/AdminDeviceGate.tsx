'use client';

import Link from "next/link";
import { MonitorOff } from "lucide-react";
import { useDeviceTier } from "../lib/device";
import { BrandLogo } from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { AdminControlRoom } from "./AdminControlRoom";

export function AdminDeviceGate() {
  const { tier, isReady } = useDeviceTier();
  const { language } = useLanguage();

  if (!isReady) {
    return (
      <div className="show-card mx-4 mt-6 p-6 text-sm text-arenaMuted md:mx-8">
        {language === "ru" ? "Проверяю устройство..." : "Checking device..."}
      </div>
    );
  }

  if (tier === "phone") {
    return (
      <main className="min-h-screen bg-arena-grid px-4 pb-20 pt-6 text-arenaText md:px-8">
        <div className="mx-auto grid max-w-[96rem] gap-5">
          <BrandLogo variant="header" />
          <section className="show-card p-6 md:p-8">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {language === "ru" ? "Пульт хоста" : "Host control room"}
            </p>
            <h1 className="display-copy mt-3 text-3xl font-black text-white md:text-5xl">
              {language === "ru" ? "Админка доступна только на планшете или десктопе" : "Admin is desktop and tablet only"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-arenaMuted md:text-base">
              {language === "ru"
                ? "Вводить официальные результаты и управлять шоу удобнее на широком экране."
                : "Publishing official results and managing the show works better on a larger screen."}
            </p>

            <div className="mt-6">
              <Link href="/" className="arena-button-secondary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm">
                <MonitorOff size={16} />
                {language === "ru" ? "На главную" : "Back home"}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <AdminControlRoom />;
}
