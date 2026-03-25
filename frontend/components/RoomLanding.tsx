'use client';

import Link from "next/link";
import { ArrowRight, MonitorPlay, NotebookPen, Radio, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchActs, fetchRoom } from "../lib/api";
import type { ActEntry, RoomDetails } from "../lib/types";
import { ActPoster } from "./ActPoster";
import Leaderboard from "./Leaderboard";
import { useLanguage } from "./LanguageProvider";

export function RoomLanding({ roomSlug }: { roomSlug: string }) {
  const { getCountryName, getStageLabel, language } = useLanguage();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [previewActs, setPreviewActs] = useState<ActEntry[]>([]);
  const [error, setError] = useState(false);

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
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(true);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [roomSlug]);

  if (error) {
    return (
      <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">
        {language === "ru" ? "Сейчас не удалось загрузить комнату." : "Unable to load the room right now."}
      </div>
    );
  }

  const defaultStage = room?.defaultStage || "semi1";
  const showStatus = room?.showState?.statusText;
  const text = language === "ru"
    ? {
        kicker: "Комната",
        title: "Здесь всё начинается просто: голосование или экран результатов",
        description:
          "Комната больше не должна выглядеть как панель из семи одинаково громких режимов. Основной вход — либо в личный бюллетень на телефоне, либо в общий экран результатов.",
        currentStage: "Текущий этап",
        roomStatus: "Статус комнаты",
        statusFallback: "Комната готова к следующему reveal.",
        vote: "Голосование",
        voteText: "Главный личный сценарий: расставить артистов, оставить заметки и отправить бюллетень.",
        results: "Результаты",
        resultsText: "Большой экран для reveal, движения мест и общей таблицы друзей.",
        acts: "Артисты",
        actsText: "Отдельный гид с карточками и подробностями по участникам.",
        players: "Участники",
        playersText: "Таблица друзей и очков комнаты.",
        admin: "Админка",
        adminText: "Отдельный backstage для хоста.",
        open: "Открыть",
        secondary: "Второстепенные маршруты",
        preview: "Несколько артистов этого этапа",
      }
    : {
        kicker: "Room",
        title: "Keep it simple here: vote or open the results screen",
        description:
          "The room page should not feel like seven equally loud options. The main handoff is either the personal ballot on a phone or the shared results screen.",
        currentStage: "Current stage",
        roomStatus: "Room status",
        statusFallback: "The room is ready for the next reveal.",
        vote: "Voting",
        voteText: "The personal flow: rank acts, keep notes, and submit a ballot.",
        results: "Results",
        resultsText: "The big screen for reveal, movement, and the shared leaderboard.",
        acts: "Acts",
        actsText: "A separate guide with artist cards and details.",
        players: "Players",
        playersText: "The room leaderboard and scores.",
        admin: "Admin",
        adminText: "A separate backstage surface for the host.",
        open: "Open",
        secondary: "Secondary routes",
        preview: "A few acts from this stage",
      };

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.kicker}</p>
          <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">
            {room?.name || roomSlug}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
            {text.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              {text.currentStage}: {getStageLabel(defaultStage)}
            </span>
            {room?.isTemporary ? (
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {language === "ru" ? "Временная комната" : "Temporary room"}
              </span>
            ) : null}
            {room?.passwordRequired ? (
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {language === "ru" ? "С паролем" : "Password"}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link href={`/${roomSlug}/vote/${defaultStage}`} className="show-panel p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
              <div className="inline-flex rounded-full bg-white/5 p-3 text-arenaPulse">
                <NotebookPen size={20} />
              </div>
              <p className="display-copy mt-5 text-2xl font-black text-white">{text.vote}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.voteText}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white">
                <span>{text.open}</span>
                <ArrowRight size={15} />
              </div>
            </Link>

            <Link href={`/${roomSlug}/live/${defaultStage}`} className="show-panel p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
              <div className="inline-flex rounded-full bg-white/5 p-3 text-arenaBeam">
                <MonitorPlay size={20} />
              </div>
              <p className="display-copy mt-5 text-2xl font-black text-white">{text.results}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.resultsText}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white">
                <span>{text.open}</span>
                <ArrowRight size={15} />
              </div>
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomStatus}</p>
            <p className="mt-4 text-base leading-7 text-white">{showStatus || text.statusFallback}</p>
          </div>
          <Leaderboard roomSlug={roomSlug} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">{text.secondary}</p>
          <div className="mt-5 grid gap-3">
            {[
              {
                title: text.acts,
                description: text.actsText,
                href: `/${roomSlug}/acts/${defaultStage}`,
                icon: Users,
              },
              {
                title: text.players,
                description: text.playersText,
                href: `/${roomSlug}/players/overall`,
                icon: MonitorPlay,
              },
              {
                title: text.admin,
                description: text.adminText,
                href: `/admin?room=${roomSlug}`,
                icon: Radio,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="show-panel flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/5 p-2 text-arenaMuted">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-arenaMuted">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-arenaMuted" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.preview}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {previewActs.map((act) => (
              <Link
                key={act.code}
                href={`/${roomSlug}/acts/${defaultStage}`}
                className="show-panel p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                <ActPoster act={act} mode="hero" contentDensity="compact" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="show-chip text-xs text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{act.artist}</p>
                <p className="mt-1 text-sm text-arenaMuted">{act.song}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
