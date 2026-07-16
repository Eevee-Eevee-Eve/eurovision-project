'use client';

import { motion, useReducedMotion } from "framer-motion";
import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard } from "../lib/api";
import type { BoardKey, LeaderboardEntry } from "../lib/types";
import { useLanguage } from "./LanguageProvider";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";

const rowTransition = {
  type: "tween",
  duration: 1.55,
  ease: [0.2, 0, 0, 1],
} as const;

const reducedRowTransition = {
  type: "tween",
  duration: 0,
} as const;

function buildRankMap(rows: LeaderboardEntry[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.id] = row.rank;
    return acc;
  }, {});
}

export default function Leaderboard({
  roomSlug,
  boardKey = "overall",
  limit = 6,
}: {
  roomSlug: string;
  boardKey?: BoardKey;
  limit?: number;
}) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { copy, getBoardLabel, getDisplayName, language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const layoutTransition = prefersReducedMotion ? reducedRowTransition : rowTransition;
  const emptyMessage = language === "ru"
    ? "Пока нет участников или отправленных бюллетеней. Таблица появится, как только в комнате начнется игра."
    : "No participants or submitted ballots yet. The table will appear as soon as players join the room.";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchLeaderboard(roomSlug, boardKey);
        if (!active) return;
        setRows(payload);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(copy.leaderboard.loadError);
      }
    };

    load();

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
  }, [boardKey, copy.leaderboard.loadError, roomSlug]);

  useEffect(() => {
    const nextMovement = rows.reduce<Record<string, number | null>>((acc, row) => {
      const previous = previousRanks.current[row.id];
      acc[row.id] = previous ? previous - row.rank : null;
      return acc;
    }, {});

    setMovement(nextMovement);
    previousRanks.current = buildRankMap(rows);
  }, [rows]);

  useEffect(() => {
    if (prefersReducedMotion || !Object.values(movement).some((delta) => typeof delta === "number" && delta !== 0)) {
      return;
    }
    const timeout = window.setTimeout(() => setMovement({}), 2300);
    return () => window.clearTimeout(timeout);
  }, [movement, prefersReducedMotion]);

  return (
    <section className="show-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="label-copy text-[11px] uppercase tracking-[0.35em] text-arenaPulse">{copy.leaderboard.kicker}</p>
          <h2 className="display-copy mt-2 text-2xl font-black md:text-3xl">
            {getBoardLabel(boardKey)} {copy.leaderboard.titleSuffix}
          </h2>
        </div>
        <span className="show-chip label-copy text-[11px] uppercase tracking-[0.28em] text-arenaText">
          <Radio size={14} className="text-arenaDanger" />
          {copy.common.live}
        </span>
      </div>

      {loading ? <p className="mt-5 text-sm text-arenaMuted">{copy.leaderboard.syncing}</p> : null}
      {!loading && error ? <p className="mt-5 text-sm text-rose-200">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="mt-5 rounded-[1.4rem] bg-white/5 px-4 py-4 text-sm text-arenaMuted">
          {emptyMessage}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        {rows.slice(0, limit).map((row) => {
          const rowDelta = movement[row.id] ?? null;
          const isMoving = typeof rowDelta === "number" && rowDelta !== 0;
          return (
          <motion.div
            key={row.id}
            layout="position"
            transition={layoutTransition}
            className={`show-panel scoreboard-motion-row p-4 transition-colors hover:bg-white/[0.08] ${isMoving ? "live-player-row-moving" : ""}`}
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                name={getDisplayName(row.name)}
                avatarUrl={row.avatarUrl}
                avatarTheme={row.avatarTheme}
                className="h-12 w-12 shrink-0"
                textClass="text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="show-chip label-copy px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-arenaBeam">
                    #{row.rank}
                  </span>
                  <MovementPill delta={rowDelta} />
                </div>
                <p className="mt-2 truncate text-lg font-semibold text-white">{getDisplayName(row.name)}</p>
              </div>
              <div className="text-right">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.common.points}</p>
                <p className="display-copy mt-1 text-2xl font-black text-arenaText">{row.points}</p>
              </div>
            </div>
          </motion.div>
          );
        })}
      </div>
    </section>
  );
}
