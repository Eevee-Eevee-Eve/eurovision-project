'use client';

import Link from "next/link";
import { Award, BarChart3, Crown, Flag, Medal, Search, Sparkles, Star, Target, Trophy, Upload, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchActs, fetchRooms, fetchSeasonStats } from "../lib/api";
import type { AccountProfile, ActEntry, AvatarTheme, RoomSummary, StageKey } from "../lib/types";
import { FALLBACK_ROOM } from "../lib/rooms";
import { useAccount } from "./AccountProvider";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

type YearRecord = {
  year: number;
  points: number;
  exact: number;
  close: number;
  winners: number;
  lastPlaces: number;
  rank: number;
  champion?: boolean;
};

type Achievement = {
  key: string;
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  icon: typeof Trophy;
  tone: string;
};

type HistoricalPlayer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarTheme: AvatarTheme;
  records: YearRecord[];
  achievements: Achievement[];
  favoriteSlot?: number;
};

type CountryHistory = {
  code: string;
  name: string;
  flagUrl: string;
  appearances: number;
  wins: number;
  top10: number;
  lastPlaces: number;
  thirteenthPlaces: number;
  averageRank: number;
};

const ACHIEVEMENTS: Record<string, Achievement> = {
  champion: {
    key: "champion",
    titleRu: "Победитель сезона",
    titleEn: "Season winner",
    textRu: "Забрал общий зачет года.",
    textEn: "Won the yearly leaderboard.",
    icon: Crown,
    tone: "from-amber-200/24 to-amber-500/10 text-amber-100",
  },
  oracle: {
    key: "oracle",
    titleRu: "Оракул первых мест",
    titleEn: "Winner oracle",
    textRu: "Чаще других угадывает победителей.",
    textEn: "Finds winners more often than everyone else.",
    icon: Trophy,
    tone: "from-pink-300/24 to-fuchsia-500/10 text-pink-100",
  },
  sniper: {
    key: "sniper",
    titleRu: "Снайпер точных мест",
    titleEn: "Exact-place sniper",
    textRu: "Много точных попаданий за сезон.",
    textEn: "Stacks exact placements across a season.",
    icon: Target,
    tone: "from-cyan-300/24 to-blue-500/10 text-cyan-100",
  },
  basement: {
    key: "basement",
    titleRu: "Мастер нижней полки",
    titleEn: "Bottom-table master",
    textRu: "Хорошо чувствует последние места.",
    textEn: "Reads the bottom of the table unusually well.",
    icon: Award,
    tone: "from-violet-300/24 to-indigo-500/10 text-violet-100",
  },
  thirteen: {
    key: "thirteen",
    titleRu: "Тринадцатый сектор",
    titleEn: "The 13th sense",
    textRu: "Подозрительно часто угадывает 13-е место.",
    textEn: "Suspiciously good at predicting 13th place.",
    icon: Star,
    tone: "from-emerald-300/24 to-teal-500/10 text-emerald-100",
  },
};

const SEED_PLAYERS: HistoricalPlayer[] = [
  {
    id: "seed-anastasia",
    name: "Анастасия З",
    avatarTheme: { primary: "#ff63c2", secondary: "#7f5cff", initials: "АЗ" },
    favoriteSlot: 13,
    achievements: [ACHIEVEMENTS.champion, ACHIEVEMENTS.thirteen, ACHIEVEMENTS.sniper],
    records: [
      { year: 2023, points: 148, exact: 6, close: 11, winners: 1, lastPlaces: 2, rank: 2 },
      { year: 2024, points: 173, exact: 8, close: 14, winners: 1, lastPlaces: 3, rank: 1, champion: true },
      { year: 2025, points: 161, exact: 7, close: 13, winners: 0, lastPlaces: 2, rank: 2 },
    ],
  },
  {
    id: "seed-sergey",
    name: "Сергей М.",
    avatarTheme: { primary: "#81ecff", secondary: "#577aff", initials: "СМ" },
    favoriteSlot: 1,
    achievements: [ACHIEVEMENTS.oracle, ACHIEVEMENTS.basement],
    records: [
      { year: 2023, points: 132, exact: 4, close: 12, winners: 1, lastPlaces: 4, rank: 3 },
      { year: 2024, points: 158, exact: 6, close: 13, winners: 2, lastPlaces: 3, rank: 2 },
      { year: 2025, points: 179, exact: 9, close: 15, winners: 1, lastPlaces: 5, rank: 1, champion: true },
    ],
  },
  {
    id: "seed-evgeny",
    name: "Евгений М.",
    avatarTheme: { primary: "#f59e0b", secondary: "#ef4444", initials: "ЕМ" },
    favoriteSlot: 24,
    achievements: [ACHIEVEMENTS.sniper],
    records: [
      { year: 2023, points: 121, exact: 5, close: 8, winners: 0, lastPlaces: 1, rank: 4 },
      { year: 2024, points: 139, exact: 5, close: 12, winners: 1, lastPlaces: 1, rank: 4 },
      { year: 2025, points: 151, exact: 6, close: 12, winners: 0, lastPlaces: 2, rank: 3 },
    ],
  },
];

