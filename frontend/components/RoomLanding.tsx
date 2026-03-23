'use client';

import Link from "next/link";
import { ArrowRight, LayoutPanelTop, MonitorPlay, NotebookPen, Radio, Trophy, Users } from "lucide-react";
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
  const { getCountryName, getStageLabel, language } = useLanguage();

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

    void load();

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
  const statusText = room?.showState?.statusText;
  const text = language === "ru"
    ? {
        kicker: "Режимы комнаты",
        title: "Один room hub, три понятных сценария",
        description:
          "Здесь не нужно принимать много решений. С телефона открываешь бюллетень и артистов, на большом экране — эфир и reveal, а всё служебное остаётся в пульте хоста.",
        primaryTitle: "Главные режимы",
        secondaryTitle: "Дополнительно",
        currentStage: "Текущий этап",
        voting: "Голосование",
        votingText: "Личный бюллетень, заметки и полный порядок мест.",
        acts: "Артисты",
        actsText: "Карточки артистов и быстрый companion-screen во время шоу.",
        live: "Эфир",
        liveText: "Главный экран для ТВ и проектора: текущий артист, статус и reveal.",
        players: "Участники",
        playersText: "Отдельная таблица друзей и результатов комнаты.",
        stats: "Сезонная статистика",
        statsText: "Архив сезона, точность и лучший этап каждого игрока.",
        control: "Пульт",
        controlText: "Хост управляет окнами голосования, reveal и состоянием экрана.",
        preview: "Превью артистов",
        previewText: "Спокойный редакционный слой, а не ещё один главный маршрут.",
        roomStatus: "Статус комнаты",
        statusFallback: "Комната готова к началу следующего reveal.",
      }
    : {
        kicker: "Room modes",
        title: "One hub, three clear scenarios",
        description:
          "No need to choose from five equally loud options. Phones open ballots and acts, large screens open the show flow, and host actions stay in the control room.",
        primaryTitle: "Primary modes",
        secondaryTitle: "Secondary routes",
        currentStage: "Current stage",
        voting: "Vote",
        votingText: "Personal ballot, notes, and the full exact order.",
        acts: "Acts",
        actsText: "Artist cards and the companion screen during the show.",
        live: "Show screen",
        liveText: "The main projector route for current act, status, and reveal.",
        players: "Players",
        playersText: "A dedicated friends leaderboard for the room.",
        stats: "Season stats",
        statsText: "Archive, precision, and each player's best stage.",
        control: "Control room",
        controlText: "The host controls voting windows, reveal, and the active show state.",
        preview: "Acts preview",
        previewText: "A quieter editorial layer instead of another equally loud route.",
        roomStatus: "Room status",
        statusFallback: "The room is ready for the next reveal moment.",
      };

  const primaryRoutes = [
    {
      title: text.voting,
      description: text.votingText,
      href: `/${roomSlug}/vote/${defaultStage}`,
      icon: NotebookPen,
      accent: "text-arenaPulse",
    },
    {
      title: text.acts,
      description: text.actsText,
      href: `/${roomSlug}/acts/${defaultStage}`,
      icon: Users,
      accent: "text-arenaBeam",
    },
    {
      title: text.live,
      description: text.liveText,
      href: `/${roomSlug}/live/${defaultStage}`,
      icon: MonitorPlay,
      accent: "text-arenaDanger",
    },
  ];

  const secondaryRoutes = [
    {
      title: text.players,
      description: text.playersText,
      href: `/${roomSlug}/players/overall`,
      icon: Trophy,
    },
    {
      title: text.stats,
      description: text.statsText,
      href: `/${roomSlug}/stats`,
      icon: LayoutPanelTop,
    },
    {
      title: text.control,
      description: text.controlText,
      href: `/admin?room=${roomSlug}`,
      icon: Radio,
    },
  ];

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.kicker}</p>
          <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">{room?.name || roomSlug}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
            {text.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              {text.currentStage}: {getStageLabel(defaultStage)}
            </span>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
              {room?.predictionWindows?.[defaultStage]
                ? (language === "ru" ? "Окно голосования открыто" : "Voting window open")
                : (language === "ru" ? "Окно голосования закрыто" : "Voting window closed")}
            </span>
          </div>

          <div className="show-panel mt-5 p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.roomStatus}</p>
            <p className="mt-3 text-sm leading-7 text-white">{statusText || text.statusFallback}</p>
          </div>
        </div>

        <Leaderboard roomSlug={roomSlug} />
      </section>

      <section className="show-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.primaryTitle}</p>
            <h3 className="display-copy mt-2 text-2xl font-black">{text.primaryTitle}</h3>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {primaryRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.title}
                href={route.href}
                className="show-panel group p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                <div className={`inline-flex rounded-full bg-white/5 p-3 ${route.accent}`}>
                  <Icon size={20} />
                </div>
                <p className="display-copy mt-5 text-2xl font-black text-white">{route.title}</p>
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{route.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm text-white">
                  <span>{language === "ru" ? "Открыть" : "Open"}</span>
                  <ArrowRight size={15} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">{text.secondaryTitle}</p>
          <div className="mt-5 grid gap-3">
            {secondaryRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.title}
                  href={route.href}
                  className="show-panel flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/5 p-2 text-arenaMuted">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{route.title}</p>
                      <p className="mt-1 text-sm text-arenaMuted">{route.description}</p>
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
          <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.previewText}</p>
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
                <p className="mt-4 text-xl font-semibold text-white">{act.artist}</p>
                <p className="mt-1 text-sm text-arenaMuted">{act.song}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
