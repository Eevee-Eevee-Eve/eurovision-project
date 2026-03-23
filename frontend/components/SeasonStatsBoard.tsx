'use client';

import Link from "next/link";
import { MonitorPlay, Radio, Sparkles, Target, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoomSocket, fetchSeasonStats } from "../lib/api";
import type { PlayerSeasonStats, SeasonStatsPayload } from "../lib/types";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

export function SeasonStatsBoard({ roomSlug }: { roomSlug: string }) {
  const { language, getStageLabel } = useLanguage();
  const [stats, setStats] = useState<SeasonStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const copy = useMemo(() => (
    language === "ru"
      ? {
          kicker: "Архив сезона",
          title: "Сезонная статистика",
          description: "Полный срез по комнате: кто лидирует по точным попаданиям, как участники прошли каждый этап и насколько близко они были к официальным результатам.",
          participants: "Участники",
          completed: "Завершённые этапы",
          revealed: "Открыто результатов",
          scoring: "Профиль очков",
          leader: "Лидер сезона",
          noLeader: "Пока нет лидера",
          points: "Очки",
          exact: "Точные попадания",
          close: "Близкие попадания",
          average: "Средняя дистанция",
          submitted: "Отправлено этапов",
          locked: "Lock этапов",
          bestStage: "Лучший этап",
          noBestStage: "Ещё нет",
          routes: "Быстрые маршруты",
          roomHub: "Хаб комнаты",
          players: "Таблица игроков",
          projector: "Проектор",
          loadError: "Не удалось загрузить сезонную статистику.",
        }
      : {
          kicker: "Season Archive",
          title: "Season stats",
          description: "A full room breakdown: who leads on exact hits, how each participant performed across stages, and how close they stayed to the official results.",
          participants: "Participants",
          completed: "Completed stages",
          revealed: "Revealed results",
          scoring: "Scoring profile",
          leader: "Season leader",
          noLeader: "No leader yet",
          points: "Points",
          exact: "Exact matches",
          close: "Close calls",
          average: "Average distance",
          submitted: "Submitted stages",
          locked: "Locked stages",
          bestStage: "Best stage",
          noBestStage: "None yet",
          routes: "Quick routes",
          roomHub: "Room hub",
          players: "Players board",
          projector: "Projector",
          loadError: "Unable to load season stats.",
        }
  ), [language]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchSeasonStats(roomSlug);
        if (!active) return;
        setStats(payload);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(copy.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    const socket = createRoomSocket(roomSlug);
    socket.on("leaderboardUpdate", () => void load());
    socket.on("resultsUpdate", () => void load());

    return () => {
      active = false;
      socket.close();
    };
  }, [copy.loadError, roomSlug]);

  if (loading) {
    return <div className="show-card p-6 text-sm text-arenaMuted">{language === "ru" ? "Загружаю сезонную статистику..." : "Loading season stats..."}</div>;
  }

  if (error || !stats) {
    return <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">{error || copy.loadError}</div>;
  }

  const topPlayers = stats.players.slice(0, 3);
  const remainingPlayers = stats.players.slice(3);

  function renderPlayerCard(player: PlayerSeasonStats, featured = false) {
    return (
      <div key={player.id} className={`show-card p-5 ${featured ? "md:p-6" : ""}`}>
        <div className="flex items-center gap-4">
          <div className={`${featured ? "show-rank h-20 w-20" : "show-rank h-16 w-16"} shrink-0`}>
            <span className={`display-copy font-black text-arenaText ${featured ? "text-4xl" : "text-3xl"}`}>{player.rank}</span>
          </div>
          <UserAvatar
            name={player.name}
            emoji={player.emoji}
            avatarUrl={player.avatarUrl}
            avatarTheme={player.avatarTheme}
            className={featured ? "h-16 w-16 shrink-0" : "h-14 w-14 shrink-0"}
            textClass={featured ? "text-lg" : "text-base"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                <Trophy size={13} />
                {player.totalPoints} {copy.points.toLowerCase()}
              </span>
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                <Target size={13} />
                {player.exactMatchCount} {copy.exact.toLowerCase()}
              </span>
            </div>
            <h3 className={`display-copy mt-3 font-black ${featured ? "text-3xl md:text-4xl" : "text-2xl"}`}>{player.name}</h3>
            <p className="mt-2 text-sm text-arenaMuted">
              {copy.bestStage}: {player.bestStage ? getStageLabel(player.bestStage) : copy.noBestStage}
            </p>
          </div>
        </div>

        <div className="show-divider my-4" />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="show-panel p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.exact}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{player.exactMatchCount}</p>
          </div>
          <div className="show-panel p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.close}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{player.closeMatchCount}</p>
          </div>
          <div className="show-panel p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.average}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{player.averageDistance ?? "—"}</p>
          </div>
          <div className="show-panel p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.locked}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{player.lockedStages}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(["semi1", "semi2", "final"] as const).map((stage) => (
            <div key={`${player.id}-${stage}`} className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaBeam">{getStageLabel(stage)}</p>
              <div className="mt-3 grid gap-2 text-sm text-arenaMuted">
                <p>{copy.points}: <span className="text-white">{player.stages[stage].points}</span></p>
                <p>{copy.exact}: <span className="text-white">{player.stages[stage].exactMatchCount}</span></p>
                <p>{copy.close}: <span className="text-white">{player.stages[stage].closeMatchCount}</span></p>
                <p>{copy.average}: <span className="text-white">{player.stages[stage].comparedEntries ? (player.stages[stage].totalDistance / player.stages[stage].comparedEntries).toFixed(2) : "—"}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
              <h2 className="display-copy mt-3 text-3xl font-black md:text-5xl">{copy.title}</h2>
              <p className="mt-4 max-w-2xl text-sm text-arenaMuted md:text-base">{copy.description}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.routes}</p>
          <div className="mt-4 grid gap-3">
            <Link href={`/${roomSlug}`} className="show-panel flex items-center justify-between px-4 py-4 transition hover:bg-white/[0.08]">
              <span className="flex items-center gap-3 text-white"><Sparkles size={16} />{copy.roomHub}</span>
              <span className="text-arenaMuted">/{roomSlug}</span>
            </Link>
            <Link href={`/${roomSlug}/players/overall`} className="show-panel flex items-center justify-between px-4 py-4 transition hover:bg-white/[0.08]">
              <span className="flex items-center gap-3 text-white"><Users size={16} />{copy.players}</span>
              <span className="text-arenaMuted">overall</span>
            </Link>
            <Link href={`/${roomSlug}/live/final`} className="show-panel flex items-center justify-between px-4 py-4 transition hover:bg-white/[0.08]">
              <span className="flex items-center gap-3 text-white"><MonitorPlay size={16} />{copy.projector}</span>
              <span className="text-arenaMuted">final</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.participants}</p>
          <p className="display-copy mt-3 text-4xl font-black">{stats.overview.participants}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.completed}</p>
          <p className="display-copy mt-3 text-4xl font-black">{stats.overview.completedStages}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.revealed}</p>
          <p className="display-copy mt-3 text-4xl font-black">{stats.overview.revealedResults}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.scoring}</p>
          <p className="mt-3 text-lg font-semibold text-white">{stats.scoringProfile}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{copy.leader}</p>
          <p className="mt-3 text-lg font-semibold text-white">{stats.overview.leaderName || copy.noLeader}</p>
        </div>
      </section>

      {topPlayers.length ? (
        <section className="grid gap-4 xl:grid-cols-3">
          {topPlayers.map((player) => renderPlayerCard(player, true))}
        </section>
      ) : null}

      <section className="grid gap-4">
        <div className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{stats.seasonLabel}</p>
              <h2 className="display-copy mt-3 text-3xl font-black">{stats.roomName}</h2>
            </div>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              <Radio size={13} />
              {stats.seasonYear || stats.seasonLabel}
            </span>
          </div>
        </div>
        <div className="grid gap-4">
          {remainingPlayers.map((player) => renderPlayerCard(player))}
        </div>
      </section>
    </div>
  );
}
