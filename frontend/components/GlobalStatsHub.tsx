'use client';

import Link from "next/link";
import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Bomb,
  Brain,
  CalendarCheck,
  CircleDot,
  Crown,
  Flame,
  Flag,
  Gauge,
  Gem,
  Heart,
  Landmark,
  Laugh,
  ListChecks,
  Medal,
  Mountain,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchRooms, fetchSeasonStats } from "../lib/api";
import { EUROVISION_COUNTRY_STATS, type EurovisionCountryStat } from "../lib/eurovision-country-stats";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { AccountProfile, AvatarTheme, PlayerSeasonStats, RoomSummary } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

type StatsTab = "players" | "countries" | "achievements";

type Achievement = {
  key: string;
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  icon: LucideIcon;
  tone: string;
};

type RegisteredPlayer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarTheme?: AvatarTheme | null;
  rooms: string[];
  submittedStages: number;
};

type CountryHistory = EurovisionCountryStat;

const ACHIEVEMENTS: Achievement[] = [
  {
    key: "champion",
    titleRu: "Победитель сезона",
    titleEn: "Season winner",
    textRu: "Забрал общий зачет года.",
    textEn: "Won the yearly leaderboard.",
    icon: Crown,
    tone: "from-amber-200/24 to-amber-500/10 text-amber-100",
  },
  {
    key: "oracle",
    titleRu: "Оракул первых мест",
    titleEn: "Winner oracle",
    textRu: "Угадал победителя финала.",
    textEn: "Predicted the final winner.",
    icon: Trophy,
    tone: "from-pink-300/24 to-fuchsia-500/10 text-pink-100",
  },
  {
    key: "sniper",
    titleRu: "Снайпер точных мест",
    titleEn: "Exact-place sniper",
    textRu: "Собрал много точных попаданий за сезон.",
    textEn: "Stacked exact placements across a season.",
    icon: Target,
    tone: "from-cyan-300/24 to-blue-500/10 text-cyan-100",
  },
  {
    key: "basement",
    titleRu: "Мастер нижней полки",
    titleEn: "Bottom-table master",
    textRu: "Хорошо чувствует последние места.",
    textEn: "Reads the bottom of the table unusually well.",
    icon: Award,
    tone: "from-violet-300/24 to-indigo-500/10 text-violet-100",
  },
  {
    key: "thirteen",
    titleRu: "Тринадцатый сектор",
    titleEn: "The 13th sense",
    textRu: "Подозрительно часто угадывает 13-е место.",
    textEn: "Suspiciously good at predicting 13th place.",
    icon: Star,
    tone: "from-emerald-300/24 to-teal-500/10 text-emerald-100",
  },
  {
    key: "obvious",
    titleRu: "Слишком очевидно",
    titleEn: "Too obvious",
    textRu: "Угадал победителя, которого видели многие.",
    textEn: "Guessed the winner most people also saw coming.",
    icon: BadgeCheck,
    tone: "from-sky-300/24 to-cyan-500/10 text-sky-100",
  },
  {
    key: "almostVanga",
    titleRu: "Почти Ванга",
    titleEn: "Almost Vanga",
    textRu: "Победитель был в твоем прогнозном топ-3.",
    textEn: "Had the winner in the predicted top 3.",
    icon: Brain,
    tone: "from-purple-300/24 to-fuchsia-500/10 text-purple-100",
  },
  {
    key: "topTenKing",
    titleRu: "Король десятки",
    titleEn: "Top-10 ruler",
    textRu: "Часто угадывает состав верхней десятки.",
    textEn: "Often predicts the top-10 field correctly.",
    icon: ListChecks,
    tone: "from-lime-300/24 to-emerald-500/10 text-lime-100",
  },
  {
    key: "podiumSense",
    titleRu: "Пьедестальный нюх",
    titleEn: "Podium sense",
    textRu: "Чувствует верхнюю тройку.",
    textEn: "Has a strong read on the podium.",
    icon: Medal,
    tone: "from-yellow-200/24 to-orange-500/10 text-yellow-100",
  },
  {
    key: "madmanRight",
    titleRu: "Безумец был прав",
    titleEn: "The mad call worked",
    textRu: "Поверил в редкого фаворита и оказался прав.",
    textEn: "Picked a winner almost nobody trusted.",
    icon: Laugh,
    tone: "from-rose-300/24 to-pink-500/10 text-rose-100",
  },
  {
    key: "millimeter",
    titleRu: "Миллиметровщик",
    titleEn: "Millimeter mind",
    textRu: "Минимальное среднее отклонение от итогов.",
    textEn: "Lowest average placement distance.",
    icon: Gauge,
    tone: "from-teal-300/24 to-cyan-500/10 text-teal-100",
  },
  {
    key: "closeCall",
    titleRu: "Почти попал, но красиво",
    titleEn: "Beautiful near miss",
    textRu: "Много попаданий на плюс-минус одно место.",
    textEn: "Lots of plus-or-minus-one predictions.",
    icon: CircleDot,
    tone: "from-indigo-300/24 to-blue-500/10 text-indigo-100",
  },
  {
    key: "dryMath",
    titleRu: "Сухая математика",
    titleEn: "Dry math",
    textRu: "Высокий результат без диких переоценок.",
    textEn: "High score without wild overrating.",
    icon: BarChart3,
    tone: "from-slate-200/24 to-slate-500/10 text-slate-100",
  },
  {
    key: "noPanic",
    titleRu: "Без паники",
    titleEn: "No panic",
    textRu: "Стабильно держит уровень весь сезон.",
    textEn: "Keeps a steady level across the season.",
    icon: ShieldCheck,
    tone: "from-green-300/24 to-emerald-500/10 text-green-100",
  },
  {
    key: "bottomWhisperer",
    titleRu: "Подвал чувствую сердцем",
    titleEn: "Bottom-table whisperer",
    textRu: "Хорошо угадывает нижнюю пятерку.",
    textEn: "Reads the bottom five unusually well.",
    icon: Mountain,
    tone: "from-violet-300/24 to-indigo-500/10 text-violet-100",
  },
  {
    key: "lastRomantic",
    titleRu: "Последний романтик",
    titleEn: "Last-place romantic",
    textRu: "Угадал последнее место.",
    textEn: "Nailed the last place.",
    icon: Heart,
    tone: "from-red-300/24 to-rose-500/10 text-red-100",
  },
  {
    key: "antiHype",
    titleRu: "Антихайп машина",
    titleEn: "Anti-hype machine",
    textRu: "Правильно не поверил в общего фаворита.",
    textEn: "Correctly doubted the shared favorite.",
    icon: Bomb,
    tone: "from-orange-300/24 to-red-500/10 text-orange-100",
  },
  {
    key: "warnedYou",
    titleRu: "Я предупреждал",
    titleEn: "I warned you",
    textRu: "Занизил страну, которую большинство переоценило.",
    textEn: "Placed low a country everyone overrated.",
    icon: Zap,
    tone: "from-amber-300/24 to-red-500/10 text-amber-100",
  },
  {
    key: "secondCurse",
    titleRu: "Проклятие второго места",
    titleEn: "Second-place curse",
    textRu: "Остановился в шаге от победы.",
    textEn: "Stopped one step from victory.",
    icon: Medal,
    tone: "from-zinc-200/24 to-zinc-500/10 text-zinc-100",
  },
  {
    key: "almostChampion",
    titleRu: "Почти чемпион",
    titleEn: "Almost champion",
    textRu: "Проиграл сезон с минимальным отрывом.",
    textEn: "Lost a season by a tiny margin.",
    icon: Gem,
    tone: "from-fuchsia-300/24 to-purple-500/10 text-fuchsia-100",
  },
  {
    key: "chaosDiploma",
    titleRu: "Хаос с дипломом",
    titleEn: "Certified chaos",
    textRu: "Странные прогнозы, но очки почему-то есть.",
    textEn: "Wild predictions, somehow still scores.",
    icon: Activity,
    tone: "from-blue-300/24 to-pink-500/10 text-blue-100",
  },
  {
    key: "heartVote",
    titleRu: "Голосовал сердцем",
    titleEn: "Heart voter",
    textRu: "Любимые страны регулярно оказываются выше среднего.",
    textEn: "Favorite countries regularly land above average.",
    icon: Heart,
    tone: "from-pink-300/24 to-rose-500/10 text-pink-100",
  },
  {
    key: "comeback",
    titleRu: "Камбэк сезона",
    titleEn: "Season comeback",
    textRu: "Сильно вырос после слабого этапа.",
    textEn: "Jumped hard after a weak stage.",
    icon: Flame,
    tone: "from-orange-300/24 to-yellow-500/10 text-orange-100",
  },
  {
    key: "veteran",
    titleRu: "Ветеран дивана",
    titleEn: "Sofa veteran",
    textRu: "Несколько сезонов подряд в деле.",
    textEn: "Several seasons in play.",
    icon: CalendarCheck,
    tone: "from-cyan-300/24 to-indigo-500/10 text-cyan-100",
  },
  {
    key: "streak",
    titleRu: "Стабильная рука",
    titleEn: "Steady hand",
    textRu: "Несколько этапов подряд в верхней группе.",
    textEn: "Several stages in a row near the top.",
    icon: Activity,
    tone: "from-emerald-300/24 to-lime-500/10 text-emerald-100",
  },
  {
    key: "countryFan",
    titleRu: "Фан-клуб одной страны",
    titleEn: "One-country fan club",
    textRu: "Одна страна стабильно выше твоего среднего прогноза.",
    textEn: "One country is consistently placed above average.",
    icon: Flag,
    tone: "from-sky-300/24 to-blue-500/10 text-sky-100",
  },
  {
    key: "bigFive",
    titleRu: "Большая пятерка, малый риск",
    titleEn: "Big Five, small risk",
    textRu: "Хорошо читает автофиналистов.",
    textEn: "Reads automatic finalists well.",
    icon: Landmark,
    tone: "from-yellow-300/24 to-amber-500/10 text-yellow-100",
  },
];

