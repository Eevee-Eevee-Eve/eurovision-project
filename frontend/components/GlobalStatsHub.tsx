'use client';

import Link from "next/link";
import { BarChart3, Crown, Database, Flag, LineChart, Medal, MonitorPlay, RefreshCw, Sparkles, Trophy, Upload, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchActs, fetchRooms, fetchSeasonStats } from "../lib/api";
import type { ActEntry, RoomSummary, SeasonStatsPayload, StageKey } from "../lib/types";
import { FALLBACK_ROOM } from "../lib/rooms";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

const stages: StageKey[] = ["semi1", "semi2", "final"];

type ActByStage = Partial<Record<StageKey, ActEntry[]>>;

export function GlobalStatsHub() {
  const { language, getCountryName, getDisplayName, getRoomName, getStageLabel } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [selectedRoomSlug, setSelectedRoomSlug] = useState(FALLBACK_ROOM.slug);
  const [seasonStats, setSeasonStats] = useState<SeasonStatsPayload | null>(null);
  const [actsByStage, setActsByStage] = useState<ActByStage>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const copy = useMemo(
    () =>
      language === "ru"
        ? {
            kicker: "Статистика",
            title: "Игроки, страны и история сезонов",
            intro: "Общий центр статистики: текущая комната, таблица игроков, состав стран и подготовка к импорту прошлых лет.",
            room: "Комната",
            refresh: "Обновить",
            openRoom: "Открыть комнату",
            projector: "Экран",
            roomStats: "Статистика комнаты",
            activeRooms: "Комнат",
            players: "Игроков",
            completedStages: "Этапов завершено",
            revealedResults: "Открыто результатов",
            leader: "Лидер",
            noLeader: "Пока нет лидера",
            points: "очков",
            exact: "точных",
            close: "близких",
            topPlayers: "Рейтинг игроков",
            topPlayersHint: "Сводка по текущей комнате. Когда появятся архивные сезоны, здесь будет сквозная таблица по годам.",
            countries: "Статистика стран",
            countriesHint: "Пока показываем состав текущего сезона и этапы. После импорта добавим победы, средние места и пересечения с выбором игроков.",
            finalLineup: "Финал",
            semiLineup: "Полуфиналы",
            autoFinalists: "Автофиналисты",
            countriesTotal: "стран",
            importTitle: "Импорт прошлых лет",
            importText: "Следующий шаг: загрузка CSV/JSON из админки, сопоставление игроков с аккаунтами и значки победителей.",
            sourceTitle: "Источник данных",
            sourceText: "Текущий сезон берется из активных комнат. Исторические данные подключим отдельным импортом.",
            empty: "Статистика появится после голосований и открытия результатов.",
            loadError: "Не удалось загрузить статистику.",
          }
        : {
            kicker: "Stats",
            title: "Players, countries, and season history",
            intro: "A shared stats hub for the current room, player standings, country lineups, and future season imports.",
            room: "Room",
            refresh: "Refresh",
            openRoom: "Open room",
            projector: "Screen",
            roomStats: "Room stats",
            activeRooms: "Rooms",
            players: "Players",
            completedStages: "Completed stages",
            revealedResults: "Revealed results",
            leader: "Leader",
            noLeader: "No leader yet",
            points: "pts",
            exact: "exact",
            close: "close",
            topPlayers: "Player ranking",
            topPlayersHint: "Current room snapshot. Once archived seasons are imported, this becomes the cross-year table.",
            countries: "Country stats",
            countriesHint: "For now this shows the current season lineup and stages. Imports will add wins, averages, and player overlaps.",
            finalLineup: "Final",
            semiLineup: "Semi-finals",
            autoFinalists: "Automatic finalists",
            countriesTotal: "countries",
            importTitle: "Past season import",
            importText: "Next step: CSV/JSON upload in admin, account matching, and winner badges.",
            sourceTitle: "Data source",
            sourceText: "The current season comes from active rooms. Historical data will be connected through a separate import.",
            empty: "Stats will appear after voting and result reveals.",
            loadError: "Unable to load stats.",
          },
    [language],
  );

  const selectedRoom = rooms.find((room) => room.slug === selectedRoomSlug) || rooms[0] || FALLBACK_ROOM;

  async function load(nextRoomSlug = selectedRoomSlug, silent = false) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const roomsPayload = await fetchRooms();
      const loadedRooms = roomsPayload.rooms.length ? roomsPayload.rooms : [FALLBACK_ROOM];
      const resolvedRoomSlug = loadedRooms.some((room) => room.slug === nextRoomSlug)
        ? nextRoomSlug
        : loadedRooms[0].slug;
      const [statsPayload, ...actPayloads] = await Promise.all([
        fetchSeasonStats(resolvedRoomSlug),
        ...stages.map((stage) => fetchActs(resolvedRoomSlug, stage)),
      ]);

      setRooms(loadedRooms);
      setSelectedRoomSlug(resolvedRoomSlug);
      setSeasonStats(statsPayload);
      setActsByStage(
        stages.reduce<ActByStage>((acc, stage, index) => {
          acc[stage] = actPayloads[index].acts;
          return acc;
        }, {}),
      );
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setError(copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const storedSlug = window.localStorage.getItem("last_room_slug");
    const initialRoom = storedSlug || FALLBACK_ROOM.slug;
    setSelectedRoomSlug(initialRoom);
    void load(initialRoom);
  }, []);

  const finalActs = actsByStage.final || [];
  const semiActs = [...(actsByStage.semi1 || []), ...(actsByStage.semi2 || [])];
  const autoFinalists = finalActs.filter((act) => act.stageKey === "final");
  const topPlayers = seasonStats?.players.slice(0, 6) || [];
  const leader = seasonStats?.players[0] || null;

  const stageCards = stages.map((stage) => ({
    stage,
    count: actsByStage[stage]?.length || 0,
    label: getStageLabel(stage),
  }));

  return (
    <div className="grid gap-5">
      <section className="glass-panel ghost-grid home-hero-compact rounded-shell border border-white/10">
        <div className="grid gap-5 xl:grid-cols-[1fr_0.78fr] xl:items-end">
          <div className="min-w-0">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
            <h1 className="display-copy mt-3 max-w-5xl text-3xl font-black leading-[0.96] tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{copy.intro}</p>
          </div>

          <div className="show-panel grid gap-3 p-4">
            <label className="grid gap-2 text-sm text-arenaMuted">
              <span>{copy.room}</span>
              <span className="arena-select-shell">
                <select
                  value={selectedRoomSlug}
                  onChange={(event) => {
                    setSelectedRoomSlug(event.target.value);
                    void load(event.target.value);
                  }}
                  className="arena-input arena-select"
                >
                  {rooms.map((room) => (
                    <option key={room.slug} value={room.slug}>
                      {getRoomName(room.slug, room.name)}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => void load(selectedRoomSlug, true)} className="arena-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm" disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                {copy.refresh}
              </button>
              <Link href={`/${selectedRoom.slug}`} className="arena-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm">
                <Sparkles size={15} />
                {copy.openRoom}
              </Link>
              <Link href={`/${selectedRoom.slug}/live/final`} className="arena-button-room inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm">
                <MonitorPlay size={15} />
                {copy.projector}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.4rem] bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Database} label={copy.activeRooms} value={String(rooms.length)} />
        <MetricCard icon={Users} label={copy.players} value={loading ? "..." : String(seasonStats?.overview.participants || 0)} />
        <MetricCard icon={LineChart} label={copy.completedStages} value={loading ? "..." : String(seasonStats?.overview.completedStages || 0)} />
        <MetricCard icon={Flag} label={copy.revealedResults} value={loading ? "..." : String(seasonStats?.overview.revealedResults || 0)} />
        <MetricCard icon={Crown} label={copy.leader} value={leader ? getDisplayName(leader.name) : copy.noLeader} compact />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.topPlayers}</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{copy.topPlayersHint}</p>
            </div>
            <Link href={`/${selectedRoom.slug}/stats`} className="show-chip text-[11px] uppercase tracking-[0.18em] text-arenaPulse">
              <BarChart3 size={13} />
              {copy.roomStats}
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {topPlayers.length ? (
              topPlayers.map((player) => (
                <div key={player.id} className="show-panel flex min-w-0 items-center gap-3 p-3">
                  <div className="show-rank h-11 w-11 shrink-0">
                    <span className="display-copy text-lg font-black">{player.rank}</span>
                  </div>
                  <UserAvatar
                    name={getDisplayName(player.name)}
                    avatarUrl={player.avatarUrl}
                    avatarTheme={player.avatarTheme}
                    className="h-11 w-11 shrink-0"
                    textClass="text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{getDisplayName(player.name)}</p>
                    <p className="mt-1 text-xs text-arenaMuted">
                      {player.exactMatchCount} {copy.exact} · {player.closeMatchCount} {copy.close}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-sm font-black text-white">
                    {player.totalPoints} {copy.points}
                  </div>
                </div>
              ))
            ) : (
              <p className="show-panel p-4 text-sm text-arenaMuted">{loading ? "..." : copy.empty}</p>
            )}
          </div>
        </div>

        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.countries}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.countriesHint}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stageCards.map((card) => (
              <div key={card.stage} className="show-panel p-4">
                <p className="text-sm font-semibold text-white">{card.label}</p>
                <p className="display-copy mt-3 text-4xl font-black">{card.count}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-arenaMuted">{copy.countriesTotal}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <CountryCloud title={copy.finalLineup} acts={finalActs} getCountryName={getCountryName} />
            <CountryCloud title={copy.autoFinalists} acts={autoFinalists} getCountryName={getCountryName} />
          </div>

          <div className="mt-4">
            <CountryCloud title={copy.semiLineup} acts={semiActs.slice(0, 18)} getCountryName={getCountryName} compact />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="show-card p-5 md:p-6">
          <Upload className="text-arenaBeam" size={25} />
          <h2 className="display-copy mt-4 text-2xl font-black text-white">{copy.importTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{copy.importText}</p>
        </div>
        <div className="show-card p-5 md:p-6">
          <Trophy className="text-amber-200" size={25} />
          <h2 className="display-copy mt-4 text-2xl font-black text-white">{copy.sourceTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{copy.sourceText}</p>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="show-card min-w-0 p-4">
      <div className="flex items-center gap-2 text-arenaBeam">
        <Icon size={17} />
        <p className="label-copy truncate text-[10px] uppercase tracking-[0.2em] text-arenaMuted">{label}</p>
      </div>
      <p className={`mt-3 min-w-0 overflow-hidden text-ellipsis font-black text-white ${compact ? "text-lg" : "display-copy text-4xl"}`}>
        {value}
      </p>
    </div>
  );
}

function CountryCloud({
  title,
  acts,
  getCountryName,
  compact = false,
}: {
  title: string;
  acts: ActEntry[];
  getCountryName: (code: string, fallback: string) => string;
  compact?: boolean;
}) {
  const uniqueActs = Array.from(new Map(acts.map((act) => [act.code, act])).values());

  return (
    <div className="show-panel min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="label-copy text-[10px] uppercase tracking-[0.22em] text-arenaBeam">{title}</p>
        <span className="show-chip text-[11px] text-arenaMuted">
          <Medal size={12} />
          {uniqueActs.length}
        </span>
      </div>
      <div className={`flex flex-wrap gap-2 ${compact ? "max-h-24 overflow-hidden" : ""}`}>
        {uniqueActs.length ? (
          uniqueActs.map((act) => (
            <span key={act.code} className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs text-white">
              <img src={act.flagUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" loading="lazy" />
              <span className="truncate">{getCountryName(act.code, act.country)}</span>
            </span>
          ))
        ) : (
          <span className="text-sm text-arenaMuted">...</span>
        )}
      </div>
    </div>
  );
}
