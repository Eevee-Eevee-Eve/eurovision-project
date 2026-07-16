'use client';

import { motion, useReducedMotion } from "framer-motion";
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
import { ArtistProfileModal } from "./ArtistProfileModal";

const countryRowTransition = {
  type: "tween",
  duration: 1.22,
  ease: [0.2, 0, 0, 1],
} as const;

const playerRowTransition = {
  type: "tween",
  duration: 1.55,
  ease: [0.2, 0, 0, 1],
} as const;

const reducedRowTransition = {
  type: "tween",
  duration: 0,
} as const;

const STAGE_COLUMN_COUNT = 2;

function splitStageColumns(rows: ActEntry[], columnCount = STAGE_COLUMN_COUNT) {
  const columns: ActEntry[][] = [];
  const columnSize = Math.ceil(rows.length / columnCount);
  for (let index = 0; index < rows.length; index += columnSize) {
    columns.push(rows.slice(index, index + columnSize));
  }
  return columns;
}

export function LiveStageBoard({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [results, setResults] = useState<ActEntry[]>([]);
  const [displayResults, setDisplayResults] = useState<ActEntry[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [countryHighlight, setCountryHighlight] = useState<Record<string, boolean>>({});
  const [leaderMovement, setLeaderMovement] = useState<Record<string, number | null>>({});
  const [mobilePlayersMode, setMobilePlayersMode] = useState<"focus" | "all">("focus");
  const [desktopBoardMode, setDesktopBoardMode] = useState<"split" | "players">("split");
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [softFullscreenActive, setSoftFullscreenActive] = useState(false);
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const previousLeaderRanks = useRef<Record<string, number>>({});
  const displayResultsRef = useRef<ActEntry[]>([]);
  const countryMoveTimeout = useRef<number | null>(null);
  const countryClearTimeout = useRef<number | null>(null);
  const { getCountryName, getDisplayName, getStageLabel, language } = useLanguage();
  const { account } = useAccount();
  const { isPhone, isTablet, isDesktop } = useDeviceTier();
  const prefersReducedMotion = useReducedMotion();
  const countryTransition = prefersReducedMotion ? reducedRowTransition : countryRowTransition;
  const playerTransition = prefersReducedMotion ? reducedRowTransition : playerRowTransition;
  const isSemi = stageKey === "semi1" || stageKey === "semi2";
  const isFinal = stageKey === "final";
  const activeShowState = room?.showState?.stageKey === stageKey ? room.showState : null;
  const activeShowStatus = activeShowState?.statusText || "";
  const activeShowHighlight = activeShowState?.highlightMode || null;
  const activeShowActCode = activeShowState?.currentActCode || "";
  const stageAccentActive = activeShowHighlight === "stage";

  const commitDisplayResults = (nextResults: ActEntry[]) => {
    displayResultsRef.current = nextResults;
    setDisplayResults(nextResults);
  };

  const commitRankSnapshot = (nextResults: ActEntry[]) => {
    previousRanks.current = nextResults.reduce<Record<string, number>>((acc, act) => {
      if (act.rank) {
        acc[act.code] = act.rank;
      }
      return acc;
    }, {});
  };

  const clearCountryTimers = () => {
    if (countryMoveTimeout.current) {
      window.clearTimeout(countryMoveTimeout.current);
      countryMoveTimeout.current = null;
    }
    if (countryClearTimeout.current) {
      window.clearTimeout(countryClearTimeout.current);
      countryClearTimeout.current = null;
    }
  };

  const applyResultsUpdate = (nextResults: ActEntry[], animate = true) => {
    clearCountryTimers();
    setResults(nextResults);

    const currentResults = displayResultsRef.current;
    const hasRenderedResults = currentResults.length > 0 || Object.keys(previousRanks.current).length > 0;
    if (!animate || prefersReducedMotion || !hasRenderedResults) {
      setMovement({});
      setCountryHighlight({});
      commitDisplayResults(nextResults);
      commitRankSnapshot(nextResults);
      return;
    }

    const currentByCode = new Map(currentResults.map((act) => [act.code, act]));
    const nextByCode = new Map(nextResults.map((act) => [act.code, act]));
    const nextMovement = nextResults.reduce<Record<string, number | null>>((acc, act) => {
      const previousRank = previousRanks.current[act.code] ?? currentByCode.get(act.code)?.rank;
      acc[act.code] = previousRank && act.rank ? previousRank - act.rank : null;
      return acc;
    }, {});

    const nextHighlight: Record<string, boolean> = {};
    const hasVisibleChange = nextResults.some((act) => {
      const current = currentByCode.get(act.code);
      const rankDelta = nextMovement[act.code];
      const changed = Boolean(rankDelta)
        || current?.totalPoints !== act.totalPoints
        || current?.juryPoints !== act.juryPoints
        || current?.telePoints !== act.telePoints
        || current?.revealed !== act.revealed;
      if (changed) {
        nextHighlight[act.code] = true;
      }
      return changed;
    });

    if (!hasVisibleChange) {
      setMovement({});
      setCountryHighlight({});
      commitDisplayResults(nextResults);
      commitRankSnapshot(nextResults);
      return;
    }

    const heldResults = currentResults.length
      ? [
          ...currentResults.map((act) => nextByCode.get(act.code) || act),
          ...nextResults.filter((act) => !currentByCode.has(act.code)),
        ]
      : nextResults;

    commitDisplayResults(heldResults);
    setMovement(nextMovement);
    setCountryHighlight(nextHighlight);
    commitRankSnapshot(nextResults);

    countryMoveTimeout.current = window.setTimeout(() => {
      commitDisplayResults(nextResults);
    }, 620);

    countryClearTimeout.current = window.setTimeout(() => {
      setMovement({});
      setCountryHighlight({});
      countryMoveTimeout.current = null;
      countryClearTimeout.current = null;
    }, 2920);
  };

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
        applyResultsUpdate(resultsPayload.results, false);
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
      applyResultsUpdate(payload.results);
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
      clearCountryTimers();
      socket.close();
    };
  }, [language, prefersReducedMotion, roomSlug, stageKey]);

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

  useEffect(() => {
    if (prefersReducedMotion || !Object.values(leaderMovement).some((delta) => typeof delta === "number" && delta !== 0)) {
      return;
    }
    const timeout = window.setTimeout(() => setLeaderMovement({}), 2300);
    return () => window.clearTimeout(timeout);
  }, [leaderMovement, prefersReducedMotion]);

  useEffect(() => {
    if (!activeShowState) return;
    if (activeShowHighlight === "players") {
      setDesktopBoardMode("players");
    }
    if (activeShowHighlight === "results" || activeShowHighlight === "stage" || activeShowHighlight === "current_act") {
      setDesktopBoardMode("split");
    }
    if (activeShowHighlight === "current_act" && activeShowActCode) {
      setSelectedActCode(activeShowActCode);
    }
  }, [activeShowActCode, activeShowHighlight, activeShowState]);

  const text = language === "ru"
    ? {
        kicker: "Экран результатов",
        title: isSemi ? "Кто проходит в финал" : "Результаты комнаты",
        mobileTitle: getStageLabel(stageKey),
        desktopDescription: isSemi
          ? "Следи, какие страны проходят дальше, и кто из друзей ближе всего к итогам полуфинала."
          : "Экран для телевизора или проектора: открытые страны, очки и рейтинг друзей обновляются вживую.",
        description: isSemi
          ? "На телефоне сверху показаны участники комнаты, ниже — опубликованные места полуфинала."
          : "На телефоне сверху показаны участники комнаты, ниже — все открытые страны финала.",
        progressLabel: isSemi ? "Прошло дальше" : "Открыто стран",
        roomPlayers: "Участники комнаты",
        roomHint: isSemi
          ? "Кто из друзей сейчас ближе к результатам полуфинала"
          : "Кто из друзей сейчас ближе к итоговой таблице",
        stageBoard: isSemi ? "Линия прохода" : "Таблица этапа",
        stageHint: isSemi
          ? "Открытые страны идут в порядке официального результата"
          : "Все страны доступны списком: место, артист, песня и очки",
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
          ? "Follow which countries qualify and which friends are closest to the semi-final result."
          : "A TV or projector view where published countries, points, and room standings update live.",
        description: isSemi
          ? "On phones, room participants appear first, followed by the published semi-final places."
          : "On phones, room participants appear first, followed by every published final country.",
        progressLabel: isSemi ? "Qualified" : "Countries shown",
        roomPlayers: "Room participants",
        roomHint: isSemi
          ? "Who is closest to the semi-final result right now"
          : "Who is closest to the final table right now",
        stageBoard: isSemi ? "Qualification line" : "Stage standings",
        stageHint: isSemi
          ? "Published countries follow the official result order"
          : "All countries are available as a readable list with place, act, song, and points",
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
      [...displayResults].sort((left, right) => {
        const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
        const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
        return leftRank - rightRank;
      }),
    [displayResults]
  );

  const qualifierRows = useMemo(
    () => sortedResults.filter((act) =>
      typeof act.rank === "number"
      && act.rank > 0
      && (!qualificationCutoff || act.rank <= qualificationCutoff)
    ),
    [qualificationCutoff, sortedResults]
  );

  const stageRows = useMemo(() => sortedResults, [sortedResults]);

  const desktopStageColumns = useMemo(() => {
    if (!isDesktop) return [];
    return splitStageColumns(stageRows);
  }, [isDesktop, stageRows]);

  const roomRows = useMemo(() => {
    if (isDesktop) return leaders;
    return leaders.slice(0, isTablet ? 6 : 8);
  }, [isDesktop, isTablet, leaders]);
  const selectedAct = useMemo(
    () => results.find((act) => act.code === selectedActCode) || null,
    [results, selectedActCode],
  );
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
      if (softFullscreenActive) {
        setSoftFullscreenActive(false);
        return;
      }
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return;
      }
      setSoftFullscreenActive(true);
    } catch (fullscreenError) {
      console.error(fullscreenError);
      setSoftFullscreenActive((current) => !current);
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
        className={`show-panel scoreboard-motion-row live-results-row live-room-player-row ${isMoving ? "live-player-row-moving" : ""} ${isTopThree ? `live-top3-row ${podiumClass}` : ""} ${dense ? "h-[3.1rem] px-2 py-[0.15rem]" : compact ? "px-3 py-2" : "p-3 md:p-4"} flex items-center ${dense ? "gap-1.5" : "gap-3 md:gap-4"} ${
          isCurrentUser
            ? "border-cyan-300/20 bg-[linear-gradient(135deg,rgba(129,236,255,0.075),transparent_56%),rgba(255,255,255,0.04)] shadow-[0_0_0_1px_rgba(129,236,255,0.08),0_24px_40px_rgba(44,86,120,0.2)]"
            : ""
        }`}
        animate={isCurrentUser ? {
          boxShadow: [
            "0 0 0 1px rgba(129,236,255,0.08), 0 22px 36px rgba(44,86,120,0.18)",
            "0 0 0 1px rgba(129,236,255,0.18), 0 28px 48px rgba(85,154,255,0.28)",
            "0 0 0 1px rgba(129,236,255,0.08), 0 22px 36px rgba(44,86,120,0.18)",
          ],
        } : undefined}
        transition={isCurrentUser && !prefersReducedMotion ? {
          layout: playerTransition,
          boxShadow: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
        } : playerTransition}
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
          <p className={`truncate font-bold text-white ${dense ? "text-[13px] leading-4" : compact ? "text-[16px]" : "text-base md:text-lg"}`}>{getDisplayName(row.name)}</p>
        </div>
        <div className={`live-player-score-pill shrink-0 ${dense ? "h-[2rem] min-w-[3.4rem] px-2" : compact ? "h-[2.25rem] min-w-[4.2rem] px-3" : "h-10 min-w-[5rem] px-4"}`}>
          <span className={`live-player-score-value tabular-nums text-white ${dense ? "text-[15px]" : compact ? "text-[18px]" : "text-xl"}`}>{row.points}</span>
        </div>
      </motion.div>
    );
  };

  const renderStageDesktopRow = (act: ActEntry) => {
    const isQualifier = isSemi && typeof act.rank === "number" && act.rank > 0 && (!qualificationCutoff || act.rank <= qualificationCutoff);
    const rowDelta = movement[act.code] ?? null;
    const isMoving = typeof rowDelta === "number" && rowDelta !== 0;
    const isHighlighted = Boolean(countryHighlight[act.code]);
    const isTopThree = typeof act.rank === "number" && act.rank > 0 && act.rank <= 3;
    const isCutoffRow = isSemi && qualificationCutoff != null && act.rank === qualificationCutoff;
    const isBelowCutoffRow = isSemi && qualificationCutoff != null && act.rank === qualificationCutoff + 1;
    const podiumClass = act.rank === 1 ? "live-podium-1" : act.rank === 2 ? "live-podium-2" : act.rank === 3 ? "live-podium-3" : "";
    const flagUrl = resolveMediaUrl(act.flagUrl);
    const countryName = getCountryName(act.code, act.country);
    const isShowFocused = activeShowHighlight === "current_act" && activeShowActCode === act.code;
    const desktopRowClass = isFinal
      ? "live-final-readable-row flex items-center gap-2 px-2.5 py-1.5 md:px-3"
      : "flex h-[3.05rem] items-center gap-1.5 px-2 py-[0.15rem] md:px-2 md:py-[0.2rem]";

    return (
      <motion.button
        key={act.code}
        type="button"
        onClick={() => setSelectedActCode(act.code)}
        layout="position"
        transition={countryTransition}
        className={`show-panel scoreboard-motion-row live-results-row ${desktopRowClass} text-left transition-colors hover:border-cyan-200/18 focus:outline-none focus:ring-2 focus:ring-arenaBeam/35 ${isHighlighted ? "scoreboard-motion-row-moving live-results-row-moving" : ""} ${isShowFocused ? "live-show-focus-row" : ""} ${isTopThree ? `live-top3-row ${podiumClass}` : ""} ${isCutoffRow ? "live-cutoff-row" : ""} ${isBelowCutoffRow ? "live-cutoff-below-row" : ""} ${!isSemi && act.revealed ? "live-final-row" : ""} ${!isSemi && isHighlighted ? "live-final-row-moving" : ""} ${
          isQualifier
            ? "border-emerald-300/12 bg-[linear-gradient(135deg,rgba(70,220,165,0.065),transparent_52%),rgba(255,255,255,0.03)]"
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
                width={20}
                height={20}
                className={`${isFinal ? "h-[1.15rem] w-[1.15rem]" : "h-4 w-4"} shrink-0 rounded-full object-cover ring-1 ring-white/15`}
                loading="lazy"
                decoding="async"
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
          <div className={`ml-1 shrink-0 text-right ${isFinal ? "w-[3.2rem]" : "w-[3.2rem]"} ${isHighlighted ? "live-final-points live-final-points-hot" : "live-final-points"}`}>
            <p className="label-copy text-[7px] uppercase tracking-[0.16em] text-arenaMuted">
              {text.finalPoints}
            </p>
            <p className={`display-copy font-black text-white ${isFinal ? "text-[15px] md:text-[16px]" : "text-[14px] md:text-[16px]"}`}>{act.totalPoints}</p>
          </div>
        ) : null}
      </motion.button>
    );
  };

  const renderCompactStageRow = (act: ActEntry) => {
    const isQualifier = typeof act.rank === "number" && act.rank > 0 && (!qualificationCutoff || act.rank <= qualificationCutoff);
    const isShowFocused = activeShowHighlight === "current_act" && activeShowActCode === act.code;
    const isHighlighted = Boolean(countryHighlight[act.code]);

    return (
      <motion.button
        key={`compact-${act.code}`}
        type="button"
        onClick={() => setSelectedActCode(act.code)}
        layout="position"
        transition={countryTransition}
        className={`show-panel-muted scoreboard-motion-row flex min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:border-cyan-200/18 focus:outline-none focus:ring-2 focus:ring-arenaBeam/35 ${isHighlighted ? "scoreboard-motion-row-moving" : ""} ${isShowFocused ? "live-show-focus-row" : ""} ${
          isSemi && isQualifier
            ? "border-emerald-300/12 bg-[linear-gradient(135deg,rgba(70,220,165,0.065),transparent_52%),rgba(255,255,255,0.03)]"
            : ""
        }`}
      >
        <div className={`show-rank h-9 w-9 shrink-0 text-sm ${isSemi && isQualifier ? "border-emerald-300/20 text-emerald-100" : "text-arenaText"}`}>
          {act.rank || "-"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 break-words text-sm font-medium leading-5 text-white">{getCountryName(act.code, act.country)}</p>
            {isSemi && isQualifier ? (
              <span className="show-chip px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                <Sparkles size={10} />
                {text.qualified}
              </span>
            ) : null}
          </div>
          <p className="min-w-0 break-words text-xs leading-5 text-arenaMuted">
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
      </motion.button>
    );
  };

  return (
    <div className={`grid gap-5 ${softFullscreenActive ? "fixed inset-0 z-[9999] overflow-y-auto bg-[#090917] p-3 md:p-5" : ""}`}>
      <section className={`${desktopCompactTop ? "show-panel px-4 py-3 md:px-5" : `show-card ${isPhone ? "p-3" : "p-5 md:p-6 xl:p-7"}`} ${stageAccentActive ? "live-show-stage-accent" : ""}`}>
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
            {activeShowStatus ? (
              <div className="live-show-status mt-3 rounded-[1rem] px-3 py-2 text-sm font-semibold text-white">
                {activeShowStatus}
              </div>
            ) : null}
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
              {activeShowStatus ? (
                <span className="show-chip live-show-status max-w-[22rem] truncate text-[11px] uppercase tracking-[0.14em] text-white">
                  {activeShowStatus}
                </span>
              ) : null}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaText transition hover:border-cyan-200/20 hover:text-white"
                aria-label={fullscreenActive || softFullscreenActive ? (language === "ru" ? "Выйти из полноэкранного режима" : "Exit fullscreen") : (language === "ru" ? "На весь экран" : "Fullscreen")}
                title={fullscreenActive || softFullscreenActive ? (language === "ru" ? "Выйти из полноэкранного режима" : "Exit fullscreen") : (language === "ru" ? "На весь экран" : "Fullscreen")}
              >
                {fullscreenActive || softFullscreenActive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
              {activeShowStatus ? (
                <div className="live-show-status mt-4 inline-flex max-w-3xl rounded-[1.2rem] px-4 py-3 text-base font-semibold text-white">
                  {activeShowStatus}
                </div>
              ) : null}
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

              <div className="mt-3 min-h-0 flex-1 overflow-hidden pr-1">
                {stageRows.length ? (
                  <div className="live-stage-columns">
                    {desktopStageColumns.map((column, columnIndex) => (
                      <div key={`stage-column-${columnIndex}`} className="live-stage-column grid auto-rows-max content-start">
                        {column.flatMap((act) => {
                          const row = renderStageDesktopRow(act);
                          if (!isSemi || qualificationCutoff == null || act.rank !== qualificationCutoff) {
                            return [row];
                          }

                          return [
                            row,
                            <div key={`cutoff-divider-${act.code}`} className="show-panel live-cutoff-divider px-4 py-3">
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
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="show-panel p-5 text-sm text-arenaMuted">{text.noResults}</div>
                )}
              </div>
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

      <ArtistProfileModal
        act={selectedAct}
        open={Boolean(selectedAct)}
        onClose={() => setSelectedActCode(null)}
      />
    </div>
  );
}