const SEED_COUNTRIES: CountryHistory[] = [
  { code: "SE", name: "Sweden", flagUrl: "https://flagcdn.com/w80/se.png", appearances: 12, wins: 3, top10: 9, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 5.8 },
  { code: "IT", name: "Italy", flagUrl: "https://flagcdn.com/w80/it.png", appearances: 11, wins: 2, top10: 8, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 6.3 },
  { code: "UA", name: "Ukraine", flagUrl: "https://flagcdn.com/w80/ua.png", appearances: 10, wins: 2, top10: 7, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 7.1 },
  { code: "NO", name: "Norway", flagUrl: "https://flagcdn.com/w80/no.png", appearances: 12, wins: 1, top10: 5, lastPlaces: 3, thirteenthPlaces: 1, averageRank: 13.4 },
  { code: "DE", name: "Germany", flagUrl: "https://flagcdn.com/w80/de.png", appearances: 12, wins: 0, top10: 2, lastPlaces: 4, thirteenthPlaces: 0, averageRank: 18.2 },
  { code: "FR", name: "France", flagUrl: "https://flagcdn.com/w80/fr.png", appearances: 12, wins: 1, top10: 6, lastPlaces: 1, thirteenthPlaces: 1, averageRank: 10.6 },
];

const stages: StageKey[] = ["semi1", "semi2", "final"];

function totals(player: HistoricalPlayer) {
  const seasons = player.records.length;
  const points = player.records.reduce((sum, record) => sum + record.points, 0);
  const exact = player.records.reduce((sum, record) => sum + record.exact, 0);
  const close = player.records.reduce((sum, record) => sum + record.close, 0);
  const winners = player.records.reduce((sum, record) => sum + record.winners, 0);
  const lastPlaces = player.records.reduce((sum, record) => sum + record.lastPlaces, 0);
  const wins = player.records.filter((record) => record.champion).length;
  return {
    seasons,
    points,
    exact,
    close,
    winners,
    lastPlaces,
    wins,
    averagePoints: seasons ? Math.round(points / seasons) : 0,
  };
}

function createAccountPlayer(account: AccountProfile): HistoricalPlayer {
  return {
    id: account.id,
    name: account.publicName,
    avatarUrl: account.avatarUrl,
    avatarTheme: account.avatarTheme,
    achievements: [],
    records: [{ year: 2026, points: 0, exact: 0, close: 0, winners: 0, lastPlaces: 0, rank: 0 }],
  };
}

