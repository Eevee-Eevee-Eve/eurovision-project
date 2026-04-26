'use client';

import { motion } from "framer-motion";
import { Medal, Radio, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import type { BoardKey, LeaderboardEntry, RoomDetails, StageKey } from "../lib/types";
import { BoardSwitch } from "./BoardSwitch";
import { useLanguage } from "./LanguageProvider";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";

const rowTransition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.82,
} as const;

export function PlayersBoard({ roomSlug, boardKey }: { roomSlug: string; boardKey: BoardKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { copy, getBoardLabel, getStageLabel, language } = useLanguage();
  const { isPhone, isDesktop } = useDeviceTier();

  const emptyMessage = language === "ru"
    ? "В этой комнате пока нет зарегистрированных участников или видимых результатов."
    : "There are no registered participants or visible standings for this room yet.";

  const boardDescription = language === "ru"
    ? boardKey === "overall"
      ? "Отдельный экран рейтинга комнаты. Здесь лучше всего видно, кто точнее всего чувствует общий итог конкурса."
      : `Отдельный экран по этапу ${getStageLabel(boardKey)}. Движение мест и точные попадания пересчитываются после каждого нового reveal.`
    : boardKey === "overall"
      ? "A dedicated room leaderboard screen. It shows who is reading the overall contest most accurately."
      : `A dedicated board for ${getStageLabel(boardKey)}. Position movement and exact hits update after every new reveal.`;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [roomPayload, leaderboardPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchLeaderboard(roomSlug, boardKey),
        ]);
        if (!active) return;
        setRoom(roomPayload);
        setRows(leaderboardPayload);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(copy.players.loadError);
      }
    };

    void load();

    const socket = createRoomSocket(roomSlug);
    socket.on("leaderboardUpdate", () => {
      void load();
    });
    socket.on("resultsUpdate", () => {
      void load();
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [boardKey, copy.players.loadError, roomSlug]);

  useEffect(() => {
    const nextMovement = rows.reduce<Record<string, number | null>>((acc, row) => {
      const previousRank = previousRanks.current[row.id];
      acc[row.id] = previousRank ? previousRank - row.rank : null;
      return acc;
    }, {});

    setMovement(nextMovement);
    previousRanks.current = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.id] = row.rank;
      return acc;
    }, {});
  }, [rows]);

  function getMatchCount(row: LeaderboardEntry) {
    if (boardKey === "overall") {
      return (Object.keys(row.stages) as StageKey[]).reduce((sum, stage) => sum + row.stages[stage].exactMatches.length, 0);
    }
    return row.stages[boardKey].exactMatches.length;
  }

  const leader = rows[0] || null;
  const summaryCards = useMemo(
    () => [
      {
        label: copy.players.playersLabel,
        value: String(rows.length),
        tone: "text-arenaBeam",
      },
      {
        label: copy.players.leaderLabel,
        value: leader?.name || "—",
        tone: "text-arenaPulse",
      },
      {
        label: language === "ru" ? "Текущий экран" : "Current board",
        value: getBoardLabel(boardKey),
        tone: "text-white",
      },
      {
        label: copy.players.liveLabel,
        value: room?.name || roomSlug,
        tone: "text-arenaMuted",
      },
    ],
    [boardKey, copy.players.leaderLabel, copy.players.liveLabel, copy.players.playersLabel, getBoardLabel, language, leader?.name, room?.name, roomSlug, rows.length],
  );

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-full bg-white/5" />
        <div className={`grid gap-3 ${isPhone ? "" : "xl:grid-cols-2"}`}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-36 animate-pulse rounded-[1.8rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">{error}</div>;
  }

  return (
    <div className="grid gap-5">
      <section className="show-card overflow-hidden p-5 md:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,236,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,99,194,0.1),transparent_28%),linear-gradient(140deg,rgba(255,255,255,0.04),transparent_40%)]" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.players.kicker}</p>
            <h2 className={`display-copy mt-2 font-black ${isPhone ? "text-3xl" : "text-5xl xl:text-6xl"}`}>{copy.players.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{boardDescription}</p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <BoardSwitch roomSlug={roomSlug} currentBoard={boardKey} />
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                {getBoardLabel(boardKey)}
              </span>
              {room?.showState?.highlightMode ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                  <Radio size={13} />
                  {language === "ru" ? "Live sync" : "Live sync"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="show-panel p-4">
              <p className={`label-copy text-[11px] uppercase tracking-[0.26em] ${item.tone}`}>{item.label}</p>
              <p className="mt-2 line-clamp-1 text-xl font-semibold text-white md:text-2xl">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`grid gap-3 ${isPhone ? "" : "xl:grid-cols-2"}`}>
        {rows.length === 0 ? (
          <div className={`show-card p-5 text-sm text-arenaMuted ${isPhone ? "" : "xl:col-span-2"}`}>
            {emptyMessage}
          </div>
        ) : null}

        {rows.map((row) => {
          const featured = !isPhone && row.rank === 1;
          const stageList = (Object.keys(row.stages) as StageKey[]).map((stage) => {
            const meta = row.stages[stage];
            const tone = meta.locked
              ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
              : meta.submitted
                ? "text-white"
                : "text-arenaMuted";

            return (
              <span key={`${row.id}-${stage}`} className={`show-chip text-[11px] uppercase tracking-[0.22em] ${tone}`}>
                {getStageLabel(stage)} {meta.locked ? copy.common.locked : meta.submitted ? copy.common.draft : copy.common.empty}
              </span>
            );
          });

          return (
            <motion.div
              key={row.id}
              layout="position"
              transition={rowTransition}
              className={`show-card overflow-hidden ${featured ? "p-5 md:p-6 xl:col-span-2" : "p-4 md:p-5"}`}
            >
              <div className={`flex gap-4 ${featured ? "items-start" : "items-center"}`}>
                <div className={`show-rank shrink-0 ${isPhone ? "h-14 w-14" : featured ? "h-20 w-20" : "h-16 w-16"}`}>
                  <span className={`display-copy font-black text-arenaText ${isPhone ? "text-2xl" : featured ? "text-4xl" : "text-3xl"}`}>{row.rank}</span>
                </div>

                <UserAvatar
                  name={row.name}
                  emoji={row.emoji}
                  avatarUrl={row.avatarUrl}
                  avatarTheme={row.avatarTheme}
                  className={`${isPhone ? "h-12 w-12" : featured ? "h-16 w-16" : "h-14 w-14"} shrink-0`}
                  textClass={isPhone ? "text-sm" : "text-lg"}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                      {getBoardLabel(boardKey)}
                    </span>
                    <MovementPill delta={movement[row.id] ?? null} />
                  </div>

                  <h3 className={`display-copy mt-3 font-black ${isPhone ? "text-xl" : featured ? "text-3xl" : "text-2xl"}`}>{row.name}</h3>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-arenaMuted">
                    <span className="show-chip">
                      <Medal size={13} />
                      {copy.players.exactMatches(getMatchCount(row))}
                    </span>
                    <span className="show-chip">
                      <Trophy size={13} />
                      {row.points} {copy.common.points.toLowerCase()}
                    </span>
                  </div>
                </div>

                {!isPhone ? (
                  <div className="text-right">
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.players.pointsLabel}</p>
                    <p className={`display-copy mt-2 font-black text-arenaText ${featured ? "text-5xl" : "text-4xl"}`}>{row.points}</p>
                  </div>
                ) : null}
              </div>

              <div className={`mt-4 flex flex-wrap gap-2 ${featured ? "pt-1" : ""}`}>
                {stageList}
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
