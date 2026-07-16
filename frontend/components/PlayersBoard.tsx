'use client';

import { motion, useReducedMotion } from "framer-motion";
import { Medal, Radio, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchPlayerArchive, fetchRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import { resolveMediaUrl } from "../lib/media";
import type { BoardKey, LeaderboardEntry, PlayerArchivePayload, RoomDetails, StageKey } from "../lib/types";
import { BoardSwitch } from "./BoardSwitch";
import { useLanguage } from "./LanguageProvider";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";

const playerRowTransition = {
  type: "tween",
  duration: 1.55,
  ease: [0.2, 0, 0, 1],
} as const;

const reducedRowTransition = {
  type: "tween",
  duration: 0,
} as const;

export function PlayersBoard({ roomSlug, boardKey }: { roomSlug: string; boardKey: BoardKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [selectedArchive, setSelectedArchive] = useState<PlayerArchivePayload | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { copy, getBoardLabel, getDisplayName, getStageLabel, language } = useLanguage();
  const { isPhone, isDesktop } = useDeviceTier();
  const prefersReducedMotion = useReducedMotion();
  const rowTransition = prefersReducedMotion ? reducedRowTransition : playerRowTransition;

  const emptyMessage = language === "ru"
    ? "В этой комнате пока нет зарегистрированных участников или видимых результатов."
    : "There are no registered participants or visible standings for this room yet.";

  const boardDescription = language === "ru"
    ? boardKey === "overall"
      ? "Отдельный экран рейтинга комнаты. Здесь лучше всего видно, кто точнее всего чувствует общий итог конкурса."
      : `Отдельный экран по этапу ${getStageLabel(boardKey)}. Движение мест и точные попадания пересчитываются после каждой публикации результатов.`
    : boardKey === "overall"
      ? "A dedicated room leaderboard screen. It shows who is reading the overall contest most accurately."
      : `A dedicated board for ${getStageLabel(boardKey)}. Position movement and exact hits update after each published result.`;

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

  useEffect(() => {
    if (prefersReducedMotion || !Object.values(movement).some((delta) => typeof delta === "number" && delta !== 0)) {
      return;
    }
    const timeout = window.setTimeout(() => setMovement({}), 2300);
    return () => window.clearTimeout(timeout);
  }, [movement, prefersReducedMotion]);

  function getMatchCount(row: LeaderboardEntry) {
    if (boardKey === "overall") {
      return (Object.keys(row.stages) as StageKey[]).reduce((sum, stage) => sum + row.stages[stage].exactMatches.length, 0);
    }
    return row.stages[boardKey].exactMatches.length;
  }

  async function openPlayerArchive(playerId: string) {
    setArchiveLoading(true);
    setArchiveError("");
    try {
      const payload = await fetchPlayerArchive(roomSlug, playerId);
      setSelectedArchive(payload);
    } catch (playerError) {
      console.error(playerError);
      setArchiveError(language === "ru" ? "Не удалось открыть профиль игрока." : "Unable to open player profile.");
    } finally {
      setArchiveLoading(false);
    }
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
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(129,236,255,0.055),rgba(255,99,194,0.035)_38%,transparent_62%)]" />
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
                  {language === "ru" ? "Синхронизация" : "Sync"}
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
          const rowDelta = movement[row.id] ?? null;
          const isMoving = typeof rowDelta === "number" && rowDelta !== 0;
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
              role="button"
              tabIndex={0}
              onClick={() => void openPlayerArchive(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openPlayerArchive(row.id);
                }
              }}
              className={`show-card scoreboard-motion-row cursor-pointer ${isMoving ? "live-player-row-moving" : ""} overflow-hidden transition-colors hover:border-cyan-200/18 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-arenaBeam/30 ${featured ? "p-5 md:p-6 xl:col-span-2" : "p-4 md:p-5"}`}
            >
              <div className={`flex gap-4 ${featured ? "items-start" : "items-center"}`}>
                <div className={`show-rank shrink-0 ${isPhone ? "h-14 w-14" : featured ? "h-20 w-20" : "h-16 w-16"}`}>
                  <span className={`display-copy font-black text-arenaText ${isPhone ? "text-2xl" : featured ? "text-4xl" : "text-3xl"}`}>{row.rank}</span>
                </div>

                <UserAvatar
                  name={getDisplayName(row.name)}
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
                    <MovementPill delta={rowDelta} />
                  </div>

                  <h3 className={`display-copy mt-3 font-black ${isPhone ? "text-xl" : featured ? "text-3xl" : "text-2xl"}`}>{getDisplayName(row.name)}</h3>

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

      {archiveError ? (
        <div className="rounded-[1.2rem] bg-rose-400/10 p-4 text-sm text-rose-100">{archiveError}</div>
      ) : null}

      {archiveLoading ? (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="show-card p-5 text-sm text-arenaMuted">
            {language === "ru" ? "Открываю профиль игрока..." : "Opening player profile..."}
          </div>
        </div>
      ) : null}

      {selectedArchive ? (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black/68 px-3 py-6 backdrop-blur-sm md:px-6">
          <div className="mx-auto max-w-5xl">
            <section className="show-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <UserAvatar
                    name={getDisplayName(selectedArchive.name)}
                    avatarUrl={selectedArchive.avatarUrl}
                    avatarTheme={selectedArchive.avatarTheme}
                    className="h-14 w-14 shrink-0 md:h-16 md:w-16"
                    textClass="text-base"
                  />
                  <div className="min-w-0">
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                      {language === "ru" ? "Профиль игрока" : "Player profile"}
                    </p>
                    <h3 className="display-copy mt-2 truncate text-3xl font-black text-white md:text-4xl">
                      {getDisplayName(selectedArchive.name)}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
                        #{selectedArchive.rank}
                      </span>
                      <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-white">
                        {selectedArchive.totalPoints} {copy.common.points.toLowerCase()}
                      </span>
                      <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaMuted">
                        {selectedArchive.exactMatchCount} {language === "ru" ? "точных" : "exact"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArchive(null)}
                  className="arena-button-secondary inline-flex h-11 w-11 items-center justify-center px-0"
                  aria-label={language === "ru" ? "Закрыть" : "Close"}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="show-divider my-5" />

              <div className="grid gap-4">
                {(["semi1", "semi2", "final"] as const).map((stage) => {
                  const stageArchive = selectedArchive.stages[stage];
                  return (
                    <section key={`${selectedArchive.id}-${stage}`} className="show-panel p-4 md:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                            {getStageLabel(stage)}
                          </p>
                          <h4 className="mt-2 text-xl font-semibold text-white">
                            {stageArchive
                              ? (language === "ru" ? "Отправленный прогноз" : "Submitted ballot")
                              : (language === "ru" ? "Пока нет открытого прогноза" : "No public ballot yet")}
                          </h4>
                        </div>
                        {stageArchive ? (
                          <div className="flex flex-wrap gap-2">
                            <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-white">
                              {stageArchive.points} {copy.common.points.toLowerCase()}
                            </span>
                            <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaBeam">
                              {stageArchive.exactMatchCount} {language === "ru" ? "точных" : "exact"}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {stageArchive ? (
                        <div className="mt-4 max-h-[26rem] overflow-y-auto pr-1">
                          <div className="grid gap-2">
                            {stageArchive.entries.map((entry) => (
                              <div key={`${selectedArchive.id}-${stage}-${entry.code}`} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-white/8 bg-white/[0.035] px-3 py-2.5">
                                <span className="show-rank h-8 w-8 text-sm">#{entry.predictedRank}</span>
                                <span className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-white/10">
                                  {entry.flagUrl ? (
                                    <img
                                      src={resolveMediaUrl(entry.flagUrl) || undefined}
                                      alt={entry.country}
                                      width={28}
                                      height={28}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">{entry.country}</p>
                                  <p className="truncate text-xs text-arenaMuted">{entry.artist}{entry.song ? ` - ${entry.song}` : ""}</p>
                                </div>
                                <span className="show-chip px-2 py-1 text-[10px] text-arenaMuted">
                                  {language === "ru" ? "итог" : "official"}: {entry.officialRank ? `#${entry.officialRank}` : "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-arenaMuted">
                          {language === "ru"
                            ? "Прогноз появится здесь после того, как этап будет зафиксирован админом и игрок действительно отправил свой порядок."
                            : "The ballot appears here after the stage is fixed by the admin and the player submitted an order."}
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
