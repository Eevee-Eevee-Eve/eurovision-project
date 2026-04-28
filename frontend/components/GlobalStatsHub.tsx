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
  Upload,
  Users,
  Zap,
} from "lucide-react";
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
  former?: boolean;
  highlightArtist?: string;
  highlightSong?: string;
  highlightPhoto?: string | null;
  highlightRank?: number | null;
  highlightYear?: number;
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
  obvious: {
    key: "obvious",
    titleRu: "Слишком очевидно",
    titleEn: "Too obvious",
    textRu: "Угадал победителя, которого угадали многие.",
    textEn: "Guessed the winner most people also saw coming.",
    icon: BadgeCheck,
    tone: "from-sky-300/24 to-cyan-500/10 text-sky-100",
  },
  almostVanga: {
    key: "almostVanga",
    titleRu: "Почти Ванга",
    titleEn: "Almost Vanga",
    textRu: "Победитель был в топ-3 прогноза.",
    textEn: "Had the winner in the predicted top 3.",
    icon: Brain,
    tone: "from-purple-300/24 to-fuchsia-500/10 text-purple-100",
  },
  topTenKing: {
    key: "topTenKing",
    titleRu: "Король десятки",
    titleEn: "Top-10 ruler",
    textRu: "Часто угадывает состав верхней десятки.",
    textEn: "Often predicts the top-10 field correctly.",
    icon: ListChecks,
    tone: "from-lime-300/24 to-emerald-500/10 text-lime-100",
  },
  podiumSense: {
    key: "podiumSense",
    titleRu: "Пьедестальный нюх",
    titleEn: "Podium sense",
    textRu: "Чувствует верхнюю тройку.",
    textEn: "Has a strong read on the podium.",
    icon: Medal,
    tone: "from-yellow-200/24 to-orange-500/10 text-yellow-100",
  },
  madmanRight: {
    key: "madmanRight",
    titleRu: "Безумец был прав",
    titleEn: "The mad call worked",
    textRu: "Угадал редкого победителя, в которого почти никто не верил.",
    textEn: "Picked a winner almost nobody trusted.",
    icon: Laugh,
    tone: "from-rose-300/24 to-pink-500/10 text-rose-100",
  },
  millimeter: {
    key: "millimeter",
    titleRu: "Миллиметровщик",
    titleEn: "Millimeter mind",
    textRu: "Минимальное среднее отклонение.",
    textEn: "Lowest average placement distance.",
    icon: Gauge,
    tone: "from-teal-300/24 to-cyan-500/10 text-teal-100",
  },
  closeCall: {
    key: "closeCall",
    titleRu: "Почти попал, но красиво",
    titleEn: "Beautiful near miss",
    textRu: "Много попаданий на плюс-минус одно место.",
    textEn: "Lots of plus-or-minus-one predictions.",
    icon: CircleDot,
    tone: "from-indigo-300/24 to-blue-500/10 text-indigo-100",
  },
  dryMath: {
    key: "dryMath",
    titleRu: "Сухая математика",
    titleEn: "Dry math",
    textRu: "Высокий результат без сильных переоценок.",
    textEn: "High score without wild overrating.",
    icon: BarChart3,
    tone: "from-slate-200/24 to-slate-500/10 text-slate-100",
  },
  noPanic: {
    key: "noPanic",
    titleRu: "Без паники",
    titleEn: "No panic",
    textRu: "Стабильно держит уровень несколько лет.",
    textEn: "Keeps a steady level across years.",
    icon: ShieldCheck,
    tone: "from-green-300/24 to-emerald-500/10 text-green-100",
  },
  bottomWhisperer: {
    key: "bottomWhisperer",
    titleRu: "Подвал чувствую сердцем",
    titleEn: "Bottom-table whisperer",
    textRu: "Хорошо угадывает нижнюю пятерку.",
    textEn: "Reads the bottom five unusually well.",
    icon: Mountain,
    tone: "from-violet-300/24 to-indigo-500/10 text-violet-100",
  },
  lastRomantic: {
    key: "lastRomantic",
    titleRu: "Последний романтик",
    titleEn: "Last-place romantic",
    textRu: "Часто угадывает последнее место.",
    textEn: "Often nails the last place.",
    icon: Heart,
    tone: "from-red-300/24 to-rose-500/10 text-red-100",
  },
  antiHype: {
    key: "antiHype",
    titleRu: "Антихайп машина",
    titleEn: "Anti-hype machine",
    textRu: "Правильно не верит в общего фаворита.",
    textEn: "Correctly doubts the shared favorite.",
    icon: Bomb,
    tone: "from-orange-300/24 to-red-500/10 text-orange-100",
  },
  warnedYou: {
    key: "warnedYou",
    titleRu: "Я предупреждал",
    titleEn: "I warned you",
    textRu: "Занизил страну, которую большинство переоценило.",
    textEn: "Placed low a country everyone overrated.",
    icon: Zap,
    tone: "from-amber-300/24 to-red-500/10 text-amber-100",
  },
  secondCurse: {
    key: "secondCurse",
    titleRu: "Проклятие второго места",
    titleEn: "Second-place curse",
    textRu: "Слишком часто останавливается в шаге от победы.",
    textEn: "Stops one step from victory too often.",
    icon: Medal,
    tone: "from-zinc-200/24 to-zinc-500/10 text-zinc-100",
  },
  almostChampion: {
    key: "almostChampion",
    titleRu: "Почти чемпион",
    titleEn: "Almost champion",
    textRu: "Проиграл сезон с минимальным отрывом.",
    textEn: "Lost a season by a tiny margin.",
    icon: Gem,
    tone: "from-fuchsia-300/24 to-purple-500/10 text-fuchsia-100",
  },
  chaosDiploma: {
    key: "chaosDiploma",
    titleRu: "Хаос с дипломом",
    titleEn: "Certified chaos",
    textRu: "Странные прогнозы, но очки почему-то есть.",
    textEn: "Wild predictions, somehow still scores.",
    icon: Activity,
    tone: "from-blue-300/24 to-pink-500/10 text-blue-100",
  },
  heartVote: {
    key: "heartVote",
    titleRu: "Голосовал сердцем",
    titleEn: "Heart voter",
    textRu: "Регулярно переоценивает любимые страны.",
    textEn: "Regularly overrates favorite countries.",
    icon: Heart,
    tone: "from-pink-300/24 to-rose-500/10 text-pink-100",
  },
  comeback: {
    key: "comeback",
    titleRu: "Камбэк сезона",
    titleEn: "Season comeback",
    textRu: "Сильно вырос после слабого года.",
    textEn: "Jumped hard after a weak year.",
    icon: Flame,
    tone: "from-orange-300/24 to-yellow-500/10 text-orange-100",
  },
  veteran: {
    key: "veteran",
    titleRu: "Ветеран дивана",
    titleEn: "Sofa veteran",
    textRu: "Пять и больше сезонов в деле.",
    textEn: "Five or more seasons in play.",
    icon: CalendarCheck,
    tone: "from-cyan-300/24 to-indigo-500/10 text-cyan-100",
  },
  streak: {
    key: "streak",
    titleRu: "Стабильная рука",
    titleEn: "Steady hand",
    textRu: "Несколько лет подряд в верхней группе.",
    textEn: "Several years in a row near the top.",
    icon: Activity,
    tone: "from-emerald-300/24 to-lime-500/10 text-emerald-100",
  },
  countryFan: {
    key: "countryFan",
    titleRu: "Фан-клуб одной страны",
    titleEn: "One-country fan club",
    textRu: "Одна страна стабильно выше среднего.",
    textEn: "One country is consistently placed above average.",
    icon: Flag,
    tone: "from-sky-300/24 to-blue-500/10 text-sky-100",
  },
  bigFive: {
    key: "bigFive",
    titleRu: "Большая пятерка, малый риск",
    titleEn: "Big Five, small risk",
    textRu: "Хорошо читает автофиналистов.",
    textEn: "Reads automatic finalists well.",
    icon: Landmark,
    tone: "from-yellow-300/24 to-amber-500/10 text-yellow-100",
  },
};