export function GlobalStatsHub() {
  const { account } = useAccount();
  const { language, getCountryName, getDisplayName } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [currentPlayers, setCurrentPlayers] = useState<HistoricalPlayer[]>([]);
  const [currentActs, setCurrentActs] = useState<ActEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [loading, setLoading] = useState(true);

  const copy = useMemo(
    () =>
      language === "ru"
        ? {
            kicker: "История клуба",
            title: "Статистика игроков и стран по годам",
            intro: "Общий рейтинг всех зарегистрированных участников: финальные игры по годам, точные места, близкие места, победители сезонов и страновая история.",
            search: "Найти игрока",
            myStats: "Моя статистика",
            import: "Импорт записей",
            players: "Игроков",
            seasons: "Сезонов",
            exact: "Точных мест",
            winners: "Угадано победителей",
            average: "Средние очки",
            close: "Близких мест",
            achievements: "Ачивки",
            playerRating: "Рейтинг игроков",
            playerHint: "После импорта твоих записей эти карточки будут строиться по всем зарегистрированным аккаунтам.",
            profile: "Профиль игрока",
            years: "Годы",
            noImported: "История еще не импортирована",
            countries: "Страны по годам",
            countryHint: "Карточки стран будут расширяться в отдельные страницы: участия, победы, топ-10, последние места, 13-е место и средняя позиция.",
            appearances: "участий",
            wins: "побед",
            top10: "топ-10",
            lastPlaces: "последних",
            thirteenth: "13-х",
            avgRank: "ср. место",
            funStats: "Смешная статистика",
            funText: "Ачивки появляются только у тех, кто реально достиг условия: 13-е место, нижняя часть таблицы, победители, точные попадания.",
            currentSource: "Свежие игроки",
            currentSourceText: "Пока история не импортирована, зарегистрированные игроки подтягиваются из активных комнат и смогут быть сопоставлены с архивом.",
          }
        : {
            kicker: "Club history",
            title: "Player and country stats across years",
            intro: "A global ranking for registered players: final games by year, exact placements, close calls, season winners, and country history.",
            search: "Find player",
            myStats: "My stats",
            import: "Import records",
            players: "Players",
            seasons: "Seasons",
            exact: "Exact places",
            winners: "Winners guessed",
            average: "Average points",
            close: "Close calls",
            achievements: "Achievements",
            playerRating: "Player ranking",
            playerHint: "After importing your records, these cards will be built across all registered accounts.",
            profile: "Player profile",
            years: "Years",
            noImported: "No imported history yet",
            countries: "Countries by year",
            countryHint: "Country cards will expand into pages with appearances, wins, top-10s, last places, 13th places, and average rank.",
            appearances: "apps",
            wins: "wins",
            top10: "top-10",
            lastPlaces: "last",
            thirteenth: "13th",
            avgRank: "avg rank",
            funStats: "Fun stats",
            funText: "Achievements appear only when a player truly earns them: 13th place, bottom-table reads, winners, exact hits.",
            currentSource: "Fresh players",
            currentSourceText: "Until history is imported, registered players are pulled from active rooms and can later be matched to the archive.",
          },
    [language],
  );

  useEffect(() => {
    setSelectedPlayerId(new URLSearchParams(window.location.search).get("player") || "");

    const load = async () => {
      try {
        const roomsPayload = await fetchRooms();
        const loadedRooms = roomsPayload.rooms.length ? roomsPayload.rooms : [FALLBACK_ROOM];
        setRooms(loadedRooms);
        const roomStats = await Promise.allSettled(loadedRooms.slice(0, 6).map((room) => fetchSeasonStats(room.slug)));
        const players = new Map<string, HistoricalPlayer>();
        roomStats.forEach((result) => {
          if (result.status !== "fulfilled") return;
          result.value.players.forEach((player) => {
            if (players.has(player.id)) return;
            players.set(player.id, {
              id: player.id,
              name: player.name,
              avatarUrl: player.avatarUrl,
              avatarTheme: player.avatarTheme || { primary: "#81ecff", secondary: "#c799ff", initials: player.name.slice(0, 2).toUpperCase() },
              achievements: [],
              records: [{ year: 2026, points: player.totalPoints, exact: player.exactMatchCount, close: player.closeMatchCount, winners: 0, lastPlaces: 0, rank: player.rank }],
            });
          });
        });
        setCurrentPlayers(Array.from(players.values()));

        const firstRoom = loadedRooms[0] || FALLBACK_ROOM;
        const actResults = await Promise.allSettled(stages.map((stage) => fetchActs(firstRoom.slug, stage)));
        setCurrentActs(actResults.flatMap((result) => (result.status === "fulfilled" ? result.value.acts : [])));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const players = useMemo(() => {
    const merged = new Map<string, HistoricalPlayer>();
    SEED_PLAYERS.forEach((player) => merged.set(player.id, player));
    currentPlayers.forEach((player) => merged.set(player.id, player));
    if (account && !merged.has(account.id)) {
      merged.set(account.id, createAccountPlayer(account));
    }
    return Array.from(merged.values()).sort((left, right) => totals(right).points - totals(left).points);
  }, [account, currentPlayers]);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) || players[0];
  const filteredPlayers = players.filter((player) => getDisplayName(player.name).toLowerCase().includes(query.trim().toLowerCase()));
  const playerTotals = selectedPlayer ? totals(selectedPlayer) : null;

  const countryStats = useMemo(() => {
    const byCode = new Map(SEED_COUNTRIES.map((country) => [country.code, country]));
    currentActs.forEach((act) => {
      if (byCode.has(act.code)) return;
      byCode.set(act.code, {
        code: act.code,
        name: act.country,
        flagUrl: act.flagUrl,
        appearances: 1,
        wins: act.rank === 1 ? 1 : 0,
        top10: act.rank && act.rank <= 10 ? 1 : 0,
        lastPlaces: 0,
        thirteenthPlaces: act.rank === 13 ? 1 : 0,
        averageRank: act.rank || 0,
      });
    });
    return Array.from(byCode.values()).sort((left, right) => right.wins - left.wins || right.top10 - left.top10);
  }, [currentActs]);

  const globalTotals = {
    players: players.length,
    seasons: Math.max(...players.map((player) => totals(player).seasons), 0),
    exact: players.reduce((sum, player) => sum + totals(player).exact, 0),
    winners: players.reduce((sum, player) => sum + totals(player).winners, 0),
  };

  return (
    <div className="grid gap-5">
      <section className="glass-panel ghost-grid home-hero-compact rounded-shell border border-white/10">
        <div className="grid gap-5 xl:grid-cols-[1fr_0.68fr] xl:items-end">
          <div className="min-w-0">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
            <h1 className="display-copy mt-3 max-w-5xl text-3xl font-black leading-[0.96] tracking-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{copy.intro}</p>
          </div>

          <div className="show-panel grid gap-3 p-4">
            <label className="grid gap-2 text-sm text-arenaMuted">
              <span>{copy.search}</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="arena-input arena-search-input" placeholder={copy.search} />
              </div>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {account ? (
                <button type="button" className="arena-button-room inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm" onClick={() => setSelectedPlayerId(account.id)}>
                  <Users size={15} />
                  {copy.myStats}
                </button>
              ) : null}
              <Link href="/admin" className="arena-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm">
                <Upload size={15} />
                {copy.import}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={copy.players} value={String(globalTotals.players)} />
        <MetricCard icon={BarChart3} label={copy.seasons} value={String(globalTotals.seasons)} />
        <MetricCard icon={Target} label={copy.exact} value={String(globalTotals.exact)} />
        <MetricCard icon={Trophy} label={copy.winners} value={String(globalTotals.winners)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.playerRating}</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{copy.playerHint}</p>
            </div>
            <span className="show-chip text-[11px] text-arenaMuted">
              <Sparkles size={13} />
              {loading ? "..." : `${rooms.length} ${language === "ru" ? "комнат" : "rooms"}`}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {filteredPlayers.map((player) => {
              const stats = totals(player);
              const active = selectedPlayer?.id === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`show-panel grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-4 p-4 text-left transition hover:bg-white/[0.08] ${active ? "ring-1 ring-arenaBeam/35" : ""}`}
                >
                  <UserAvatar name={getDisplayName(player.name)} avatarUrl={player.avatarUrl} avatarTheme={player.avatarTheme} className="h-20 w-20 shrink-0 md:h-24 md:w-24" textClass="text-2xl" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-white">{getDisplayName(player.name)}</p>
                    <p className="mt-1 text-sm text-arenaMuted">{stats.exact} {copy.exact.toLowerCase()} · {stats.close} {copy.close.toLowerCase()} · {stats.averagePoints} {copy.average.toLowerCase()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {player.achievements.slice(0, 3).map((achievement) => <AchievementPill key={achievement.key} achievement={achievement} language={language} compact />)}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="display-copy text-3xl font-black text-white">{stats.points}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-arenaMuted">{language === "ru" ? "очков" : "points"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPlayer && playerTotals ? (
          <div className="show-card overflow-hidden p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-[auto_1fr]">
              <UserAvatar name={getDisplayName(selectedPlayer.name)} avatarUrl={selectedPlayer.avatarUrl} avatarTheme={selectedPlayer.avatarTheme} className="h-28 w-28 md:h-36 md:w-36" textClass="text-4xl" />
              <div className="min-w-0">
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.profile}</p>
                <h2 className="display-copy mt-2 truncate text-3xl font-black text-white md:text-5xl">{getDisplayName(selectedPlayer.name)}</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <SmallStat label={copy.average} value={String(playerTotals.averagePoints)} />
                  <SmallStat label={copy.exact} value={String(playerTotals.exact)} />
                  <SmallStat label={copy.winners} value={String(playerTotals.winners)} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="show-panel p-4">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaBeam">{copy.years}</p>
                <div className="mt-4 grid gap-3">
                  {selectedPlayer.records.map((record) => <YearBar key={record.year} record={record} maxPoints={Math.max(...selectedPlayer.records.map((item) => item.points), 1)} />)}
                </div>
              </div>
              <div className="show-panel p-4">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{copy.achievements}</p>
                <div className="mt-4 grid gap-3">
                  {selectedPlayer.achievements.length ? selectedPlayer.achievements.map((achievement) => <AchievementPill key={achievement.key} achievement={achievement} language={language} />) : <p className="text-sm leading-7 text-arenaMuted">{copy.noImported}</p>}
                </div>
                <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/[0.035] p-4">
                  <p className="label-copy text-[10px] uppercase tracking-[0.22em] text-arenaBeam">{copy.funStats}</p>
                  <p className="mt-2 text-sm leading-7 text-arenaMuted">
                    {selectedPlayer.favoriteSlot ? (language === "ru" ? `Любимое подозрительное место: ${selectedPlayer.favoriteSlot}.` : `Suspicious favorite placement: ${selectedPlayer.favoriteSlot}.`) : copy.funText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="show-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.countries}</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.countryHint}</p>
          </div>
          <span className="show-chip text-[11px] text-arenaMuted"><Flag size={13} />{countryStats.length}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {countryStats.slice(0, 9).map((country) => (
            <CountryCard
              key={country.code}
              country={country}
              countryName={getCountryName(country.code, country.name)}
              labels={{ appearances: copy.appearances, wins: copy.wins, top10: copy.top10, lastPlaces: copy.lastPlaces, thirteenth: copy.thirteenth, avgRank: copy.avgRank }}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="show-card p-5 md:p-6">
          <Upload className="text-arenaBeam" size={25} />
          <h2 className="display-copy mt-4 text-2xl font-black text-white">{copy.import}</h2>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{copy.playerHint}</p>
        </div>
        <div className="show-card p-5 md:p-6">
          <Users className="text-arenaPulse" size={25} />
          <h2 className="display-copy mt-4 text-2xl font-black text-white">{copy.currentSource}</h2>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{copy.currentSourceText}</p>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="show-card min-w-0 p-4">
      <div className="flex items-center gap-2 text-arenaBeam">
        <Icon size={17} />
        <p className="label-copy truncate text-[10px] uppercase tracking-[0.2em] text-arenaMuted">{label}</p>
      </div>
      <p className="display-copy mt-3 text-4xl font-black text-white">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-arenaMuted">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function YearBar({ record, maxPoints }: { record: YearRecord; maxPoints: number }) {
  const width = `${Math.max(6, Math.round((record.points / maxPoints) * 100))}%`;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-white">{record.year} {record.champion ? "· ★" : ""}</span>
        <span className="text-arenaMuted">{record.points}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="stats-bar h-full rounded-full" style={{ width }} />
      </div>
      <p className="text-xs text-arenaMuted">exact {record.exact} · close {record.close} · winners {record.winners} · last {record.lastPlaces}</p>
    </div>
  );
}

function AchievementPill({ achievement, language, compact = false }: { achievement: Achievement; language: "ru" | "en"; compact?: boolean }) {
  const Icon = achievement.icon;
  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-gradient-to-br ${achievement.tone} ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-2 text-sm"}`}>
      <Icon size={compact ? 12 : 15} />
      <span className="truncate font-semibold">{language === "ru" ? achievement.titleRu : achievement.titleEn}</span>
      {!compact ? <span className="hidden text-xs opacity-75 md:inline">{language === "ru" ? achievement.textRu : achievement.textEn}</span> : null}
    </div>
  );
}

function CountryCard({
  country,
  labels,
  countryName,
}: {
  country: CountryHistory;
  labels: Record<"appearances" | "wins" | "top10" | "lastPlaces" | "thirteenth" | "avgRank", string>;
  countryName: string;
}) {
  return (
    <div className="show-panel min-w-0 overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <img src={country.flagUrl} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">{countryName}</p>
          <p className="text-sm text-arenaMuted">{country.appearances} {labels.appearances}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <SmallStat label={labels.wins} value={String(country.wins)} />
        <SmallStat label={labels.top10} value={String(country.top10)} />
        <SmallStat label={labels.avgRank} value={country.averageRank ? country.averageRank.toFixed(1) : "—"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-arenaMuted">
        <span className="show-chip">{country.lastPlaces} {labels.lastPlaces}</span>
        <span className="show-chip">{country.thirteenthPlaces} {labels.thirteenth}</span>
      </div>
    </div>
  );
}
