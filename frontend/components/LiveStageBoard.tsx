'use client';

import { motion } from "framer-motion";
import { Maximize2, Minimize2, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchRoom, fetchStageResults } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import { resolveMediaUrl } from "../lib/media";
import type { ActEntry, LeaderboardEntry, RoomDetails, StageKey } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { MovementPill } from "./MovementPill";
import { UserAvatar } from "./UserAvatar";
import { useLanguage } from "./LanguageProvider";

const rowTransition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.8,
} as const;

const FINAL_STAGE_COLUMN_SIZE = 10;

function splitFinalStageColumns(rows: ActEntry[]) {
  const columns: ActEntry[][] = [];
  for (let index = 0; index < rows.length; index += FINAL_STAGE_COLUMN_SIZE) {
    columns.push(rows.slice(index, index + FINAL_STAGE_COLUMN_SIZE));
  }
  return columns;
}

export function LiveStageBoard({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [results, setResults] = useState<ActEntry[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [leaderMovement, setLeaderMovement] = useState<Record<string, number | null>>({});
  const [mobilePlayersMode, setMobilePlayersMode] = useState<"focus" | "all">("focus");
  const [desktopBoardMode, setDesktopBoardMode] = useState<"split" | "players">("split");
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const previousLeaderRanks = useRef<Record<string, number>>({});
  const { getCountryName, getDisplayName, getStageLabel, language } = useLanguage();
  const { account } = useAccount();
  const { isPhone, isTablet, isDesktop } = useDeviceTier();
  const isSemi = stageKey === "semi1" || stageKey === "semi2";
  const isFinal = stageKey === "final";

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
        setError(language === "ru" ? "Не удалось загрузить экран результатов." : "Unable to load the results screen.");
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

  useEffect(() => {
    const nextMovement = leaders.reduce<Record<string, number | null>>((acc, row) => {
      const previousRank = previousLeaderRanks.current[row.id];
      acc[row.id] = previousRank ? previousRank - row.rank : null;
      return acc;
    }, {});

    setLeaderMovement(nextMovement);
    previousLeaderRanks.current = leaders.reduce<Record<string, number>>((acc, row) => {
      acc[row.id] = row.rank;
      return acc;
    }, {});
  }, [leaders]);

  const text = language === "ru"
    ? {
        kicker: "Экран результатов",
        title: isSemi ? "Кто проходит в финал" : "Результаты комнаты",
        mobileTitle: getStageLabel(stageKey),
        desktopDescription: isSemi
          ? "Линия прохода и участники комнаты на одном экране."
          : "Большой экран для движения мест, очков и рейтинга друзей.",
        description: isSemi
          ? "На большом экране важна линия прохода в финал, а на телефоне удобнее сначала видеть друзей."
          : "На большом экране важны движение мест и очки, а на телефоне сначала лучше видеть участников комнаты.",
        progressLabel: isSemi ? "Прошло дальше" : "Открыто стран",
        roomPlayers: "Участники комнаты",
        roomHint: isSemi
          ? "Кто из друзей сейчас точнее угадывает полуфинал"
          : "Кто из друзей лучше чувствует общий итог",
        stageBoard: isSemi ? "Линия прохода" : "Таблица этапа",
        stageHint: isSemi
          ? "В мобильной версии только опубликованные проходы"
          : "В мобильной версии главное - места, очки и движение",
        noResults: isSemi ? "Пока нет опубликованных проходов." : "Пока нет опубликованных результатов этапа.",
        qualifiersTitle: "Проходят в финал",
        points: "баллов",
        qualified: "В финале",
        outside: "Ниже линии",
        playersCount: "Игроков",
        leaderLabel: "Лидер",
        finalPoints: "Очки",
        morePlayers: (count: number) => `И еще ${count} участников в общем рейтинге`,
        focusMode: "В фокусе",
        allMode: "Все",
      }
    : {
        kicker: "Results screen",
        title: isSemi ? "Who qualifies for the final" : "Room results",
        mobileTitle: getStageLabel(stageKey),
        desktopDescription: isSemi
          ? "Qualification line and room ranking on one clean screen."
          : "A large-screen view for movement, points and the room leaderboard.",
        description: isSemi
          ? "On wide screens the key thing is the qualification line. On phones it is easier to keep room participants first and published qualifiers second."
          : "On wide screens the key thing is table movement and points. On phones room participants come first and the stage table stays compact.",
        progressLabel: isSemi ? "Qualified" : "Countries shown",
        roomPlayers: "Room participants",
        roomHint: isSemi
          ? "Who is reading the semi-final best so far"
          : "Who is reading the overall result best so far",
        stageBoard: isSemi ? "Qualification line" : "Stage standings",
        stageHint: isSemi
          ? "Mobile keeps only the published qualifiers in focus"
          : "Mobile keeps rank, points and movement in focus",
        noResults: isSemi ? "No published qualifiers yet." : "No published results yet.",
        qualifiersTitle: "Qualified",
        points: "points",
        qualified: "Qualified",
        outside: "Below the line",
        playersCount: "Players",
        leaderLabel: "Leader",
        finalPoints: "Points",
        morePlayers: (count: number) => `And ${count} more participants in the full ranking`,
        focusMode: "Focus",
        allMode: "All",
      };

  const desktopModeCopy = language === "ru"
    ? {
        splitMode: "Страны + игроки",
        playersOnlyMode: "Только игроки",
        boardModeLabel: "Режим экрана",
      }
    : {
        splitMode: "Countries + players",
        playersOnlyMode: "Players only",
        boardModeLabel: "Screen mode",
      };

  const cutoffCopy = language === "ru"
    ? {
        label: "Линия прохода",
        inLabel: "В финале",
        outLabel: "Ниже линии",
      }
    : {
        label: "Qualification line",
        inLabel: "Qualified",
        outLabel: "Below the line",
      };

  const qualificationCutoff = room?.stageMeta?.[stageKey]?.qualificationCutoff ?? null;

  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) => {
        const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
        const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
        return leftRank - rightRank;
      }),
    [results]
  );

  const qualifierRows = useMemo(
    () => sortedResults.filter((act) =>
      typeof act.rank === "number"
      && act.rank > 0
      && (!qualificationCutoff || act.rank <= qualificationCutoff)
    ),
    [qualificationCutoff, sortedResults]
  );

  const stageRows = useMemo(() => {
    const source = isSemi && !isDesktop ? qualifierRows : sortedResults;
    if (isDesktop) return source;
    const limit = isTablet ? 8 : 7;
    return source.slice(0, limit);
  }, [isDesktop, isSemi, isTablet, qualifierRows, sortedResults]);

  const finalStageColumns = useMemo(() => {
    if (!isDesktop || !isFinal) return [];
    return splitFinalStageColumns(stageRows);
  }, [isDesktop, isFinal, stageRows]);

  const roomRows = useMemo(() => {
    if (isDesktop) return leaders;
    return leaders.slice(0, isTablet ? 6 : 8);
  }, [isDesktop, isTablet, leaders]);
  const currentUserIndex = useMemo(() => {
    if (!account) return -1;
    return leaders.findIndex((row) => row.id === account.id);
  }, [account, leaders]);

  const mobileFocusedRows = useMemo(() => {
    if (!isPhone) return roomRows;
    if (leaders.length <= 8) return leaders;

    const picked = new Map<string, LeaderboardEntry>();
    const leader = leaders[0];
    if (leader) {
      picked.set(leader.id, leader);
    }

    if (currentUserIndex >= 0) {
      const selfRow = leaders[currentUserIndex];
      if (selfRow) {
        picked.set(selfRow.id, selfRow);
      }
    }

    for (const row of leaders) {
      if (picked.size >= 6) break;
      picked.set(row.id, row);
    }

    return Array.from(picked.values()).sort((left, right) => left.rank - right.rank);
  }, [currentUserIndex, isPhone, leaders, roomRows]);

  const mobileRoomRows = useMemo(() => {
    if (!isPhone) return roomRows;
    return mobilePlayersMode === "all" ? leaders : mobileFocusedRows;
  }, [isPhone, leaders, mobileFocusedRows, mobilePlayersMode, roomRows]);

  const progressValue = isSemi
    ? `${qualifierRows.length}/${qualificationCutoff || 10}`
    : `${results.filter((act) => act.revealed).length}/${results.length}`;

  useEffect(() => {
    if (!isPhone) return;
    if (leaders.length <= 8) {
      setMobilePlayersMode("all");
      return;
    }
    setMobilePlayersMode((current) => (current === "all" ? current : "focus"));
  }, [isPhone, leaders.length]);

  useEffect(() => {
    if (!isDesktop) return;
    const saved = window.localStorage.getItem("desktop_live_mode");
    if (saved === "split" || saved === "players") {
      setDesktopBoardMode(saved);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    window.localStorage.setItem("desktop_live_mode", desktopBoardMode);
  }, [desktopBoardMode, isDesktop]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreenActive(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch (fullscreenError) {
      console.error(fullscreenError);
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        label: text.progressLabel,
        value: progressValue,
        tone: "text-arenaBeam",
      },
      {
        label: text.playersCount,
        value: String(leaders.length),
        tone: "text-white",
      },
      {
        label: text.leaderLabel,
        value: leaders[0]?.name || "-",
        tone: "text-arenaPulse",
      },
    ],
    [leaders, progressValue, text.leaderLabel, text.playersCount, text.progressLabel]
  );

  const desktopCompactTop = isDesktop;
  const desktopPlayersOnlyMode = isDesktop && desktopBoardMode === "players";

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

  const renderRoomRow = (row: LeaderboardEntry, compact = false, dense = false) => {
    const isCurrentUser = Boolean(account && row.id === account.id);
    const rowDelta = leaderMovement[row.id] ?? null;
    const isMoving = typeof rowDelta === "number" && rowDelta !== 0;
    const isTopThree = row.rank <= 3;
    const podiumClass = row.rank === 1 ? "live-podium-1" : row.rank === 2 ? "live-podium-2" : row.rank === 3 ? "live-podium-3" : "";

    return (
      <motion.div
        key={row.id}
        layout="position"
        className={`show-panel live-results-row live-room-player-row ${isMoving ? "live-results-row-moving" : ""} ${isTopThree ? `live-top3-row ${podiumClass}` : ""} ${dense ? "h-[3.1rem] px-2 py-[0.15rem]" : compact ? "px-3 py-2" : "p-3 md:p-4"} flex items-center ${dense ? "gap-1.5" : "gap-3 md:gap-4"} ${
          isCurrentUser
            ? "border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(129,236,255,0.16),transparent_52%),rgba(255,255,255,0.04)] shadow-[0_0_0_1px_rgba(129,236,255,0.08),0_24px_40px_rgba(44,86,120,0.2)]"
            : ""
        }`}
        animate={isCurrentUser ? {
          boxShadow: [
            "0 0 0 1px rgba(129,236,255,0.08), 0 22px 36px rgba(44,86,120,0.18)",
            "0 0 0 1px rgba(129,236,255,0.18), 0 28px 48px rgba(85,154,255,0.28)",
            "0 0 0 1px rgba(129,236,255,0.08), 0 22px 36px rgba(44,86,120,0.18)",
          ],
        } : undefined}
        transition={isCurrentUser ? { layout: rowTransition, duration: 3.2, repeat: Infinity, ease: "easeInOut" } : rowTransition}
      >
        <div className={`show-rank shrink-0 ${isTopThree ? "live-top3-rank" : ""} ${dense ? "h-[2rem] w-[2rem] text-[13px]" : compact ? "h-[2.125rem] w-[2.125rem] text-sm" : "h-10 w-10 text-base md:h-12 md:w-12 md:text-lg"} font-black text-arenaText`}>
          {row.rank}
        </div>
        <UserAvatar
          name={getDisplayName(row.name)}
          avatarUrl={row.avatarUrl}
          avatarTheme={row.avatarTheme}
          className={`${dense ? "h-[2rem] w-[2rem]" : compact ? "h-9 w-9" : "h-10 w-10 md:h-12 md:w-12"} shrink-0`}
          textClass="text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold text-white ${dense ? "text-[12px] leading-4" : compact ? "text-[15px]" : "text-base md:text-lg"}`}>{getDisplayName(row.name)}</p>
          {isDesktop && (compact || dense) ? null : (
            <p className={`${compact ? "text-[12px]" : "text-sm"} text-arenaMuted`}>
              {row.points} {text.points}
            </p>
          )}
        </div>
        <MovementPill delta={rowDelta} compact={compact || dense} />
      </motion.div>
    );
  };

  const renderStageDesktopRow = (act: ActEntry) => {
    const isQualifier = isSemi && typeof act.rank === "number" && act.rank > 0 && (!qualificationCutoff || act.rank <= qualificationCutoff);
    const rowDelta = movement[act.code] ?? null;
    const isMoving = typeof rowDelta === "number" && rowDelta !== 0;
    const isTopThree = typeof act.rank === "number" && act.rank > 0 && act.rank <= 3;
    const isCutoffRow = isSemi && qualificationCutoff != null && act.rank === qualificationCutoff;
    const isBelowCutoffRow = isSemi && qualificationCutoff != null && act.rank === qualificationCutoff + 1;
    const podiumClass = act.rank === 1 ? "live-podium-1" : act.rank === 2 ? "live-podium-2" : act.rank === 3 ? "live-podium-3" : "";
    const flagUrl = resolveMediaUrl(act.flagUrl);
    const countryName = getCountryName(act.code, act.country);
    const desktopRowClass = isFinal
      ? "live-final-readable-row flex items-center gap-2 px-2.5 py-1.5 md:px-3"
      : "flex h-[3.05rem] items-center gap-1.5 px-2 py-[0.15rem] md:px-2 md:py-[0.2rem]";

    return (
      <motion.div
        key={act.code}
        layout="position"
        transition={rowTransition}
        className={`show-panel live-results-row ${desktopRowClass} ${isMoving ? "live-results-row-moving" : ""} ${isTopThree ? `live-top3-row ${podiumClass}` : ""} ${isCutoffRow ? "live-cutoff-row" : ""} ${isBelowCutoffRow ? "live-cutoff-below-row" : ""} ${!isSemi && act.revealed ? "live-final-row" : ""} ${!isSemi && isMoving ? "live-final-row-moving" : ""} ${
          isQualifier
            ? "border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(70,220,165,0.12),transparent_46%),rgba(255,255,255,0.03)]"
            : ""
        } ${act.revealed ? "" : "opacity-80"}`}
      >
        <div className={`show-rank shrink-0 font-black ${isFinal ? "h-[2.25rem] w-[2.25rem] text-[14px]" : "h-[2rem] w-[2rem] text-[13px] md:h-[2.1rem] md:w-[2.1rem] md:text-[14px]"} ${isTopThree ? "live-top3-rank" : ""} ${isQualifier ? "border-emerald-300/20 shadow-[0_0_0_1px_rgba(70,220,165,0.08),0_18px_32px_rgba(22,118,89,0.18)] text-emerald-100" : "text-arenaText"}`}>
          {act.rank || "-"}
        </div>
        <div className={`min-w-0 flex flex-1 ${isFinal ? "items-center gap-2" : "items-center gap-2"}`}>
          <div className={`min-w-0 flex flex-1 ${isFinal ? "items-center" : "items-center gap-1.5"}`}>
            <div className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 ${isFinal ? "live-final-country shrink-0" : ""}`}>
              <img
                src={flagUrl || undefined}
                alt=""
                className={`${isFinal ? "h-[1.15rem] w-[1.15rem]" : "h-4 w-4"} shrink-0 rounded-full object-cover ring-1 ring-white/15`}
                loading="lazy"
              />
              <span className={`truncate font-semibold text-white ${isFinal ? "text-[13px] md:text-[14px]" : "text-[12px] md:text-[13px]"}`}>{countryName}</span>
            </div>
            {isFinal ? (
              null
            ) : (
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="truncate text-[12px] font-medium text-white/92 md:text-[13px]">{act.artist}</span>
                {act.song ? (
                  <span className="text-[11px] text-arenaMuted md:text-[12px]" aria-hidden="true">
                    -
                  </span>
                ) : null}
                <span className="truncate text-[11px] text-arenaMuted md:text-[12px]">
                  {act.song}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isQualifier ? (
              <span className="show-chip px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                <Sparkles size={10} />
                {text.qualified}
              </span>
            ) : null}
            {!isSemi ? <MovementPill delta={rowDelta} compact /> : null}
          </div>
        </div>
        {!isSemi && act.totalPoints != null ? (
          <div className={`ml-1 shrink-0 text-right ${isFinal ? "w-[3.2rem]" : "w-[3.2rem]"} ${isMoving ? "live-final-points live-final-points-hot" : "live-final-points"}`}>
            <p className="label-copy text-[7px] uppercase tracking-[0.16em] text-arenaMuted">
              {text.finalPoints}
            </p>
            <p className={`display-copy font-black text-white ${isFinal ? "text-[15px] md:text-[16px]" : "text-[14px] md:text-[16px]"}`}>{act.totalPoints}</p>
          </div>
        ) : null}
      </motion.div>
    );
  };

  const renderCompactStageRow = (act: ActEntry) => {
    const isQualifier = typeof act.rank === "number" && act.rank > 0 && (!qualificationCutoff || act.rank <= qualificationCutoff);

    return (
      <motion.div
        key={`compact-${act.code}`}
        layout="position"
        transition={rowTransition}
        className={`show-panel-muted flex items-center gap-3 px-3 py-2.5 ${
          isSemi && isQualifier
            ? "border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(70,220,165,0.12),transparent_46%),rgba(255,255,255,0.03)]"
            : ""
        }`}
      >
        <div className={`show-rank h-9 w-9 shrink-0 text-sm ${isSemi && isQualifier ? "border-emerald-300/20 text-emerald-100" : "text-arenaText"}`}>
          {act.rank || "-"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{getCountryName(act.code, act.country)}</p>
            {isSemi && isQualifier ? (
              <span className="show-chip px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                <Sparkles size={10} />
                {text.qualified}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-arenaMuted">
            {act.artist}{act.song ? ` - ${act.song}` : ""}
          </p>
        </div>
        {isSemi ? null : (
          <div className="flex shrink-0 items-center gap-2">
            {typeof act.totalPoints === "number" ? (
              <span className="text-sm font-semibold text-white">{act.totalPoints}</span>
            ) : null}
            <MovementPill delta={movement[act.code] ?? null} compact />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="grid gap-5">
      <section className={`${desktopCompactTop ? "show-panel px-4 py-3 md:px-5" : `show-card ${isPhone ? "p-3" : "p-5 md:p-6 xl:p-7"}`}`}>
        {!isPhone && !desktopCompactTop ? <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaDanger">{text.kicker}</p> : null}

        {isPhone ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display-copy text-[1.55rem] font-black leading-[0.95]">
              {text.mobileTitle}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isSemi && qualificationCutoff ? (
                <span className="show-chip px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                  <Sparkles size={12} />
                  {language === "ru" ? `Места 1-${qualificationCutoff}` : `Places 1-${qualificationCutoff}`}
                </span>
              ) : null}
              <span className="show-chip px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-arenaMuted">
                {text.progressLabel}: {progressValue}
              </span>
            </div>
          </div>
        ) : desktopCompactTop ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaDanger">
                {text.kicker}
              </span>
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                {getStageLabel(stageKey)}
              </span>
              {isSemi && qualificationCutoff ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                  <Sparkles size={13} />
                  {language === "ru" ? `Места 1-${qualificationCutoff}` : `Places 1-${qualificationCutoff}`}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setDesktopBoardMode("split")}
                  className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition ${
                    desktopBoardMode === "split"
                      ? "bg-white/[0.12] text-white shadow-glow"
                      : "text-arenaMuted hover:text-white"
                  }`}
                  aria-label={desktopModeCopy.splitMode}
                  title={desktopModeCopy.splitMode}
                >
                  {desktopModeCopy.splitMode}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopBoardMode("players")}
                  className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition ${
                    desktopBoardMode === "players"
                      ? "bg-white/[0.12] text-white shadow-glow"
                      : "text-arenaMuted hover:text-white"
                  }`}
                  aria-label={desktopModeCopy.playersOnlyMode}
                  title={desktopModeCopy.playersOnlyMode}
                >
                  {desktopModeCopy.playersOnlyMode}
                </button>
              </div>
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {text.progressLabel}: {progressValue}
              </span>
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {text.playersCount}: {leaders.length}
              </span>
              {leaders[0]?.name ? (
                <span className="show-chip max-w-[22rem] truncate text-[11px] uppercase tracking-[0.18em] text-arenaPulse">
                  {text.leaderLabel}: {getDisplayName(leaders[0].name)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaText transition hover:border-cyan-200/20 hover:text-white"
                aria-label={fullscreenActive ? (language === "ru" ? "Выйти из полноэкранного режима" : "Exit fullscreen") : (language === "ru" ? "На весь экран" : "Fullscreen")}
                title={fullscreenActive ? (language === "ru" ? "Выйти из полноэкранного режима" : "Exit fullscreen") : (language === "ru" ? "На весь экран" : "Fullscreen")}
              >
                {fullscreenActive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {language === "ru" ? "Экран" : "Screen"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <h2 className="display-copy text-4xl font-black leading-[0.9] md:text-6xl">
                  {getStageLabel(stageKey)}
                </h2>
                {!isSemi ? (
                  <span className="show-chip mb-1 text-[11px] uppercase tracking-[0.22em] text-arenaPulse">
                    {text.stageBoard}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
                {text.desktopDescription}
              </p>
            </div>

            <div className="flex max-w-xl flex-wrap gap-2 xl:justify-end">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                {getStageLabel(stageKey)}
              </span>
              {isSemi && qualificationCutoff ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                  <Sparkles size={13} />
                  {language === "ru" ? `Места 1-${qualificationCutoff}` : `Places 1-${qualificationCutoff}`}
                </span>
              ) : null}
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {text.progressLabel}: {progressValue}
              </span>
            </div>
          </div>
        )}

        {!isPhone && !desktopCompactTop ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((item) => (
              <div key={item.label} className="show-panel p-4">
                <p className={`label-copy text-[11px] uppercase tracking-[0.26em] ${item.tone}`}>{item.label}</p>
                <p className="mt-2 line-clamp-1 text-xl font-semibold text-white md:text-2xl">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {isDesktop ? (
        desktopPlayersOnlyMode ? (
          <section className="grid gap-4">
            <div className="show-card flex h-[calc(100vh-10.75rem)] flex-col p-3 md:p-4 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
                </div>
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                  <Users size={13} />
                  {leaders.length}
                </span>
              </div>
              <div className="show-scroll mt-3 grid auto-rows-max content-start gap-2 overflow-y-auto pr-1 xl:grid-cols-3 2xl:grid-cols-4">
                {roomRows.length ? roomRows.map((row) => renderRoomRow(row, true, true)) : (
                  <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className={`grid items-start gap-4 ${isFinal ? "xl:grid-cols-[minmax(0,2.75fr)_minmax(18rem,0.65fr)]" : "xl:grid-cols-[minmax(0,2.15fr)_minmax(18rem,0.85fr)]"}`}>
            <div className="show-card flex h-[calc(100vh-10.75rem)] flex-col p-3 md:p-4 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.stageBoard}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {isSemi ? (
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                      <Sparkles size={13} />
                      {text.qualifiersTitle}
                    </span>
                  ) : null}
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                    {text.progressLabel}: {progressValue}
                  </span>
                </div>
              </div>

              {isFinal ? (
                <div className="mt-3 min-h-0 flex-1 overflow-hidden pr-1">
                  {stageRows.length ? (
                    <div className="live-final-stage-columns">
                      {finalStageColumns.map((column, columnIndex) => (
                        <div key={`final-column-${columnIndex}`} className="live-final-stage-column grid auto-rows-max content-start">
                          {column.map((act) => renderStageDesktopRow(act))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="show-panel p-5 text-sm text-arenaMuted">{text.noResults}</div>
                  )}
                </div>
              ) : (
                <div className={`show-scroll mt-3 grid flex-1 auto-rows-max content-start overflow-y-auto pr-1 ${isSemi ? "gap-1 xl:grid-cols-2" : "gap-0.75 xl:grid-cols-4"}`}>
                  {stageRows.length ? stageRows.flatMap((act) => {
                    const row = renderStageDesktopRow(act);
                    if (!isSemi || qualificationCutoff == null || act.rank !== qualificationCutoff) {
                      return [row];
                    }

                    return [
                      row,
                      <div key={`cutoff-divider-${act.code}`} className="show-panel live-cutoff-divider px-4 py-3 xl:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-emerald-100">
                            {cutoffCopy.label}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                            <span className="show-chip px-3 py-1 text-emerald-100">{cutoffCopy.inLabel}</span>
                            <span className="show-chip px-3 py-1 text-arenaMuted">{cutoffCopy.outLabel}</span>
                          </div>
                        </div>
                      </div>,
                    ];
                  }) : (
                    <div className="show-panel p-5 text-sm text-arenaMuted">{text.noResults}</div>
                  )}
                </div>
              )}
            </div>

            <div className="show-card flex h-[calc(100vh-10.75rem)] flex-col p-3 md:p-4 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
                </div>
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                  <Users size={13} />
                  {leaders.length}
                </span>
              </div>
              <div className="show-scroll mt-3 grid auto-rows-max content-start gap-1 overflow-y-auto pr-1">
                {roomRows.length ? roomRows.map((row) => renderRoomRow(row, true, true)) : (
                  <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
                )}
              </div>
            </div>
          </section>
        )
      ) : (
        <section className="grid gap-4">
          <div className="show-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
              </div>
              <div className="flex items-center gap-2">
                {leaders.length > 8 ? (
                  <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                    <button
                      type="button"
                      onClick={() => setMobilePlayersMode("focus")}
                      className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                        mobilePlayersMode === "focus"
                          ? "bg-white/[0.1] text-white shadow-glow"
                          : "text-arenaMuted"
                      }`}
                    >
                      {text.focusMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePlayersMode("all")}
                      className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                        mobilePlayersMode === "all"
                          ? "bg-white/[0.1] text-white shadow-glow"
                          : "text-arenaMuted"
                      }`}
                    >
                      {text.allMode}
                    </button>
                  </div>
                ) : null}
                <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaMuted">
                  <Trophy size={12} />
                  {leaders.length}
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-2.5">
              {mobileRoomRows.length ? mobileRoomRows.map((row) => renderRoomRow(row, true)) : (
                <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
              )}
            </div>
            {mobilePlayersMode === "focus" && leaders.length > mobileRoomRows.length ? (
              <p className="mt-3 text-xs leading-6 text-arenaMuted">
                {text.morePlayers(leaders.length - mobileRoomRows.length)}
              </p>
            ) : null}
          </div>

          <div className="show-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`label-copy text-[11px] uppercase tracking-[0.32em] ${isSemi ? "text-emerald-100" : "text-arenaPulse"}`}>
                  {text.stageBoard}
                </p>
                <p className="mt-1 text-xs leading-6 text-arenaMuted">
                  {text.stageHint}
                </p>
              </div>
              {isSemi && qualificationCutoff ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                  <Sparkles size={12} />
                  {qualificationCutoff}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2.5">
              {stageRows.length ? stageRows.map(renderCompactStageRow) : (
                <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
