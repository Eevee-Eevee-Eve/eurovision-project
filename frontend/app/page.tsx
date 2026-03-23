'use client';

import Link from "next/link";
import { MonitorPlay, Smartphone, Sparkles, Users } from "lucide-react";
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
  const { copy, getRoomCityLabel, getRoomTagline } = useLanguage();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchRooms();
        if (!active) return;
        setRooms(payload.rooms.length ? payload.rooms : [FALLBACK_ROOM]);
        setDefaultRoom(payload.defaultRoom || FALLBACK_ROOM.slug);
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(copy.home.fallbackWarning);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [copy.home.fallbackWarning]);

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="label-copy text-[11px] uppercase tracking-[0.35em] text-arenaPulse">{copy.home.kicker}</p>
                <LanguageSwitcher />
              </div>
              <h1 className="display-copy mt-3 text-4xl font-black tracking-tight md:text-7xl">
                {copy.home.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-arenaMuted md:text-base">
                {copy.home.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/${defaultRoom}`}
                  className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
                >
                  {copy.home.enterDefaultRoom}
                </Link>
                <Link
                  href={`/${defaultRoom}/live/final`}
                  className="arena-button-secondary inline-flex h-14 items-center justify-center px-6 text-sm"
                >
                  {copy.home.openDisplayBoard}
                </Link>
              </div>
              {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.8rem] bg-white/5 p-4">
                <div className="flex items-center gap-3 text-white">
                  <Smartphone size={18} />
                  <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.home.phoneBallotTitle}</span>
                </div>
                <p className="mt-3 text-sm text-arenaMuted">{copy.home.phoneBallotText}</p>
              </div>
              <div className="rounded-[1.8rem] bg-white/5 p-4">
                <div className="flex items-center gap-3 text-white">
                  <MonitorPlay size={18} />
                  <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.home.displayModeTitle}</span>
                </div>
                <p className="mt-3 text-sm text-arenaMuted">{copy.home.displayModeText}</p>
              </div>
              <div className="rounded-[1.8rem] bg-white/5 p-4">
                <div className="flex items-center gap-3 text-white">
                  <Sparkles size={18} />
                  <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.home.notesFlowTitle}</span>
                </div>
                <p className="mt-3 text-sm text-arenaMuted">{copy.home.notesFlowText}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.home.roomsKicker}</p>
                <h2 className="display-copy mt-2 text-2xl font-black">{copy.home.roomsTitle}</h2>
              </div>
              <Users size={18} className="text-arenaMuted" />
            </div>

            <div className="mt-5 grid gap-3">
              {rooms.map((room) => (
                <Link
                  key={room.slug}
                  href={`/${room.slug}`}
                  className="rounded-[1.6rem] bg-arenaSurfaceHi p-4 transition hover:bg-arenaSurfaceMax"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="display-copy text-2xl font-black">{room.name}</p>
                      <p className="mt-2 text-sm text-arenaMuted">{getRoomTagline(room.slug, room.tagline)}</p>
                    </div>
                    <span className="label-copy rounded-full bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-arenaText">
                      {room.defaultStage}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-arenaMuted">
                    <span className="rounded-full bg-white/5 px-3 py-2">{getRoomCityLabel(room.slug, room.cityLabel)}</span>
                    <span className="rounded-full bg-white/5 px-3 py-2">{copy.home.roomTag}: /{room.slug}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Leaderboard roomSlug={defaultRoom} />
        </section>
      </div>
    </main>
  );
}