const ALL_ACHIEVEMENTS = Object.values(ACHIEVEMENTS);

const SEED_PLAYERS: HistoricalPlayer[] = [
  {
    id: "seed-anastasia",
    name: "Анастасия З",
    avatarTheme: { primary: "#ff63c2", secondary: "#7f5cff", initials: "АЗ" },
    favoriteSlot: 13,
    achievements: [
      ACHIEVEMENTS.champion,
      ACHIEVEMENTS.thirteen,
      ACHIEVEMENTS.sniper,
      ACHIEVEMENTS.topTenKing,
      ACHIEVEMENTS.closeCall,
      ACHIEVEMENTS.streak,
      ACHIEVEMENTS.obvious,
    ],
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
    achievements: [
      ACHIEVEMENTS.oracle,
      ACHIEVEMENTS.basement,
      ACHIEVEMENTS.antiHype,
      ACHIEVEMENTS.warnedYou,
      ACHIEVEMENTS.lastRomantic,
      ACHIEVEMENTS.madmanRight,
      ACHIEVEMENTS.bigFive,
    ],
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
    achievements: [
      ACHIEVEMENTS.sniper,
      ACHIEVEMENTS.almostVanga,
      ACHIEVEMENTS.millimeter,
      ACHIEVEMENTS.dryMath,
      ACHIEVEMENTS.comeback,
      ACHIEVEMENTS.countryFan,
    ],
    records: [
      { year: 2023, points: 121, exact: 5, close: 8, winners: 0, lastPlaces: 1, rank: 4 },
      { year: 2024, points: 139, exact: 5, close: 12, winners: 1, lastPlaces: 1, rank: 4 },
      { year: 2025, points: 151, exact: 6, close: 12, winners: 0, lastPlaces: 2, rank: 3 },
    ],
  },
];

