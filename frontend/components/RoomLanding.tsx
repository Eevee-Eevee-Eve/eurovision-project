'use client';

import Link from "next/link";
import { ArrowRight, MonitorPlay, Smartphone, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchActs, fetchRoom } from "../lib/api";
import type { ActEntry, RoomDetails } from "../lib/types";
import { ActPoster } from "./ActPoster";
import Leaderboard from "./Leaderboard";
import { useLanguage } from "./LanguageProvider";

export function RoomLanding({ roomSlug }: { roomSlug: string }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [previewActs, setPreviewActs] = useState<ActEntry[]>([]);
  const [error, setError] = useState(false);
  const { copy, getCountryName, getRoomCityLabel, language } = useLanguage();

  function getRunningOrderLabel(value: number | null) {
    return value ? copy.acts.runningOrder(value) : null;
  }

  const extraRoutes = language === "ru"
    ? [
        {
          title: "Сезонная статистика",
          description: "Архив комнаты, средняя точность и лучший этап каждого игрока.",
          href: `/${roomSlug}/stats`,
        },
        {
          title: "Пульт комнаты",
          description: "Панель хоста для этапов, итогов и управления участниками.",
          href: `/admin?room=${roomSlug}`,
        },
      ]
    : [
        {
          title: "Season stats",
          description: "Room archive, average precision, and each player's best stage.",
          href: `/${roomSlug}/stats`,
        },
        {
          title: "Control room",
          description: "Host panel for stage windows, result publishing, and participant actions.",
          href: `/admin?room=${roomSlug}`,
        },
      ];

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const roomPayload = await fetchRoom(roomSlug);
        if (!active) return;
        setRoom(roomPayload);
        setError(false);
        try {
          const actsPayload = await fetchActs(roomSlug, roomPayload.defaultStage);
          if (!active) return;
          setPreviewActs(actsPayload.acts.slice(0, 3));
        } catch (actsError) {
          if (!active) return;
          console.error(actsError);
          setPreviewActs([]);
        }
      } catch (roomError) {
        if (!active) return;
        console.error(roomError);
        setError(true);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [roomSlug]);

  if (error) {
    return (
      <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">
        {language === "ru" ? "Сейчас не удалось загрузить данные комнаты." : "Unable to load room details right now."}
      </div>
    );
  }

  const defaultStage = room?.defaultStage || "semi1";

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
            {room ? getRoomCityLabel(room.slug, room.cityLabel) : (language === "ru" ? "Общий эфир из разных городов" : "Shared watch party across cities")}
          </p>
          <h2 className="display-copy mt-2 text-3xl font-black md:text-6xl">
            {copy.roomHub.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-arenaMuted md:text-base">
            {copy.roomHub.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${roomSlug}/vote/${defaultStage}`}
              className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
            >
              {copy.roomHub.openVoting}
            </Link>
            <Link
              href={`/${roomSlug}/live/${defaultStage}`}
              className="arena-button-secondary inline-flex h-14 items-center justify-center px-6 text-sm"
            >
              {copy.roomHub.openProjector}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <div className="show-card p-4">
            <div className="flex items-center gap-3 text-white">
              <Smartphone size={18} />
              <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.roomHub.phoneUxTitle}</span>
            </div>
            <p className="mt-3 text-sm text-arenaMuted">{copy.roomHub.phoneUxText}</p>
          </div>
          <div className="show-card p-4">
            <div className="flex items-center gap-3 text-white">
              <MonitorPlay size={18} />
              <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.roomHub.displayRoutesTitle}</span>
            </div>
            <p className="mt-3 text-sm text-arenaMuted">{copy.roomHub.displayRoutesText}</p>
          </div>
          <div className="show-card p-4">
            <div className="flex items-center gap-3 text-white">
              <Sparkles size={18} />
              <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.roomHub.digitalNotesTitle}</span>
            </div>
            <p className="mt-3 text-sm text-arenaMuted">{copy.roomHub.digitalNotesText}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="show-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.roomHub.quickRoutes}</p>
              <h3 className="display-copy mt-2 text-2xl font-black">{copy.roomHub.quickRoutesTitle}</h3>
            </div>
            <Users size={18} className="text-arenaMuted" />
          </div>
          <div className="mt-5 grid gap-3">
            {[
              {
                title: copy.roomHub.voteStudioTitle,
                description: copy.roomHub.voteStudioText,
                href: `/${roomSlug}/vote/${defaultStage}`,
              },
              {
                title: copy.roomHub.actsGuideTitle,
                description: copy.roomHub.actsGuideText,
                href: `/${roomSlug}/acts/${defaultStage}`,
              },
              {
                title: copy.roomHub.liveResultsTitle,
                description: copy.roomHub.liveResultsText,
                href: `/${roomSlug}/live/${defaultStage}`,
              },
              {
                title: copy.roomHub.playersBoardTitle,
                description: copy.roomHub.playersBoardText,
                href: `/${roomSlug}/players/overall`,
              },
              ...extraRoutes,
            ].map((route) => (
              <Link
                key={route.title}
                href={route.href}
                className="show-panel flex items-center justify-between px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                <div>
                  <p className="text-base font-semibold text-white">{route.title}</p>
                  <p className="mt-1 text-sm text-arenaMuted">{route.description}</p>
                </div>
                <ArrowRight size={18} className="text-arenaMuted" />
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.roomHub.previewActs}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {previewActs.map((act) => (
                <Link
                  key={act.code}
                  href={`/${roomSlug}/acts/${defaultStage}`}
                  className="show-panel p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  <ActPoster act={act} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                      {getCountryName(act.code, act.country)}
                    </span>
                    {getRunningOrderLabel(act.runningOrder) ? (
                      <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                        {getRunningOrderLabel(act.runningOrder)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{act.artist}</p>
                  <p className="mt-1 text-sm text-arenaMuted">{act.song}</p>
                </Link>
              ))}
            </div>
            {!previewActs.length ? (
              <p className="mt-4 text-sm text-arenaMuted">
                {language === "ru"
                  ? "Превью артистов появится здесь, как только догрузится lineup текущего этапа."
                  : "The act preview will appear here as soon as the current stage lineup finishes loading."}
              </p>
            ) : null}
          </div>
          <Leaderboard roomSlug={roomSlug} />
        </div>
      </section>
    </div>
  );
}
