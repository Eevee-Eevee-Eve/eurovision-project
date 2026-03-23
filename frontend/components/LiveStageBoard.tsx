'use client';

import { motion } from "framer-motion";
import { Activity, MonitorPlay, Radio, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchRoom, fetchStageResults } from "../lib/api";
import type { ActEntry, LeaderboardEntry, RoomDetails, StageKey } from "../lib/types";
import { ActPoster } from "./ActPoster";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";
import { useLanguage } from "./LanguageProvider";

export function LiveStageBoard({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [results, setResults] = useState<ActEntry[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { getCountryName, getStageLabel, language } = useLanguage();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [roomPayload, resultsPayload, leaderboardPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchStageResults(roomSlug, stageKey),
          fetchLeaderboard(roomSlug, "overall"),
        ]);
        if (!active) return;
        setRoom(roomPayload);
        setResults(resultsPayload.results);
        setLeaders(leaderboardPayload);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(language === "ru" ? "Не удалось загрузить экран эфира." : "Unable to load the show screen.");
      }
    };

    void load();

    const socket = createRoomSocket(roomSlug);
    socket.on("resultsUpdate", (payload: { stage: StageKey; results: ActEntry[] }) => {
      if (payload.stage !== stageKey) return;
      setResults(payload.results);
      setLoading(false);
    });
    socket.on("leaderboardUpdate", (payload: LeaderboardEntry[]) => {
      setLeaders(payload);
    });
    socket.on("toggle", (payload: { roomSlug: string; showState?: RoomDetails["showState"] }) => {
      if (payload.roomSlug !== roomSlug || !payload.showState) return;
      setRoom((current) => (current ? { ...current, showState: payload.showState } : current));
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [language, roomSlug, stageKey]);

  useEffect(() => {
    const nextMovement = results.reduce<Record<string, number | null>>((acc, act) => {
      if (!act.rank) {
        acc[act.code] = null;
        return acc;
      }

      const previousRank = previousRanks.current[act.code];
      acc[act.code] = previousRank ? previousRank - act.rank : null;
      return acc;
    }, {});

    setMovement(nextMovement);
    previousRanks.current = results.reduce<Record<string, number>>((acc, act) => {
      if (act.rank) {
        acc[act.code] = act.rank;
      }
      return acc;
    }, {});
  }, [results]);

  const text = language === "ru"
    ? {
        kicker: "Show screen",
        title: "Эфир комнаты",
        description:
          "Это главный экран для ТВ и проектора: крупный фокус на текущем артисте, статусе reveal и движении таблицы.",
        currentAct: "Сейчас на экране",
        roomLead: "Лидер комнаты",
        revealProgress: "Reveal",
        roomPlayers: "Друзья в комнате",
        stageBoard: "Таблица этапа",
        waitingStatus: "Ожидаем следующий reveal.",
        noResults: "Пока нет опубликованных результатов этапа.",
        roomReady: "Экран готов для проектора",
      }
    : {
        kicker: "Show screen",
        title: "Room broadcast board",
        description:
          "This is the main TV and projector screen: one large focal act, one clear status, and the live movement of the stage table.",
        currentAct: "Now on screen",
        roomLead: "Room leader",
        revealProgress: "Reveal",
        roomPlayers: "Friends in the room",
        stageBoard: "Stage standings",
        waitingStatus: "Waiting for the next reveal moment.",
        noResults: "This stage has no published results yet.",
        roomReady: "Display route ready",
      };

  const revealedCount = results.filter((act) => act.revealed).length;
  const topActs = useMemo(() => results.slice(0, 10), [results]);
  const compactLeaders = leaders.slice(0, 6);
  const showState = room?.showState?.stageKey === stageKey ? room.showState : null;
  const featuredAct = useMemo(() => {
    const currentFromState = showState?.currentActCode
      ? results.find((act) => act.code === showState.currentActCode) || null
      : null;

    if (currentFromState) return currentFromState;
    return results.find((act) => act.revealed) || results[0] || null;
  }, [results, showState]);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-24 animate-pulse rounded-[1.8rem] bg-white/5" />
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="h-[28rem] animate-pulse rounded-[2rem] bg-white/5" />
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/5" />
            <div className="h-72 animate-pulse rounded-[2rem] bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">{error}</div>;
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaDanger">{text.kicker}</p>
          <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">{text.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{text.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              {getStageLabel(stageKey)}
            </span>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
              {text.revealProgress}: {revealedCount}/{results.length}
            </span>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
              <MonitorPlay size={13} />
              {text.roomReady}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          {[
            {
              label: text.revealProgress,
              value: `${revealedCount}/${results.length}`,
              icon: Activity,
            },
            {
              label: text.roomLead,
              value: compactLeaders[0]?.name || "—",
              icon: Trophy,
            },
            {
              label: text.roomPlayers,
              value: String(leaders.length),
              icon: Users,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="show-card p-4">
                <div className="flex items-center gap-2 text-arenaMuted">
                  <Icon size={15} />
                  <span className="label-copy text-[11px] uppercase tracking-[0.24em]">{item.label}</span>
                </div>
                <p className="display-copy mt-4 text-3xl font-black text-white">{item.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.currentAct}</p>
              <h3 className="display-copy mt-2 text-2xl font-black md:text-4xl">
                {featuredAct ? featuredAct.artist : text.noResults}
              </h3>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">
                {showState?.statusText || text.waitingStatus}
              </p>
            </div>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaDanger">
              <Radio size={13} />
              {showState?.highlightMode || "stage"}
            </span>
          </div>

          {featuredAct ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.78fr]">
              <ActPoster act={featuredAct} mode="hero" />
              <div className="grid gap-3">
                <div className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                    {getCountryName(featuredAct.code, featuredAct.country)}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{featuredAct.song}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {featuredAct.rank ? (
                      <span className="show-chip text-sm text-white">#{featuredAct.rank}</span>
                    ) : null}
                    <MovementPill delta={movement[featuredAct.code] ?? null} />
                    {featuredAct.totalPoints != null ? (
                      <span className="show-chip text-sm text-arenaMuted">
                        {featuredAct.totalPoints} {language === "ru" ? "баллов" : "pts"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                    {text.roomLead}
                  </p>
                  {compactLeaders[0] ? (
                    <div className="mt-3 flex items-center gap-3">
                      <UserAvatar
                        name={compactLeaders[0].name}
                        emoji={compactLeaders[0].emoji}
                        avatarUrl={compactLeaders[0].avatarUrl}
                        avatarTheme={compactLeaders[0].avatarTheme}
                        className="h-12 w-12"
                        textClass="text-sm"
                      />
                      <div>
                        <p className="text-lg font-semibold text-white">{compactLeaders[0].name}</p>
                        <p className="text-sm text-arenaMuted">
                          {compactLeaders[0].points} {language === "ru" ? "баллов" : "points"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-arenaMuted">—</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="show-panel mt-5 p-5 text-sm text-arenaMuted">{text.noResults}</div>
          )}
        </div>

        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
          <div className="mt-5 grid gap-3">
            {compactLeaders.length ? compactLeaders.map((row) => (
              <div key={row.id} className="show-panel flex items-center gap-3 p-3">
                <div className="show-rank h-12 w-12 shrink-0 text-lg font-black text-arenaText">{row.rank}</div>
                <UserAvatar
                  name={row.name}
                  emoji={row.emoji}
                  avatarUrl={row.avatarUrl}
                  avatarTheme={row.avatarTheme}
                  className="h-12 w-12 shrink-0"
                  textClass="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-white">{row.name}</p>
                  <p className="text-sm text-arenaMuted">{row.points} {language === "ru" ? "баллов" : "points"}</p>
                </div>
              </div>
            )) : (
              <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
            )}
          </div>
        </div>
      </section>

      <section className="show-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.stageBoard}</p>
            <h3 className="display-copy mt-2 text-2xl font-black">{getStageLabel(stageKey)}</h3>
          </div>
          <Sparkles size={18} className="text-arenaMuted" />
        </div>

        <div className="mt-5 grid gap-3">
          {topActs.length ? topActs.map((act) => (
            <motion.div
              key={act.code}
              layout
              className={`show-panel flex items-center gap-4 p-4 ${act.revealed ? "" : "opacity-80"}`}
            >
              <div className="show-rank h-14 w-14 shrink-0 text-xl font-black text-arenaText">
                {act.rank || "—"}
              </div>
              <ActPoster act={act} compact />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaBeam">
                    {getCountryName(act.code, act.country)}
                  </span>
                  <MovementPill delta={movement[act.code] ?? null} />
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{act.artist}</p>
                <p className="text-sm text-arenaMuted">{act.song}</p>
              </div>
              {act.totalPoints != null ? (
                <div className="text-right">
                  <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">
                    {language === "ru" ? "Очки" : "Points"}
                  </p>
                  <p className="display-copy mt-2 text-3xl font-black text-white">{act.totalPoints}</p>
                </div>
              ) : null}
            </motion.div>
          )) : (
            <div className="show-panel p-5 text-sm text-arenaMuted">{text.noResults}</div>
          )}
        </div>
      </section>
    </div>
  );
}
