'use client';

import { motion } from "framer-motion";
import { Medal, Radio, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import type { BoardKey, LeaderboardEntry, RoomDetails, StageKey } from "../lib/types";
import { BoardSwitch } from "./BoardSwitch";
import { useLanguage } from "./LanguageProvider";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";

export function PlayersBoard({ roomSlug, boardKey }: { roomSlug: string; boardKey: BoardKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { copy, getBoardLabel, getStageLabel, language } = useLanguage();
  const { isPhone } = useDeviceTier();

  const emptyMessage = language === "ru"
    ? "В этой комнате пока нет зарегистрированных участников или видимых результатов."
    : "There are no registered participants or visible standings for this room yet.";

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
      return (Object.keys(row.stages) as StageKey[]).reduce((sum, stage) => {
        return sum + row.stages[stage].exactMatches.length;
      }, 0);
    }
    return row.stages[boardKey].exactMatches.length;
  }

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
      <BoardSwitch roomSlug={roomSlug} currentBoard={boardKey} />

      <section className={`grid gap-4 ${isPhone ? "" : "lg:grid-cols-[1.2fr_0.8fr]"}`}>
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.players.kicker}</p>
          <h2 className={`display-copy mt-2 font-black ${isPhone ? "text-3xl" : "text-5xl"}`}>{copy.players.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-arenaMuted md:text-base">{copy.players.description}</p>
        </div>
        <div className={`grid gap-4 ${isPhone ? "grid-cols-2" : "md:grid-cols-3 lg:grid-cols-1"}`}>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.players.playersLabel}</p>
            <p className="display-copy mt-2 text-4xl font-black">{rows.length}</p>
          </div>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.players.leaderLabel}</p>
            <p className="mt-2 text-lg font-semibold text-white">{rows[0]?.name || copy.players.noPlayersYet}</p>
          </div>
          {!isPhone ? (
            <div className="show-card p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.players.liveLabel}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-white">
                <Radio size={15} className="text-arenaDanger" />
                {room?.name || roomSlug}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`grid gap-3 ${isPhone ? "" : "xl:grid-cols-2"}`}>
        {rows.length === 0 ? (
          <div className={`show-card p-5 text-sm text-arenaMuted ${isPhone ? "" : "xl:col-span-2"}`}>
            {emptyMessage}
          </div>
        ) : null}
        {rows.map((row) => (
          <motion.div
            key={row.id}
            layout
            className="show-card p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:p-5"
          >
            <div className="flex items-center gap-4">
              <div className={`show-rank shrink-0 ${isPhone ? "h-14 w-14" : "h-20 w-20"}`}>
                <span className={`display-copy font-black text-arenaText ${isPhone ? "text-2xl" : "text-4xl"}`}>{row.rank}</span>
              </div>
              <UserAvatar
                name={row.name}
                emoji={row.emoji}
                avatarUrl={row.avatarUrl}
                avatarTheme={row.avatarTheme}
                className={`${isPhone ? "h-12 w-12" : "h-16 w-16"} shrink-0`}
                textClass={isPhone ? "text-sm" : "text-lg"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                    {getBoardLabel(boardKey)}
                  </span>
                  <MovementPill delta={movement[row.id] ?? null} />
                </div>
                <h3 className={`display-copy mt-3 font-black ${isPhone ? "text-xl" : "text-3xl"}`}>{row.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-arenaMuted">
                  <span className="show-chip">
                    <Medal size={13} />
                    {copy.players.exactMatches(getMatchCount(row))}
                  </span>
                  <span className="show-chip">
                    <Users size={13} />
                    {row.points} {copy.common.points.toLowerCase()}
                  </span>
                </div>
              </div>
              {!isPhone ? (
                <div className="text-right">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.players.pointsLabel}</p>
                  <p className="display-copy mt-2 text-4xl font-black text-arenaText">{row.points}</p>
                </div>
              ) : null}
            </div>

            {!isPhone ? <div className="show-divider my-4" /> : null}

            <div className="flex flex-wrap gap-2">
              {(Object.keys(row.stages) as StageKey[]).map((stage) => (
                <span
                  key={stage}
                  className={`show-chip text-[11px] uppercase tracking-[0.22em] ${
                    row.stages[stage].locked
                      ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
                      : row.stages[stage].submitted
                        ? "text-white"
                        : "text-arenaMuted"
                  }`}
                >
                  {getStageLabel(stage)} {row.stages[stage].locked ? copy.common.locked : row.stages[stage].submitted ? copy.common.draft : copy.common.empty}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
