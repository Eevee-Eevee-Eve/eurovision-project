'use client';

import { motion } from "framer-motion";
import { MonitorPlay, Radio, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSocket, fetchLeaderboard, fetchRoom, fetchStageResults } from "../lib/api";
import { useDeviceTier } from "../lib/device";
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
  const [leaderMovement, setLeaderMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const previousLeaderRanks = useRef<Record<string, number>>({});
  const { getCountryName, getStageLabel, language } = useLanguage();
  const { isTablet, isDesktop } = useDeviceTier();
  const isWide = isTablet || isDesktop;
  const isSemi = stageKey === "semi1" || stageKey === "semi2";

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
        title: isSemi ? "Кто проходит в финал" : "Экран результатов комнаты",
        description: isSemi
          ? "В полуфинале главный вопрос — кто проходит дальше. Квалификацию в эфире объявляют в случайном порядке. На телефоне сначала видно участников комнаты, а на широком экране слева — квалификации и движение таблицы."
          : "На широком экране слева и справа видны таблица этапа и участники комнаты. На телефоне сначала показываем людей в комнате, а уже потом общий список этапа.",
        progressLabel: isSemi ? "Прошли дальше" : "Показано",
        currentAct: isSemi ? "Квалификация в эфире" : "Сейчас на экране",
        roomPlayers: "Участники комнаты",
        stageBoard: isSemi ? "Проходят в финал" : "Таблица этапа",
        stageHint: isSemi ? "В центре внимания только проход дальше." : "Полная таблица и движение мест.",
        waitingStatus: isSemi ? "Ждём следующий анонс квалификации." : "Ждём reveal следующего блока.",
        noResults: isSemi ? "Пока нет опубликованных квалификаций." : "Пока нет опубликованных результатов этапа.",
        roomReady: "Экран готов для показа",
        phoneFocus: "Телефон: сначала участники комнаты",
        wideFocus: "Широкий экран: stage слева, room справа",
        qualifiersTitle: "Список квалифицированных",
        semiAnnouncement: "Квалификацию в эфире объявляют в случайном порядке.",
        points: "баллов",
        pts: "очков",
        qualified: "В финале",
      }
    : {
        kicker: "Results screen",
        title: isSemi ? "Who qualifies for the final" : "Room results board",
        description: isSemi
          ? "Semi-finals are about qualifiers first. The qualifiers are announced in random order on air. On phones the room participants stay on top, while wide screens show the advancing acts and the table movement side by side."
          : "On wide screens the stage standings and the room leaderboard sit side by side. On phones we keep the room participants first and the stage list smaller.",
        progressLabel: isSemi ? "Qualified" : "Shown",
        currentAct: isSemi ? "Qualifiers on screen" : "Now on screen",
        roomPlayers: "Room participants",
        stageBoard: isSemi ? "Advancing to the final" : "Stage standings",
        stageHint: isSemi ? "The only thing that matters here is who moves on." : "Full ranking and position movement.",
        waitingStatus: isSemi ? "Waiting for the next qualifier reveal." : "Waiting for the next reveal moment.",
        noResults: isSemi ? "No qualifiers have been published yet." : "No published results yet.",
        roomReady: "Ready for display",
        phoneFocus: "Phone: room participants first",
        wideFocus: "Wide: stage on the left, room on the right",
        qualifiersTitle: "Qualified acts",
        semiAnnouncement: "Qualifiers are revealed in random order on air.",
        points: "points",
        pts: "pts",
        qualified: "Qualified",
      };

  const showState = room?.showState?.stageKey === stageKey ? room.showState : null;
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
    const source = isSemi ? qualifierRows : sortedResults;
    const limit = isWide ? 10 : 6;
    return source.slice(0, limit);
  }, [isSemi, isWide, qualifierRows, sortedResults]);

  const roomRows = useMemo(() => leaders.slice(0, isWide ? 6 : 8), [isWide, leaders]);
  const progressValue = isSemi
    ? `${qualifierRows.length}/${qualificationCutoff || 10}`
    : `${results.filter((act) => act.revealed).length}/${results.length}`;

  const featuredAct = useMemo(() => {
    const currentFromState = showState?.currentActCode
      ? sortedResults.find((act) => act.code === showState.currentActCode) || null
      : null;

    if (currentFromState) return currentFromState;
    return sortedResults.find((act) => act.revealed) || sortedResults[0] || null;
  }, [showState, sortedResults]);

  const highlightLabel = showState?.highlightMode
    ? {
        stage: language === "ru" ? "Этап" : "Stage",
        current_act: language === "ru" ? "Текущий артист" : "Current act",
        results: language === "ru" ? "Результаты" : "Results",
        players: language === "ru" ? "Участники" : "Players",
      }[showState.highlightMode]
    : null;

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

  const renderRoomRow = (row: LeaderboardEntry) => (
    <div key={row.id} className="show-panel flex items-center gap-3 p-3 md:gap-4 md:p-4">
      <div className="show-rank h-10 w-10 shrink-0 text-base font-black text-arenaText md:h-12 md:w-12 md:text-lg">
        {row.rank}
      </div>
      <UserAvatar
        name={row.name}
        emoji={row.emoji}
        avatarUrl={row.avatarUrl}
        avatarTheme={row.avatarTheme}
        className="h-10 w-10 shrink-0 md:h-12 md:w-12"
        textClass="text-sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white md:text-lg">{row.name}</p>
        <p className="text-sm text-arenaMuted">
          {row.points} {language === "ru" ? "баллов" : "points"}
        </p>
      </div>
      <MovementPill delta={leaderMovement[row.id] ?? null} />
    </div>
  );

  const renderStageRow = (act: ActEntry) => {
    const isQualifier = isSemi && typeof act.rank === "number" && act.rank > 0 && (!qualificationCutoff || act.rank <= qualificationCutoff);

    return (
      <motion.div
        key={act.code}
        layout
        className={`show-panel flex items-center gap-3 p-3 md:gap-4 md:p-4 ${act.revealed ? "" : "opacity-80"}`}
      >
        <div className="show-rank h-12 w-12 shrink-0 text-lg font-black text-arenaText md:h-14 md:w-14 md:text-2xl">
          {act.rank || "—"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaBeam">
              {getCountryName(act.code, act.country)}
            </span>
            {isQualifier ? (
              <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-emerald-100">
                <Sparkles size={12} />
                {text.qualified}
              </span>
            ) : null}
            <MovementPill delta={movement[act.code] ?? null} />
          </div>
          <p className="mt-2 text-base font-semibold text-white md:text-lg">{act.artist}</p>
          <p className="text-sm text-arenaMuted">{act.song}</p>
        </div>
        {!isSemi && act.totalPoints != null ? (
          <div className="text-right">
            <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">
              {language === "ru" ? "Очки" : "Points"}
            </p>
            <p className="display-copy mt-2 text-2xl font-black text-white md:text-3xl">{act.totalPoints}</p>
          </div>
        ) : null}
      </motion.div>
    );
  };

  const stageHero = featuredAct ? (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.78fr]">
      <ActPoster act={featuredAct} mode={isWide ? "hero" : "card"} />
      <div className="grid gap-3">
        <div className="show-panel p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
            {getCountryName(featuredAct.code, featuredAct.country)}
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{featuredAct.artist}</p>
          <p className="mt-1 text-lg text-arenaMuted">{featuredAct.song}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {featuredAct.rank ? <span className="show-chip text-sm text-white">#{featuredAct.rank}</span> : null}
            <MovementPill delta={movement[featuredAct.code] ?? null} />
            {isSemi ? (
              <span className="show-chip text-sm text-emerald-100">
                <Sparkles size={12} />
                {text.qualified}
              </span>
            ) : featuredAct.totalPoints != null ? (
              <span className="show-chip text-sm text-arenaMuted">
                {featuredAct.totalPoints} {language === "ru" ? text.points : text.pts}
              </span>
            ) : null}
          </div>
        </div>

        <div className="show-panel p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
            {showState?.statusText || text.waitingStatus}
          </p>
          <p className="mt-2 text-sm leading-7 text-arenaMuted">
            {isWide ? text.wideFocus : text.phoneFocus}
          </p>
          {highlightLabel ? (
            <div className="mt-4">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                <Radio size={13} />
                {highlightLabel}
              </span>
            </div>
          ) : null}
          {isSemi ? (
            <p className="mt-3 text-sm leading-7 text-arenaMuted">
              {text.semiAnnouncement}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : (
    <div className="show-panel mt-5 p-5 text-sm text-arenaMuted">{text.noResults}</div>
  );

  return (
    <div className="grid gap-5">
      <section className="show-card p-5 md:p-6">
        <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaDanger">{text.kicker}</p>
        <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">{text.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{text.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
            {getStageLabel(stageKey)}
          </span>
          {isSemi && qualificationCutoff ? (
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
              <Sparkles size={13} />
              {language === "ru" ? `Проходят места 1–${qualificationCutoff}` : `Places 1-${qualificationCutoff} qualify`}
            </span>
          ) : null}
          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
            {text.progressLabel}: {progressValue}
          </span>
          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
            <MonitorPlay size={13} />
            {text.roomReady}
          </span>
          {highlightLabel ? (
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
              {highlightLabel}
            </span>
          ) : null}
        </div>
      </section>

      {isWide ? (
        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="show-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.stageBoard}</p>
                <p className="mt-2 text-sm text-arenaMuted">{text.stageHint}</p>
              </div>
              {isSemi ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                  <Sparkles size={13} />
                  {text.qualifiersTitle}
                </span>
              ) : null}
            </div>

            {stageHero}

            <div className="mt-5 grid gap-3">
              {stageRows.length ? stageRows.map((act) => renderStageRow(act)) : (
                <div className="show-panel p-5 text-sm text-arenaMuted">{text.noResults}</div>
              )}
            </div>
          </div>

          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
            <div className="mt-5 grid gap-3">
              {roomRows.length ? roomRows.map(renderRoomRow) : (
                <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomPlayers}</p>
            <div className="mt-5 grid gap-3">
              {roomRows.length ? roomRows.map(renderRoomRow) : (
                <div className="show-panel p-4 text-sm text-arenaMuted">{text.noResults}</div>
              )}
            </div>
          </div>

          {featuredAct ? (
            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.currentAct}</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="shrink-0">
                  <ActPoster act={featuredAct} compact />
                </div>
                <div className="min-w-0">
                  <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaBeam">
                    {getCountryName(featuredAct.code, featuredAct.country)}
                  </span>
                  <p className="mt-2 line-clamp-1 text-lg font-semibold text-white">{featuredAct.artist}</p>
                  <p className="line-clamp-1 text-sm text-arenaMuted">{featuredAct.song}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-arenaMuted">
                {showState?.statusText || text.waitingStatus}
              </p>
              {isSemi ? (
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.semiAnnouncement}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