function playerFromSeason(player: PlayerSeasonStats, roomName: string): RegisteredPlayer {
  return {
    id: player.id,
    name: player.name,
    avatarUrl: player.avatarUrl,
    avatarTheme: player.avatarTheme,
    rooms: [roomName],
    submittedStages: player.submittedStages,
  };
}

function playerFromAccount(account: AccountProfile): RegisteredPlayer {
  return {
    id: account.id,
    name: account.publicName,
    avatarUrl: account.avatarUrl,
    avatarTheme: account.avatarTheme,
    rooms: [],
    submittedStages: 0,
  };
}

function normalizePlayerName(name: string, getDisplayName: (value: string) => string) {
  return getDisplayName(name).trim().toLocaleLowerCase();
}

export function GlobalStatsHub() {
  const { account } = useAccount();
  const { language, getCountryName, getDisplayName } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatsTab>("players");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [loading, setLoading] = useState(true);

  const copy = useMemo(
    () =>
      language === "ru"
        ? {
            kicker: "Статистика клуба",
            title: "Стартуем честную историю с этого сезона",
            intro:
              "По прошлым вечеринкам у нас есть только общие баллы, без раскладки по каждому прогнозу. Поэтому глубокую статистику не подделываем: сейчас показываем зарегистрированных игроков, а точные места, близкие попадания, победы и ачивки начнут считаться после Евровидения.",
            search: "Найти игрока",
            myStats: "Моя карточка",
            players: "Игроки",
            achievements: "Ачивки",
            registered: "Зарегистрировано",
            rooms: "Комнат",
            season: "Сезон",
            status: "Статус",
            waiting: "Ждем финал",
            playerList: "Зарегистрированные игроки",
            playerHint: "Здесь только реальные аккаунты из активных комнат. История прогнозов появится после завершения сезона.",
            profile: "Карточка игрока",
            noStatsTitle: "Статистика пока не начислялась",
            noStatsText:
              "После финала здесь появятся очки, точные места, близкие попадания, лучшие этапы и полученные ачивки. Старые общие баллы можно будет добавить позже отдельной строкой, без выдуманной детализации.",
            noPlayers: "Пока нет зарегистрированных игроков.",
            submittedStages: "Сдано этапов",
            joinedRooms: "Комнаты",
            achievementCatalog: "Каталог ачивок",
            achievementText:
              "Это витрина того, что можно заработать в сезоне. Сейчас все бейджи закрыты, а выдача включится после импорта или расчета финальных результатов.",
            locked: "Пока закрыто",
            countries: "Страны",
            countrySearch: "Найти страну",
            countryHint: "История стран у нас отдельная и нормальная: участия, победы, топ-10, последние места, 13-е место и средняя позиция. Здесь ее оставляем.",
            appearances: "участий",
            wins: "побед",
            top10: "топ-10",
            lastPlaces: "последних",
            thirteenth: "13-х",
            avgRank: "ср. место",
          }
        : {
            kicker: "Club stats",
            title: "A clean history starts this season",
            intro:
              "Past parties only have total scores, not full prediction-by-prediction data. So we are not faking deep history: for now this page shows registered players, while exact places, close calls, wins, and achievements start tracking after Eurovision.",
            search: "Find player",
            myStats: "My card",
            players: "Players",
            achievements: "Achievements",
            registered: "Registered",
            rooms: "Rooms",
            season: "Season",
            status: "Status",
            waiting: "Waiting for final",
            playerList: "Registered players",
            playerHint: "Only real accounts from active rooms live here. Prediction history appears after the season is completed.",
            profile: "Player card",
            noStatsTitle: "No stats counted yet",
            noStatsText:
              "After the final this card will show points, exact places, close calls, best stages, and earned achievements. Older total scores can be added later as totals without invented detail.",
            noPlayers: "No registered players yet.",
            submittedStages: "Submitted stages",
            joinedRooms: "Rooms",
            achievementCatalog: "Achievement catalog",
            achievementText:
              "A preview of what players can earn this season. Badges are locked for now and will unlock after final results are imported or calculated.",
            locked: "Locked for now",
            countries: "Countries",
            countrySearch: "Find country",
            countryHint: "Country history is separate and solid: appearances, wins, top-10s, last places, 13th places, and average rank. This section stays.",
            appearances: "apps",
            wins: "wins",
            top10: "top-10",
            lastPlaces: "last",
            thirteenth: "13th",
            avgRank: "avg rank",
          },
    [language],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const roomsPayload = await fetchRooms();
        const loadedRooms = roomsPayload.rooms.length ? roomsPayload.rooms : [FALLBACK_ROOM];
        const statsResults = await Promise.allSettled(loadedRooms.map((room) => fetchSeasonStats(room.slug)));
        const byId = new Map<string, RegisteredPlayer>();
        const accountKey = account ? normalizePlayerName(account.publicName, getDisplayName) : "";

        statsResults.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const roomName = loadedRooms[index]?.name || result.value.roomName;
          result.value.players.forEach((player) => {
            const key = normalizePlayerName(player.name, getDisplayName) || player.id;
            const existing = byId.get(key);
            if (existing) {
              existing.rooms = Array.from(new Set([...existing.rooms, roomName]));
              existing.submittedStages = Math.max(existing.submittedStages, player.submittedStages);
              return;
            }
            byId.set(key, playerFromSeason(player, roomName));
          });
        });

        if (account && !byId.has(accountKey)) {
          byId.set(accountKey || account.id, playerFromAccount(account));
        }

        if (!active) return;
        setRooms(loadedRooms);
        setPlayers(Array.from(byId.values()).sort((left, right) => getDisplayName(left.name).localeCompare(getDisplayName(right.name), language === "ru" ? "ru" : "en")));
      } catch (error) {
        console.error(error);
        if (active && account) {
          setPlayers([playerFromAccount(account)]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [account, getDisplayName, language]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCountryQuery = countryQuery.trim().toLowerCase();
  const filteredPlayers = players.filter((player) => getDisplayName(player.name).toLowerCase().includes(normalizedQuery));
  const accountNameKey = account ? normalizePlayerName(account.publicName, getDisplayName) : "";
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId)
    || (selectedPlayerId === account?.id && accountNameKey
      ? players.find((player) => normalizePlayerName(player.name, getDisplayName) === accountNameKey)
      : null)
    || (accountNameKey ? players.find((player) => normalizePlayerName(player.name, getDisplayName) === accountNameKey) : null)
    || players[0]
    || null;
  const countryStats = useMemo(
    () => [...EUROVISION_COUNTRY_STATS].sort((left, right) => right.wins - left.wins || right.top10 - left.top10),
    [],
  );
  const filteredCountries = countryStats.filter((country) => {
    const localName = getCountryName(country.code, country.name).toLowerCase();
    return localName.includes(normalizedCountryQuery)
      || country.name.toLowerCase().includes(normalizedCountryQuery)
      || country.code.toLowerCase().includes(normalizedCountryQuery);
  });

  return (
    <div className="stats-page-safe grid min-w-0 gap-5">
      <section className="glass-panel ghost-grid home-hero-compact min-w-0 rounded-shell border border-white/10">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1fr_0.68fr] xl:items-end">
          <div className="min-w-0">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
            <h1 className="display-copy mt-3 max-w-5xl text-3xl font-black leading-[0.96] tracking-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">{copy.intro}</p>
          </div>

          <div className="show-panel grid min-w-0 gap-3 p-4">
            <label className="grid gap-2 text-sm text-arenaMuted">
              <span>{activeTab === "countries" ? copy.countrySearch : copy.search}</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted" />
                <input
                  value={activeTab === "countries" ? countryQuery : query}
                  onChange={(event) => {
                    if (activeTab === "countries") {
                      setCountryQuery(event.target.value);
                    } else {
                      setQuery(event.target.value);
                    }
                  }}
                  className="arena-input arena-search-input"
                  placeholder={activeTab === "countries" ? copy.countrySearch : copy.search}
                />
              </div>
            </label>
            {account ? (
              <button type="button" className="arena-button-room inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm" onClick={() => {
                setActiveTab("players");
                setSelectedPlayerId(account.id);
              }}>
                <Users size={15} />
                {copy.myStats}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={copy.registered} value={loading ? "..." : String(players.length)} />
        <MetricCard icon={Flag} label={copy.rooms} value={String(rooms.length)} />
        <MetricCard icon={CalendarCheck} label={copy.season} value="2026" />
        <MetricCard icon={Sparkles} label={copy.status} value={copy.waiting} />
      </section>

      <section className="stats-tabs show-panel min-w-0 p-2">
        {[
          { key: "players" as const, label: copy.players, icon: Users },
          { key: "countries" as const, label: copy.countries, icon: Flag },
          { key: "achievements" as const, label: copy.achievements, icon: Medal },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`stats-tab-button ${activeTab === tab.key ? "stats-tab-button-active" : ""}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </section>

      {activeTab === "players" ? (
        <section className="grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="show-card min-w-0 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.playerList}</p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{copy.playerHint}</p>
              </div>
              <span className="show-chip text-[11px] text-arenaMuted">
                <Sparkles size={13} />
                {loading ? "..." : players.length}
              </span>
            </div>

            <div className="stats-scroll-list show-scroll mt-5 grid min-w-0 gap-3 pr-1">
              {filteredPlayers.length ? filteredPlayers.map((player) => {
                const active = selectedPlayer?.id === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`show-panel grid min-w-0 grid-cols-[auto_1fr] items-center gap-4 p-4 text-left transition hover:bg-white/[0.08] ${active ? "ring-1 ring-arenaBeam/35" : ""}`}
                  >
                    <UserAvatar name={getDisplayName(player.name)} avatarUrl={player.avatarUrl} avatarTheme={player.avatarTheme || undefined} className="h-20 w-20 shrink-0 md:h-24 md:w-24" textClass="text-2xl" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-white">{getDisplayName(player.name)}</p>
                      <p className="mt-1 text-sm text-arenaMuted">
                        {copy.submittedStages}: {player.submittedStages} · {copy.joinedRooms}: {player.rooms.length || 0}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="show-chip px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-arenaMuted">{copy.locked}</span>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="show-panel p-5 text-sm text-arenaMuted">{copy.noPlayers}</div>
              )}
            </div>
          </div>

          <div className="show-card min-w-0 overflow-hidden p-5 md:p-6">
            {selectedPlayer ? (
              <>
                <div className="grid min-w-0 gap-5 md:grid-cols-[auto_1fr]">
                  <UserAvatar name={getDisplayName(selectedPlayer.name)} avatarUrl={selectedPlayer.avatarUrl} avatarTheme={selectedPlayer.avatarTheme || undefined} className="h-28 w-28 md:h-36 md:w-36" textClass="text-4xl" />
                  <div className="min-w-0">
                    <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.profile}</p>
                    <h2 className="display-copy mt-2 truncate text-3xl font-black text-white md:text-5xl">{getDisplayName(selectedPlayer.name)}</h2>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <SmallStat label={copy.submittedStages} value={String(selectedPlayer.submittedStages)} />
                      <SmallStat label={copy.joinedRooms} value={String(selectedPlayer.rooms.length)} />
                      <SmallStat label={copy.achievements} value="0" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 show-panel p-5">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.noStatsTitle}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.noStatsText}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ACHIEVEMENTS.slice(0, 6).map((achievement) => (
                    <AchievementBadgeCard key={achievement.key} achievement={achievement} language={language} compact />
                  ))}
                </div>
              </>
            ) : (
              <div className="show-panel p-5 text-sm text-arenaMuted">{copy.noPlayers}</div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "countries" ? (
        <section className="show-card min-w-0 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.countries}</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.countryHint}</p>
            </div>
            <span className="show-chip text-[11px] text-arenaMuted">
              <Flag size={13} />
              {countryStats.length}
            </span>
          </div>
          <div className="stats-country-grid mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCountries.map((country) => (
              <CountryCard
                key={country.code}
                country={country}
                countryName={getCountryName(country.code, country.name)}
                language={language}
                labels={{
                  appearances: copy.appearances,
                  wins: copy.wins,
                  top10: copy.top10,
                  lastPlaces: copy.lastPlaces,
                  thirteenth: copy.thirteenth,
                  avgRank: copy.avgRank,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "achievements" ? (
        <section className="show-card min-w-0 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.achievementCatalog}</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.achievementText}</p>
            </div>
            <span className="show-chip text-[11px] text-arenaMuted">
              <Medal size={13} />
              {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="achievement-vault mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ACHIEVEMENTS.map((achievement) => (
              <AchievementBadgeCard key={achievement.key} achievement={achievement} language={language} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="show-card p-5">
      <div className="flex items-center gap-2 text-arenaBeam">
        <Icon size={18} />
        <p className="label-copy text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{label}</p>
      </div>
      <p className="display-copy mt-4 text-3xl font-black text-white md:text-4xl">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="show-panel p-4">
      <p className="label-copy text-[10px] uppercase tracking-[0.2em] text-arenaMuted">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function CountryCard({
  country,
  labels,
  countryName,
  language,
}: {
  country: CountryHistory;
  labels: Record<"appearances" | "wins" | "top10" | "lastPlaces" | "thirteenth" | "avgRank", string>;
  countryName: string;
  language: "ru" | "en";
}) {
  const fallbackGradient = `linear-gradient(135deg, ${country.wins ? "rgba(255, 99, 194, 0.2)" : "rgba(129, 236, 255, 0.14)"}, rgba(36, 36, 58, 0.96))`;
  const heroPhoto = country.heroPhoto || country.highlightPhoto;
  const hasCuratedHero = Boolean(country.heroPhoto);
  const yearRange = country.firstYear === country.latestYear ? String(country.firstYear) : `${country.firstYear}-${country.latestYear}`;
  const winYears = country.winYears.length ? country.winYears.slice(-4).join(", ") : language === "ru" ? "пока без побед" : "no wins yet";
  const headline = !country.highlightRank
    ? language === "ru" ? `${country.appearances} участий` : `${country.appearances} appearances`
    : country.highlightRank === 1
      ? language === "ru" ? `Победа ${country.highlightYear}` : `${country.highlightYear} winner`
      : language === "ru" ? `Лучшее место: #${country.highlightRank}` : `Best rank: #${country.highlightRank}`;
  const funLine = country.lastPlaces >= 5
    ? language === "ru" ? "Драматичная история с последними местами." : "A dramatic record at the bottom."
    : country.top10Rate >= 55
      ? language === "ru" ? "Частый гость верхней десятки." : "A frequent top-10 guest."
      : country.thirteenthPlaces >= 4
        ? language === "ru" ? "Подозрительно часто рядом с 13-м местом." : "Suspiciously close to 13th place."
        : language === "ru" ? "История ровнее, чем кажется с первого взгляда." : "A steadier record than it first looks.";

  return (
    <Link href={`/stats/countries/${country.code.toLowerCase()}`} className="country-history-card show-panel block min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:bg-white/[0.075]">
      <div className="country-history-media" style={{ background: fallbackGradient }}>
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt=""
            className={`country-history-photo ${hasCuratedHero ? "country-history-photo-curated" : "country-history-photo-fallback"}`}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div className="country-history-overlay" />
        <span className="country-history-watermark">{country.code}</span>
        <span className="country-history-flag-fallback">{country.code}</span>
        <img
          src={country.flagUrl}
          alt=""
          className="country-history-flag"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute bottom-4 left-4 right-4 min-w-0">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-2xl font-black text-white">{countryName}</p>
              <p className="mt-1 truncate text-sm text-white/72">
                {country.highlightArtist
                  ? `${country.highlightArtist}${country.highlightSong ? ` · ${country.highlightSong}` : ""}`
                  : `${country.appearances} ${labels.appearances}`}
              </p>
            </div>
            <span className="country-best-badge">{headline}</span>
          </div>
        </div>
        {country.heroPhotoCredit ? <span className="country-photo-credit">{country.heroPhotoCredit}</span> : null}
      </div>
      <div className="grid grid-cols-3 gap-2 p-4 text-center">
        <SmallStat label={labels.wins} value={String(country.wins)} />
        <SmallStat label={labels.top10} value={String(country.top10)} />
        <SmallStat label={labels.avgRank} value={country.averageRank ? country.averageRank.toFixed(1) : "-"} />
      </div>
      <div className="grid gap-2 px-4 pb-4 text-xs text-arenaMuted">
        <div className="grid grid-cols-2 gap-2">
          <span className="show-chip">{country.appearances} {labels.appearances}</span>
          <span className="show-chip">{yearRange}</span>
          <span className="show-chip">{country.top10Rate}% top-10</span>
          <span className="show-chip">{labels.wins}: {winYears}</span>
        </div>
        <p className="rounded-[1rem] border border-white/8 bg-white/[0.035] px-3 py-2 leading-5 text-white/68">{funLine}</p>
      </div>
    </Link>
  );
}

function AchievementBadgeCard({ achievement, language, compact = false }: { achievement: Achievement; language: string; compact?: boolean }) {
  const Icon = achievement.icon;
  return (
    <div className={`show-panel achievement-card min-w-0 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`achievement-icon bg-gradient-to-br ${achievement.tone}`}>
          <Icon size={compact ? 17 : 20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white md:text-base">{language === "ru" ? achievement.titleRu : achievement.titleEn}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-arenaMuted">{language === "ru" ? achievement.textRu : achievement.textEn}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
        <div className="h-full w-0 rounded-full bg-gradient-to-r from-arenaPulse to-arenaBeam" />
      </div>
    </div>
  );
}