const SEED_COUNTRIES: CountryHistory[] = [
  { code: "AL", name: "Albania", flagUrl: "https://flagcdn.com/w80/al.png", highlightArtist: "Rona Nishliu", highlightSong: "Suus", highlightRank: 5, highlightYear: 2012, appearances: 20, wins: 0, top10: 2, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 17.2 },
  { code: "AD", name: "Andorra", flagUrl: "https://flagcdn.com/w80/ad.png", highlightArtist: "Anonymous", highlightSong: "Salvem el món", highlightRank: 12, highlightYear: 2007, appearances: 6, wins: 0, top10: 0, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 18.9 },
  { code: "AM", name: "Armenia", flagUrl: "https://flagcdn.com/w80/am.png", highlightArtist: "Sirusho", highlightSong: "Qélé, Qélé", highlightRank: 4, highlightYear: 2008, appearances: 17, wins: 0, top10: 7, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 11.2 },
  { code: "AU", name: "Australia", flagUrl: "https://flagcdn.com/w80/au.png", highlightArtist: "Dami Im", highlightSong: "Sound of Silence", highlightRank: 2, highlightYear: 2016, appearances: 9, wins: 0, top10: 4, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 11.7 },
  { code: "AT", name: "Austria", flagUrl: "https://flagcdn.com/w80/at.png", highlightArtist: "JJ", highlightSong: "Wasted Love", highlightRank: 1, highlightYear: 2025, appearances: 57, wins: 3, top10: 19, lastPlaces: 8, thirteenthPlaces: 2, averageRank: 14.1 },
  { code: "AZ", name: "Azerbaijan", flagUrl: "https://flagcdn.com/w80/az.png", highlightArtist: "Ell & Nikki", highlightSong: "Running Scared", highlightRank: 1, highlightYear: 2011, appearances: 16, wins: 1, top10: 7, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 12.4 },
  { code: "BY", name: "Belarus", flagUrl: "https://flagcdn.com/w80/by.png", highlightArtist: "Dmitry Koldun", highlightSong: "Work Your Magic", highlightRank: 6, highlightYear: 2007, appearances: 16, wins: 0, top10: 1, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 16.8 },
  { code: "BE", name: "Belgium", flagUrl: "https://flagcdn.com/w80/be.png", highlightArtist: "Sandra Kim", highlightSong: "J'aime la vie", highlightRank: 1, highlightYear: 1986, appearances: 65, wins: 1, top10: 27, lastPlaces: 8, thirteenthPlaces: 3, averageRank: 13.2 },
  { code: "BA", name: "Bosnia and Herzegovina", flagUrl: "https://flagcdn.com/w80/ba.png", highlightArtist: "Hari Mata Hari", highlightSong: "Lejla", highlightRank: 3, highlightYear: 2006, appearances: 19, wins: 0, top10: 5, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 12.8 },
  { code: "BG", name: "Bulgaria", flagUrl: "https://flagcdn.com/w80/bg.png", highlightArtist: "Kristian Kostov", highlightSong: "Beautiful Mess", highlightRank: 2, highlightYear: 2017, appearances: 14, wins: 0, top10: 4, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 14.7 },
  { code: "HR", name: "Croatia", flagUrl: "https://flagcdn.com/w80/hr.png", highlightArtist: "Baby Lasagna", highlightSong: "Rim Tim Tagi Dim", highlightRank: 2, highlightYear: 2024, appearances: 29, wins: 0, top10: 8, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 13.9 },
  { code: "CY", name: "Cyprus", flagUrl: "https://flagcdn.com/w80/cy.png", highlightArtist: "Eleni Foureira", highlightSong: "Fuego", highlightRank: 2, highlightYear: 2018, appearances: 40, wins: 0, top10: 12, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 14.6 },
  { code: "CZ", name: "Czechia", flagUrl: "https://flagcdn.com/w80/cz.png", highlightArtist: "Mikolas Josef", highlightSong: "Lie to Me", highlightRank: 6, highlightYear: 2018, appearances: 12, wins: 0, top10: 2, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 18.1 },
  { code: "DK", name: "Denmark", flagUrl: "https://flagcdn.com/w80/dk.png", highlightArtist: "Emmelie de Forest", highlightSong: "Only Teardrops", highlightRank: 1, highlightYear: 2013, appearances: 52, wins: 3, top10: 26, lastPlaces: 1, thirteenthPlaces: 2, averageRank: 11.9 },
  { code: "EE", name: "Estonia", flagUrl: "https://flagcdn.com/w80/ee.png", highlightArtist: "Tanel Padar, Dave Benton & 2XL", highlightSong: "Everybody", highlightRank: 1, highlightYear: 2001, appearances: 29, wins: 1, top10: 11, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 14.3 },
  { code: "FI", name: "Finland", flagUrl: "https://flagcdn.com/w80/fi.png", highlightArtist: "Lordi", highlightSong: "Hard Rock Hallelujah", highlightRank: 1, highlightYear: 2006, appearances: 57, wins: 1, top10: 13, lastPlaces: 11, thirteenthPlaces: 3, averageRank: 16.6 },
  { code: "FR", name: "France", flagUrl: "https://flagcdn.com/w80/fr.png", highlightArtist: "Marie Myriam", highlightSong: "L'oiseau et l'enfant", highlightRank: 1, highlightYear: 1977, appearances: 66, wins: 5, top10: 39, lastPlaces: 1, thirteenthPlaces: 4, averageRank: 10.6 },
  { code: "GE", name: "Georgia", flagUrl: "https://flagcdn.com/w80/ge.png", highlightArtist: "Eldrine", highlightSong: "One More Day", highlightRank: 9, highlightYear: 2011, appearances: 16, wins: 0, top10: 2, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 17.7 },
  { code: "DE", name: "Germany", flagUrl: "https://flagcdn.com/w80/de.png", highlightArtist: "Lena", highlightSong: "Satellite", highlightRank: 1, highlightYear: 2010, appearances: 67, wins: 2, top10: 34, lastPlaces: 10, thirteenthPlaces: 4, averageRank: 13.8 },
  { code: "GR", name: "Greece", flagUrl: "https://flagcdn.com/w80/gr.png", highlightArtist: "Helena Paparizou", highlightSong: "My Number One", highlightRank: 1, highlightYear: 2005, appearances: 44, wins: 1, top10: 20, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 11.5 },
  { code: "HU", name: "Hungary", flagUrl: "https://flagcdn.com/w80/hu.png", highlightArtist: "Friderika", highlightSong: "Kinek mondjam el vétkeimet?", highlightRank: 4, highlightYear: 1994, appearances: 17, wins: 0, top10: 5, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 14.9 },
  { code: "IS", name: "Iceland", flagUrl: "https://flagcdn.com/w80/is.png", highlightArtist: "Yohanna", highlightSong: "Is It True?", highlightRank: 2, highlightYear: 2009, appearances: 35, wins: 0, top10: 7, lastPlaces: 2, thirteenthPlaces: 2, averageRank: 15.1 },
  { code: "IE", name: "Ireland", flagUrl: "https://flagcdn.com/w80/ie.png", highlightArtist: "Eimear Quinn", highlightSong: "The Voice", highlightRank: 1, highlightYear: 1996, appearances: 57, wins: 7, top10: 31, lastPlaces: 2, thirteenthPlaces: 2, averageRank: 11.4 },
  { code: "IL", name: "Israel", flagUrl: "https://flagcdn.com/w80/il.png", highlightArtist: "Netta", highlightSong: "Toy", highlightRank: 1, highlightYear: 2018, appearances: 47, wins: 4, top10: 22, lastPlaces: 0, thirteenthPlaces: 3, averageRank: 11.8 },
  { code: "IT", name: "Italy", flagUrl: "https://flagcdn.com/w80/it.png", highlightArtist: "Måneskin", highlightSong: "Zitti e buoni", highlightRank: 1, highlightYear: 2021, appearances: 50, wins: 3, top10: 37, lastPlaces: 1, thirteenthPlaces: 1, averageRank: 8.9 },
  { code: "LV", name: "Latvia", flagUrl: "https://flagcdn.com/w80/lv.png", highlightArtist: "Marie N", highlightSong: "I Wanna", highlightRank: 1, highlightYear: 2002, appearances: 24, wins: 1, top10: 5, lastPlaces: 1, thirteenthPlaces: 0, averageRank: 17.3 },
  { code: "LT", name: "Lithuania", flagUrl: "https://flagcdn.com/w80/lt.png", highlightArtist: "LT United", highlightSong: "We Are the Winners", highlightRank: 6, highlightYear: 2006, appearances: 24, wins: 0, top10: 4, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 15.9 },
  { code: "LU", name: "Luxembourg", flagUrl: "https://flagcdn.com/w80/lu.png", highlightArtist: "Corinne Hermès", highlightSong: "Si la vie est cadeau", highlightRank: 1, highlightYear: 1983, appearances: 39, wins: 5, top10: 26, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 8.4 },
  { code: "MT", name: "Malta", flagUrl: "https://flagcdn.com/w80/mt.png", highlightArtist: "Ira Losco", highlightSong: "7th Wonder", highlightRank: 2, highlightYear: 2002, appearances: 35, wins: 0, top10: 14, lastPlaces: 2, thirteenthPlaces: 1, averageRank: 13.7 },
  { code: "MD", name: "Moldova", flagUrl: "https://flagcdn.com/w80/md.png", highlightArtist: "Sunstroke Project", highlightSong: "Hey Mamma", highlightRank: 3, highlightYear: 2017, appearances: 19, wins: 0, top10: 5, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 13.5 },
  { code: "MC", name: "Monaco", flagUrl: "https://flagcdn.com/w80/mc.png", highlightArtist: "Séverine", highlightSong: "Un banc, un arbre, une rue", highlightRank: 1, highlightYear: 1971, appearances: 24, wins: 1, top10: 16, lastPlaces: 1, thirteenthPlaces: 1, averageRank: 9.5 },
  { code: "ME", name: "Montenegro", flagUrl: "https://flagcdn.com/w80/me.png", highlightArtist: "Knez", highlightSong: "Adio", highlightRank: 13, highlightYear: 2015, appearances: 12, wins: 0, top10: 0, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 19.1 },
  { code: "MA", name: "Morocco", flagUrl: "https://flagcdn.com/w80/ma.png", highlightArtist: "Samira Bensaïd", highlightSong: "Bitaqat Hub", highlightRank: 18, highlightYear: 1980, appearances: 1, wins: 0, top10: 0, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 18.0 },
  { code: "NL", name: "Netherlands", flagUrl: "https://flagcdn.com/w80/nl.png", highlightArtist: "Duncan Laurence", highlightSong: "Arcade", highlightRank: 1, highlightYear: 2019, appearances: 63, wins: 5, top10: 30, lastPlaces: 5, thirteenthPlaces: 3, averageRank: 12.8 },
  { code: "MK", name: "North Macedonia", flagUrl: "https://flagcdn.com/w80/mk.png", highlightArtist: "Tamara Todevska", highlightSong: "Proud", highlightRank: 7, highlightYear: 2019, appearances: 21, wins: 0, top10: 1, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 17.9 },
  { code: "NO", name: "Norway", flagUrl: "https://flagcdn.com/w80/no.png", highlightArtist: "Alexander Rybak", highlightSong: "Fairytale", highlightRank: 1, highlightYear: 2009, appearances: 63, wins: 3, top10: 26, lastPlaces: 11, thirteenthPlaces: 3, averageRank: 13.4 },
  { code: "PL", name: "Poland", flagUrl: "https://flagcdn.com/w80/pl.png", highlightArtist: "Edyta Górniak", highlightSong: "To nie ja!", highlightRank: 2, highlightYear: 1994, appearances: 27, wins: 0, top10: 4, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 16.1 },
  { code: "PT", name: "Portugal", flagUrl: "https://flagcdn.com/w80/pt.png", highlightArtist: "Salvador Sobral", highlightSong: "Amar pelos dois", highlightRank: 1, highlightYear: 2017, appearances: 56, wins: 1, top10: 12, lastPlaces: 4, thirteenthPlaces: 2, averageRank: 15.4 },
  { code: "RO", name: "Romania", flagUrl: "https://flagcdn.com/w80/ro.png", highlightArtist: "Paula Seling & Ovi", highlightSong: "Playing with Fire", highlightRank: 3, highlightYear: 2010, appearances: 23, wins: 0, top10: 6, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 13.1 },
  { code: "RU", name: "Russia", flagUrl: "https://flagcdn.com/w80/ru.png", highlightArtist: "Dima Bilan", highlightSong: "Believe", highlightRank: 1, highlightYear: 2008, appearances: 23, wins: 1, top10: 14, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 9.8 },
  { code: "SM", name: "San Marino", flagUrl: "https://flagcdn.com/w80/sm.png", highlightArtist: "Serhat", highlightSong: "Say Na Na Na", highlightRank: 19, highlightYear: 2019, appearances: 14, wins: 0, top10: 0, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 20.7 },
  { code: "RS", name: "Serbia", flagUrl: "https://flagcdn.com/w80/rs.png", highlightArtist: "Marija Šerifović", highlightSong: "Molitva", highlightRank: 1, highlightYear: 2007, appearances: 17, wins: 1, top10: 7, lastPlaces: 0, thirteenthPlaces: 1, averageRank: 11.9 },
  { code: "CS", name: "Serbia and Montenegro", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Flag_of_Serbia_and_Montenegro.svg/80px-Flag_of_Serbia_and_Montenegro.svg.png", former: true, highlightArtist: "Željko Joksimović", highlightSong: "Lane moje", highlightRank: 2, highlightYear: 2004, appearances: 2, wins: 0, top10: 2, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 5.0 },
  { code: "SK", name: "Slovakia", flagUrl: "https://flagcdn.com/w80/sk.png", highlightArtist: "Marcel Palonder", highlightSong: "Kým nás máš", highlightRank: 18, highlightYear: 1996, appearances: 7, wins: 0, top10: 0, lastPlaces: 0, thirteenthPlaces: 0, averageRank: 19.4 },
  { code: "SI", name: "Slovenia", flagUrl: "https://flagcdn.com/w80/si.png", highlightArtist: "Darja Švajger", highlightSong: "Prisluhni mi", highlightRank: 7, highlightYear: 1995, appearances: 29, wins: 0, top10: 3, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 15.8 },
  { code: "ES", name: "Spain", flagUrl: "https://flagcdn.com/w80/es.png", highlightArtist: "Salomé", highlightSong: "Vivo cantando", highlightRank: 1, highlightYear: 1969, appearances: 65, wins: 2, top10: 30, lastPlaces: 5, thirteenthPlaces: 4, averageRank: 13.5 },
  { code: "SE", name: "Sweden", flagUrl: "https://flagcdn.com/w80/se.png", highlightArtist: "Loreen", highlightSong: "Tattoo", highlightRank: 1, highlightYear: 2023, appearances: 63, wins: 7, top10: 43, lastPlaces: 2, thirteenthPlaces: 2, averageRank: 8.7 },
  { code: "CH", name: "Switzerland", flagUrl: "https://flagcdn.com/w80/ch.png", highlightArtist: "Nemo", highlightSong: "The Code", highlightRank: 1, highlightYear: 2024, appearances: 65, wins: 3, top10: 30, lastPlaces: 9, thirteenthPlaces: 3, averageRank: 13.7 },
  { code: "TR", name: "Turkey", flagUrl: "https://flagcdn.com/w80/tr.png", highlightArtist: "Sertab Erener", highlightSong: "Everyway That I Can", highlightRank: 1, highlightYear: 2003, appearances: 34, wins: 1, top10: 10, lastPlaces: 3, thirteenthPlaces: 1, averageRank: 13.2 },
  { code: "UA", name: "Ukraine", flagUrl: "https://flagcdn.com/w80/ua.png", highlightArtist: "Kalush Orchestra", highlightSong: "Stefania", highlightRank: 1, highlightYear: 2022, appearances: 20, wins: 3, top10: 14, lastPlaces: 0, thirteenthPlaces: 2, averageRank: 7.1 },
  { code: "GB", name: "United Kingdom", flagUrl: "https://flagcdn.com/w80/gb.png", highlightArtist: "Katrina and the Waves", highlightSong: "Love Shine a Light", highlightRank: 1, highlightYear: 1997, appearances: 66, wins: 5, top10: 41, lastPlaces: 5, thirteenthPlaces: 4, averageRank: 10.9 },
  { code: "YU", name: "Yugoslavia", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Flag_of_SFR_Yugoslavia.svg/80px-Flag_of_SFR_Yugoslavia.svg.png", former: true, highlightArtist: "Riva", highlightSong: "Rock Me", highlightRank: 1, highlightYear: 1989, appearances: 27, wins: 1, top10: 15, lastPlaces: 1, thirteenthPlaces: 1, averageRank: 10.4 },
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
            achievementsCatalog: "Коллекция ачивок",
            achievementsCatalogText: "Полный набор бейджей, которые будут выдаваться автоматически после импорта архивных финалов.",
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
            achievementsCatalog: "Achievement collection",
            achievementsCatalogText: "The full badge set that will be awarded automatically after importing archived finals.",
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
        highlightArtist: act.artist,
        highlightSong: act.song,
        highlightPhoto: act.photoUrl,
        highlightRank: act.rank,
        highlightYear: 2026,
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

      <section className="show-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{copy.achievementsCatalog}</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-arenaMuted">{copy.achievementsCatalogText}</p>
          </div>
          <span className="show-chip text-[11px] text-arenaMuted">
            <Medal size={13} />
            {ALL_ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ALL_ACHIEVEMENTS.map((achievement) => (
            <AchievementBadgeCard key={achievement.key} achievement={achievement} language={language} />
          ))}
        </div>
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
          {countryStats.map((country) => (
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

function AchievementBadgeCard({ achievement, language }: { achievement: Achievement; language: "ru" | "en" }) {
  const Icon = achievement.icon;
  return (
    <div className={`achievement-card show-panel min-w-0 overflow-hidden bg-gradient-to-br ${achievement.tone}`}>
      <div className="achievement-card-shine" />
      <div className="relative z-10 flex h-full items-center gap-3 p-3.5">
        <div className="achievement-medal shrink-0">
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight text-white">{language === "ru" ? achievement.titleRu : achievement.titleEn}</p>
          <p className="mt-1.5 text-xs leading-5 opacity-85">{language === "ru" ? achievement.textRu : achievement.textEn}</p>
        </div>
      </div>
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
  const fallbackGradient = `linear-gradient(135deg, ${country.wins ? "rgba(255, 99, 194, 0.28)" : "rgba(129, 236, 255, 0.18)"}, rgba(36, 36, 58, 0.94))`;
  return (
    <Link href={`/stats/countries/${country.code.toLowerCase()}`} className="country-history-card show-panel block min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:bg-white/[0.075]">
      <div className="country-history-media" style={{ background: country.highlightPhoto ? undefined : fallbackGradient }}>
        {country.highlightPhoto ? (
          <img src={country.highlightPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : null}
        <div className="country-history-overlay" />
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
          <p className="truncate text-2xl font-black text-white">{countryName}</p>
          <p className="mt-1 truncate text-sm text-white/72">
            {country.highlightArtist
              ? `${country.highlightArtist}${country.highlightSong ? ` · ${country.highlightSong}` : ""}`
              : `${country.appearances} ${labels.appearances}`}
          </p>
          {country.highlightRank ? (
            <span className="mt-3 inline-flex rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              #{country.highlightRank} · {country.highlightYear}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4 text-center">
        <SmallStat label={labels.wins} value={String(country.wins)} />
        <SmallStat label={labels.top10} value={String(country.top10)} />
        <SmallStat label={labels.avgRank} value={country.averageRank ? country.averageRank.toFixed(1) : "—"} />
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-4 text-xs text-arenaMuted">
        <span className="show-chip">{country.appearances} {labels.appearances}</span>
        <span className="show-chip">{country.lastPlaces} {labels.lastPlaces}</span>
        <span className="show-chip">{country.thirteenthPlaces} {labels.thirteenth}</span>
      </div>
    </Link>
  );
}
