'use client';

import Link from "next/link";
import { MonitorPlay, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Leaderboard from "../components/Leaderboard";
import { useLanguage } from "../components/LanguageProvider";
import { fetchRooms } from "../lib/api";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { RoomSummary } from "../lib/types";

export default function Home() {
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [defaultRoom, setDefaultRoom] = useState(FALLBACK_ROOM.slug);
  const [error, setError] = useState("");
  const { language, getRoomCityLabel } = useLanguage();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchRooms();
        if (!active) return;
        setRooms(payload.rooms.length ? payload.rooms : [FALLBACK_ROOM]);
        setDefaultRoom(payload.defaultRoom || FALLBACK_ROOM.slug);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(
          language === "ru"
            ? "Показываю локальную комнату по умолчанию, потому что список комнат сейчас недоступен."
            : "Showing the local fallback room because the rooms list is unavailable right now.",
        );
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [language]);

  const text = language === "ru"
    ? {
        kicker: "Евровидение у Морозовых 2026",
        title: "Премиальный экран вечеринки прогнозов Евровидения",
        intro:
          "Одна система, три режима: большой экран для эфира, телефон для личного бюллетеня и отдельный пульт для хоста.",
        howTitle: "Как это работает",
        howBody:
          "С телефона ты читаешь про артистов, делаешь заметки и собираешь личный порядок. На телевизоре или проекторе смотришь общий reveal, движение мест и таблицу друзей.",
        primaryCta: "Открыть комнату",
        secondaryCta: "Открыть экран результатов",
        whatTitle: "Что это",
        whatBody: "Ежегодная вечеринка прогнозов Евровидения для друзей из разных городов и стран.",
        blocks: [
          {
            icon: Smartphone,
            title: "Телефон",
            text: "Личный бюллетень, заметки и точная расстановка всех мест.",
          },
          {
            icon: MonitorPlay,
            title: "Эфир",
            text: "Сценический экран для reveal, движения позиций и общих статусов.",
          },
          {
            icon: Sparkles,
            title: "Режим заметок",
            text: "Цифровой аналог бумажного листа, который всегда остаётся рядом с артистом.",
          },
        ],
        roomsTitle: "Комнаты",
        leaderboardTitle: "Таблица друзей",
        routeLabel: "Маршрут комнаты",
      }
    : {
        kicker: "Morozov Eurovision 2026",
        title: "A premium Eurovision predictions party screen",
        intro:
          "One system, three modes: a show screen for the room, a phone ballot for each guest, and a separate control room for the host.",
        howTitle: "How it works",
        howBody:
          "On your phone you read about the acts, keep notes, and build your personal order. On the main screen you watch the reveal, rank movement, and the room leaderboard.",
        primaryCta: "Open room",
        secondaryCta: "Open results screen",
        whatTitle: "What this is",
        whatBody: "An annual Eurovision prediction party for friends watching together from different cities and countries.",
        blocks: [
          {
            icon: Smartphone,
            title: "Phone",
            text: "A personal ballot with notes and an exact full ranking.",
          },
          {
            icon: MonitorPlay,
            title: "Show screen",
            text: "A stage-first screen for reveal moments, movement, and big status updates.",
          },
          {
            icon: Sparkles,
            title: "Notes mode",
            text: "A digital version of the paper notes sheet that stays tied to each act.",
          },
        ],
        roomsTitle: "Rooms",
        leaderboardTitle: "Friends leaderboard",
        routeLabel: "Room route",
      };

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-6 md:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="label-copy text-[11px] uppercase tracking-[0.35em] text-arenaPulse">{text.kicker}</p>
                <LanguageSwitcher />
              </div>
              <h1 className="display-copy mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-7xl">
                {text.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-arenaText/90 md:text-xl">
                {text.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${defaultRoom}`}
                  className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
                >
                  {text.primaryCta}
                </Link>
                <Link
                  href={`/${defaultRoom}/live/semi1`}
                  className="arena-button-secondary inline-flex h-14 items-center justify-center px-6 text-sm"
                >
                  {text.secondaryCta}
                </Link>
              </div>
              {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}
            </div>

            <div className="grid w-full gap-3 xl:max-w-xl">
              <div className="show-panel p-5">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.whatTitle}</p>
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.whatBody}</p>
              </div>
              <div className="show-panel p-5">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.howTitle}</p>
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.howBody}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {text.blocks.map((block) => {
            const Icon = block.icon;
            return (
              <div key={block.title} className="show-card p-5">
                <div className="flex items-center gap-3 text-white">
                  <Icon size={18} />
                  <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{block.title}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-arenaMuted">{block.text}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="show-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomsTitle}</p>
                <h2 className="display-copy mt-2 text-2xl font-black">{text.roomsTitle}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {rooms.map((room) => (
                <Link
                  key={room.slug}
                  href={`/${room.slug}`}
                  className="show-panel p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="display-copy text-2xl font-black text-white">{room.name}</p>
                      <p className="mt-2 text-sm text-arenaMuted">{getRoomCityLabel(room.slug, room.cityLabel)}</p>
                    </div>
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                      {room.defaultStage}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-arenaMuted">
                    <span className="show-chip">{room.seasonLabel || room.seasonYear}</span>
                    <span className="show-chip">{text.routeLabel}: /{room.slug}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.leaderboardTitle}</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">
                {language === "ru"
                  ? "Это secondary-экран: он нужен, чтобы быстро увидеть, кто точнее всех угадывает итоговую таблицу, но не спорит по важности с главным hero."
                  : "This is the secondary screen layer: useful for checking who predicts best, but visually quieter than the landing hero."}
              </p>
            </div>
            <Leaderboard roomSlug={defaultRoom} />
          </div>
        </section>
      </div>
    </main>
  );
}
