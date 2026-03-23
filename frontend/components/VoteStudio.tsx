'use client';

import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Lock, NotebookPen, Radio, Search, Send, Sparkles } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createRoomSocket,
  fetchActs,
  fetchMyPrediction,
  fetchRoom,
  joinRoom,
  submitMyPrediction,
} from "../lib/api";
import { loadNotes, loadRanking, saveNotes, saveRanking } from "../lib/storage";
import type { ActEntry, ActNote, NoteTone, RoomDetails, StageKey } from "../lib/types";
import {
  NOTE_TONES,
  createDefaultRanking,
  hasNote,
  moveCodeBy,
  moveCodeToIndex,
  normalizeRanking,
} from "../lib/vote-utils";
import { useAccount } from "./AccountProvider";
import { ActPoster } from "./ActPoster";
import { AuthCard } from "./AuthCard";
import { BottomSheet } from "./BottomSheet";
import { StageSwitch } from "./StageSwitch";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

type VoteTab = "acts" | "notes" | "order";

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function buildRankingMap(ranking: string[]) {
  return ranking.reduce<Record<string, number>>((acc, code, index) => {
    acc[code] = index + 1;
    return acc;
  }, {});
}

function sortActsByRanking(acts: ActEntry[], rankingMap: Record<string, number>) {
  return acts
    .slice()
    .sort((left, right) => {
      const leftRank = rankingMap[left.code] ?? Number.MAX_SAFE_INTEGER;
      const rightRank = rankingMap[right.code] ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.artist.localeCompare(right.artist, "en");
    });
}

export function VoteStudio({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const { account, loading: accountLoading } = useAccount();
  const { getActBlurb, getActContext, getActFacts, getCountryName, getStageLabel, language } = useLanguage();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [acts, setActs] = useState<ActEntry[]>([]);
  const [ranking, setRanking] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, ActNote>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selectedTab, setSelectedTab] = useState<VoteTab>("acts");
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [lineupReady, setLineupReady] = useState(true);
  const [expectedEntries, setExpectedEntries] = useState(0);
  const [currentEntries, setCurrentEntries] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const text = useMemo(() => (
    language === "ru"
      ? {
          kicker: "Телефон / бюллетень",
          title: "Личный бюллетень",
          description:
            "Смотри артистов, веди заметки как на бумаге и собирай свой полный порядок мест. Это companion-экран для телефона, а не сценический экран.",
          stageForming: "Состав этапа ещё формируется",
          stageFormingText: (count: number, total: number) => `Сейчас подтверждено ${count} из ${total} участников. Как только состав будет полным, бюллетень автоматически подстроится под официальный этап.`,
          roomLabel: "Комната",
          openGuide: "Полный гид по артистам",
          openShow: "Экран эфира",
          accountReady: "Аккаунт активен",
          accountNeeded: "Чтобы отправить бюллетень, нужен аккаунт",
          loginHint: "Вход нужен только для фиксации ответа. Смотреть артистов и вести заметки можно уже сейчас.",
          liveWindowOpen: "Голосование открыто",
          liveWindowClosed: "Голосование закрыто",
          lockedState: "Бюллетень уже зафиксирован",
          lineupLabel: "Состав этапа",
          notesCount: "Заметки",
          rankingCount: "Мест расставлено",
          tabs: {
            acts: "Артисты",
            notes: "Заметки",
            order: "Мой порядок",
          },
          searchPlaceholder: "Поиск по артисту, стране или песне",
          openCard: "Открыть карточку",
          aboutArtist: "Об исполнителе",
          noteLabel: "Моя заметка",
          noteHint: "Короткая мысль по ходу шоу, как на бумаге.",
          noteSaved: "Сохранено на этом устройстве",
          noNotesYet: "Пока заметок нет. Выбери тег или напиши короткую мысль.",
          clearNote: "Очистить",
          rankingLabel: "Моё место",
          quickGuide: "Открыть полный гид",
          officialProfile: "Официальный профиль",
          choosePlace: "Поставить на место",
          moveHigher: "Выше",
          moveLower: "Ниже",
          emptyActs: "Ничего не найдено. Попробуй другой запрос.",
          submitTitle: "Финальная отправка",
          submitText: "Когда порядок готов, зафиксируй его. После отправки этот этап больше нельзя менять.",
          submitButton: "Зафиксировать бюллетень",
          submitDisabledNoAccount: "Сначала войди в аккаунт",
          submitDisabledClosed: "Сейчас окно голосования закрыто",
          submitDisabledLineup: "Этап ещё не собран полностью",
          submitDisabledLocked: "Ответ уже зафиксирован",
          submitSuccess: "Бюллетень зафиксирован. Теперь можно спокойно следить за эфиром.",
          loadError: "Не удалось загрузить бюллетень для этого этапа.",
          saveOrderHint: "Порядок и заметки сохраняются локально даже до входа в аккаунт.",
          blockedMessage: "Хост временно убрал тебя из этой комнаты. Смотреть артистов можно, но ответ отправить нельзя.",
          currentPlace: "Сейчас у тебя",
          notesBoardTitle: "Цифровой лист заметок",
          notesBoardText: "Здесь удобно быстро помечать всех артистов подряд, а не открывать каждую карточку по отдельности.",
          noNoteRows: "Пока нет артистов для заметок.",
          orderTitle: "Полный порядок мест",
          orderText: "Это твой окончательный список 1..N. Можно двигать артистов вверх-вниз или поставить сразу на нужное место.",
          summaryTitle: "Статус бюллетеня",
          stageStatusIdle: "Ожидаем шоу",
          stageStatusLive: "Этап в эфире",
          finalContextLabel: "Путь в финал",
          notePlaceholder: "Короткая заметка про номер, вокал, песню или вайб…",
          savedBadge: "Есть заметка",
          placeUnknown: "Черновик",
          tabDescriptions: {
            acts: "Быстрые карточки артистов для просмотра во время шоу.",
            notes: "Личный цифровой лист заметок по всем артистам.",
            order: "Полный личный рейтинг 1..N без одинаковых мест.",
          },
        }
      : {
          kicker: "Phone / ballot",
          title: "Personal ballot",
          description:
            "Browse acts, keep notes like on paper, and build your full ranking. This is the personal companion screen, not the projector view.",
          stageForming: "This stage lineup is still forming",
          stageFormingText: (count: number, total: number) => `${count} of ${total} acts are confirmed right now. Once the lineup is complete, the ballot will align to the official stage.`,
          roomLabel: "Room",
          openGuide: "Full acts guide",
          openShow: "Show screen",
          accountReady: "Account active",
          accountNeeded: "You need an account to submit the ballot",
          loginHint: "Login is only required to lock your answer. You can already browse acts and keep notes.",
          liveWindowOpen: "Voting is open",
          liveWindowClosed: "Voting is closed",
          lockedState: "Ballot already locked",
          lineupLabel: "Stage lineup",
          notesCount: "Notes",
          rankingCount: "Placed acts",
          tabs: {
            acts: "Acts",
            notes: "Notes",
            order: "My order",
          },
          searchPlaceholder: "Search by act, country, or song",
          openCard: "Open card",
          aboutArtist: "About the artist",
          noteLabel: "My note",
          noteHint: "A quick thought during the show, just like on paper.",
          noteSaved: "Saved on this device",
          noNotesYet: "No notes yet. Pick a tag or write a quick thought.",
          clearNote: "Clear",
          rankingLabel: "My place",
          quickGuide: "Open full guide",
          officialProfile: "Official profile",
          choosePlace: "Set place",
          moveHigher: "Move up",
          moveLower: "Move down",
          emptyActs: "Nothing matched this search.",
          submitTitle: "Final submit",
          submitText: "When the order is ready, lock it in. After submit this stage can no longer be changed.",
          submitButton: "Lock ballot",
          submitDisabledNoAccount: "Sign in first",
          submitDisabledClosed: "Voting is closed right now",
          submitDisabledLineup: "The stage lineup is not complete yet",
          submitDisabledLocked: "Answer already locked",
          submitSuccess: "Ballot locked. Now you can just enjoy the show.",
          loadError: "Unable to load the ballot for this stage.",
          saveOrderHint: "Order and notes are saved locally even before login.",
          blockedMessage: "The host temporarily removed you from this room. You can still browse acts, but you cannot submit.",
          currentPlace: "Currently",
          notesBoardTitle: "Digital notes sheet",
          notesBoardText: "This is the fastest place to mark everyone in a row without opening every single card.",
          noNoteRows: "No acts available for notes yet.",
          orderTitle: "Full ranking order",
          orderText: "This is your final 1..N list. Move acts up or down, or jump straight to the exact place.",
          summaryTitle: "Ballot status",
          stageStatusIdle: "Waiting for the show",
          stageStatusLive: "Stage live",
          finalContextLabel: "Road to the final",
          notePlaceholder: "A quick note about vocals, staging, song, or overall vibe…",
          savedBadge: "Note saved",
          placeUnknown: "Draft",
          tabDescriptions: {
            acts: "Quick act cards for live browsing during the show.",
            notes: "Your personal digital notes sheet for every act.",
            order: "Your full personal ranking 1..N with no duplicate places.",
          },
        }
  ), [language]);

  const toneLabels = useMemo<Record<NoteTone, string>>(() => (
    language === "ru"
      ? {
          favorite: "Фаворит",
          watch: "Следить",
          vocals: "Вокал",
          skip: "Мимо",
        }
      : {
          favorite: "Favorite",
          watch: "Watch",
          vocals: "Vocals",
          skip: "Skip",
        }
  ), [language]);

  const currentStageOpen = room?.predictionWindows[stageKey] ?? false;
  const selectedAct = acts.find((act) => act.code === selectedActCode) || null;
  const rankingMap = useMemo(() => buildRankingMap(ranking), [ranking]);
  const noteCount = useMemo(() => Object.values(notes).filter((entry) => hasNote(entry)).length, [notes]);

  function persistRanking(nextRanking: string[]) {
    const normalized = normalizeRanking(acts, nextRanking);
    setRanking(normalized);
    if (acts.length) {
      saveRanking(roomSlug, stageKey, normalized);
    }
  }

  function persistNotes(nextNotes: Record<string, ActNote>) {
    setNotes(nextNotes);
    saveNotes(roomSlug, stageKey, nextNotes);
  }

  function updateNote(code: string, patch: Partial<ActNote>) {
    const previous = notes[code] || { tone: null, text: "" };
    const nextEntry: ActNote = {
      tone: patch.tone !== undefined ? patch.tone : previous.tone,
      text: patch.text !== undefined ? patch.text : previous.text,
    };
    const nextNotes = { ...notes };

    if (!hasNote(nextEntry)) {
      delete nextNotes[code];
    } else {
      nextNotes[code] = nextEntry;
    }

    persistNotes(nextNotes);
  }

  function clearNote(code: string) {
    const nextNotes = { ...notes };
    delete nextNotes[code];
    persistNotes(nextNotes);
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setStatusText("");
      setMembershipError("");

      try {
        const [roomPayload, actsPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchActs(roomSlug, stageKey),
        ]);
        if (!active) return;

        setRoom(roomPayload);
        setActs(actsPayload.acts);
        setLineupReady(actsPayload.lineupReady);
        setExpectedEntries(actsPayload.expectedEntries);
        setCurrentEntries(actsPayload.currentEntries);

        const storedNotes = loadNotes(roomSlug, stageKey);
        setNotes(storedNotes);
        saveNotes(roomSlug, stageKey, storedNotes);

        if (account) {
          const [joinPayload, predictionPayload] = await Promise.allSettled([
            joinRoom(roomSlug),
            fetchMyPrediction(roomSlug, stageKey),
          ]);

          if (!active) return;

          if (joinPayload.status === "rejected") {
            const message = joinPayload.reason instanceof Error ? joinPayload.reason.message : text.blockedMessage;
            setMembershipError(message);
          }

          if (predictionPayload.status === "fulfilled") {
            const normalized = normalizeRanking(
              actsPayload.acts,
              predictionPayload.value.ranking.length
                ? predictionPayload.value.ranking
                : loadRanking(roomSlug, stageKey),
            );
            const baseline = normalized.length ? normalized : createDefaultRanking(actsPayload.acts);
            setRanking(baseline);
            saveRanking(roomSlug, stageKey, baseline);
            setLocked(predictionPayload.value.locked);
          } else {
            const fallback = normalizeRanking(actsPayload.acts, loadRanking(roomSlug, stageKey));
            const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
            setRanking(baseline);
            saveRanking(roomSlug, stageKey, baseline);
            setLocked(false);
          }
        } else {
          const fallback = normalizeRanking(actsPayload.acts, loadRanking(roomSlug, stageKey));
          const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
          setRanking(baseline);
          saveRanking(roomSlug, stageKey, baseline);
          setLocked(false);
        }
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : text.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [account, roomSlug, stageKey, text.blockedMessage, text.loadError]);

  useEffect(() => {
    if (!acts.length || !ranking.length) return;
    const normalized = normalizeRanking(acts, ranking);
    if (!arraysEqual(normalized, ranking)) {
      setRanking(normalized);
      saveRanking(roomSlug, stageKey, normalized);
    }
  }, [acts, ranking, roomSlug, stageKey]);

  useEffect(() => {
    const socket = createRoomSocket(roomSlug);
    socket.on("toggle", (payload: { predictionWindows: Record<StageKey, boolean>; showState?: RoomDetails["showState"] }) => {
      setRoom((current) => {
        if (!current) return current;
        return {
          ...current,
          predictionWindows: payload.predictionWindows || current.predictionWindows,
          showState: payload.showState || current.showState,
        };
      });
    });

    return () => {
      socket.close();
    };
  }, [roomSlug]);

  const filteredActs = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    const sorted = sortActsByRanking(acts, rankingMap);
    if (!value) return sorted;
    return sorted.filter((act) =>
      [act.artist, act.song, getCountryName(act.code, act.country)].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  }, [acts, deferredQuery, getCountryName, rankingMap]);

  const notesRows = useMemo(() => {
    return sortActsByRanking(acts, rankingMap).sort((left, right) => {
      const leftNoted = hasNote(notes[left.code]);
      const rightNoted = hasNote(notes[right.code]);
      if (leftNoted !== rightNoted) {
        return leftNoted ? -1 : 1;
      }
      return (rankingMap[left.code] ?? Number.MAX_SAFE_INTEGER) - (rankingMap[right.code] ?? Number.MAX_SAFE_INTEGER);
    });
  }, [acts, notes, rankingMap]);

  const submitDisabledReason = !account
    ? text.submitDisabledNoAccount
    : membershipError
      ? membershipError
      : locked
        ? text.submitDisabledLocked
        : !currentStageOpen
          ? text.submitDisabledClosed
          : !lineupReady
            ? text.submitDisabledLineup
            : null;

  async function handleSubmit() {
    if (submitDisabledReason) {
      setError(submitDisabledReason);
      return;
    }

    setSubmitting(true);
    setError("");
    setStatusText("");
    try {
      const payload = await submitMyPrediction(roomSlug, stageKey, ranking);
      setLocked(payload.locked);
      setStatusText(text.submitSuccess);
      setSelectedTab("order");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : text.submitDisabledClosed);
    } finally {
      setSubmitting(false);
    }
  }

  function getCurrentPlaceLabel(code: string) {
    const rank = rankingMap[code];
    return rank ? `#${rank}` : text.placeUnknown;
  }

  function renderActsTab() {
    return (
      <div className="grid gap-4">
        <section className="show-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted" size={18} />
            <input
              className="arena-input pl-12"
              placeholder={text.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </section>

        {filteredActs.length === 0 ? (
          <section className="show-card p-5 text-sm text-arenaMuted">{text.emptyActs}</section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredActs.map((act) => {
            const note = notes[act.code];
            const facts = getActFacts(act).slice(0, 2);
            const finalContext = act.stageKey === "final" ? getActContext(act).value : null;

            return (
              <article key={act.code} className="show-card flex h-full flex-col p-4">
                <ActPoster act={act} mode="hero" contentDensity="compact" />

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="show-chip text-xs text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                  <span className="show-chip text-xs text-white">
                    {text.rankingLabel} {getCurrentPlaceLabel(act.code)}
                  </span>
                  {finalContext ? (
                    <span className="show-chip text-xs text-arenaMuted">{finalContext}</span>
                  ) : null}
                  {hasNote(note) ? <span className="show-chip text-xs text-arenaBeam">{text.savedBadge}</span> : null}
                </div>

                <div className="mt-5 flex flex-1 flex-col">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                    {text.aboutArtist}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(act)}</p>
                  {facts.length ? (
                    <div className="mt-4 grid gap-2">
                      {facts.map((fact) => (
                        <p key={`${act.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                          {fact}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedActCode(act.code)}
                    className="arena-button-primary flex-1 px-5 py-3 text-sm"
                  >
                    <Sparkles size={16} />
                    {text.openCard}
                  </button>
                  <Link
                    href={`/${roomSlug}/acts/${stageKey}`}
                    className="arena-button-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
                  >
                    {text.quickGuide}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  function renderNotesTab() {
    return (
      <div className="grid gap-4">
        <section className="show-card p-5">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.notesBoardTitle}</p>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.notesBoardText}</p>
        </section>

        {notesRows.length === 0 ? (
          <section className="show-card p-5 text-sm text-arenaMuted">{text.noNoteRows}</section>
        ) : null}

        <section className="grid gap-3">
          {notesRows.map((act) => {
            const note = notes[act.code];
            return (
              <article key={act.code} className="show-card p-4">
                <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedActCode(act.code)}
                  >
                    <ActPoster act={act} compact />
                  </button>

                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="show-chip text-xs text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                      <span className="show-chip text-xs text-white">
                        {text.rankingLabel} {getCurrentPlaceLabel(act.code)}
                      </span>
                      {act.stageKey === "final" ? (
                        <span className="show-chip text-xs text-arenaMuted">{getActContext(act).value}</span>
                      ) : null}
                    </div>

                    <div>
                      <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.noteLabel}</p>
                      <p className="mt-2 text-sm text-arenaMuted">{text.noteHint}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {NOTE_TONES.map((tone) => (
                        <button
                          key={`${act.code}-${tone.key}`}
                          type="button"
                          onClick={() => updateNote(act.code, { tone: note?.tone === tone.key ? null : tone.key })}
                          className={`rounded-full px-4 py-2 text-sm transition ${
                            note?.tone === tone.key
                              ? "bg-arenaSurfaceMax text-white shadow-glow"
                              : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="label-copy uppercase tracking-[0.2em]">{toneLabels[tone.key]}</span>
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="arena-input min-h-28 resize-y"
                      placeholder={text.notePlaceholder}
                      value={note?.text || ""}
                      onChange={(event) => updateNote(act.code, { text: event.target.value })}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-arenaMuted">
                        {hasNote(note) ? text.noteSaved : text.noNotesYet}
                      </p>
                      {hasNote(note) ? (
                        <button
                          type="button"
                          className="arena-button-secondary px-5 py-3 text-sm"
                          onClick={() => clearNote(act.code)}
                        >
                          {text.clearNote}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  function renderOrderTab() {
    return (
      <div className="grid gap-4">
        <section className="show-card p-5">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.orderTitle}</p>
          <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.orderText}</p>
        </section>

        <section className="grid gap-3">
          {sortActsByRanking(acts, rankingMap).map((act, index) => (
            <article key={act.code} className="show-card p-4">
              <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="show-rank h-16 w-16 shrink-0">
                    <span className="display-copy text-3xl font-black text-arenaText">{index + 1}</span>
                  </div>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedActCode(act.code)}
                  >
                    <ActPoster act={act} compact />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="show-chip text-xs text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                    {hasNote(notes[act.code]) ? (
                      <span className="show-chip text-xs text-white">{text.savedBadge}</span>
                    ) : null}
                    {act.stageKey === "final" ? (
                      <span className="show-chip text-xs text-arenaMuted">{getActContext(act).value}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(act)}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-[auto_auto_minmax(0,10rem)] lg:w-[19rem]">
                  <button
                    type="button"
                    className="arena-button-secondary px-4 py-3 text-sm"
                    disabled={locked || index === 0}
                    onClick={() => persistRanking(moveCodeBy(ranking, act.code, -1))}
                  >
                    <ArrowUp size={16} />
                    {text.moveHigher}
                  </button>
                  <button
                    type="button"
                    className="arena-button-secondary px-4 py-3 text-sm"
                    disabled={locked || index === ranking.length - 1}
                    onClick={() => persistRanking(moveCodeBy(ranking, act.code, 1))}
                  >
                    <ArrowDown size={16} />
                    {text.moveLower}
                  </button>
                  <label className="grid gap-2 text-xs text-arenaMuted">
                    <span className="label-copy uppercase tracking-[0.2em]">{text.choosePlace}</span>
                    <select
                      className="arena-input"
                      value={index + 1}
                      disabled={locked}
                      onChange={(event) => persistRanking(moveCodeToIndex(ranking, act.code, Number(event.target.value) - 1))}
                    >
                      {ranking.map((_, rankingIndex) => (
                        <option key={`${act.code}-${rankingIndex + 1}`} value={rankingIndex + 1}>
                          #{rankingIndex + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="show-card sticky bottom-4 z-10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.submitTitle}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.submitText}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={Boolean(submitDisabledReason) || submitting}
                className="arena-button-primary flex h-14 items-center justify-center gap-2 px-8 text-sm"
              >
                <Send size={16} />
                {submitting ? "..." : text.submitButton}
              </button>
              <p className="text-sm text-arenaMuted">{submitDisabledReason || text.saveOrderHint}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading || accountLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse rounded-[1.8rem] bg-white/5" />
        <div className="grid gap-3 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-48 animate-pulse rounded-[1.8rem] bg-white/5" />
          ))}
        </div>
        <div className="h-[26rem] animate-pulse rounded-[1.8rem] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <StageSwitch roomSlug={roomSlug} currentStage={stageKey} section="vote" />

      <section className="show-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.kicker}</p>
            <h2 className="display-copy mt-3 text-3xl font-black md:text-5xl">{text.title}</h2>
            <p className="mt-4 text-sm leading-7 text-arenaMuted md:text-base">{text.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-arenaMuted">
              {room ? <span>{text.roomLabel}: {room.name}</span> : null}
              <span className="show-chip text-xs text-arenaBeam">{getStageLabel(stageKey)}</span>
              <span className="show-chip text-xs text-white">
                <Radio size={14} className="text-arenaDanger" />
                {room?.showState?.stageKey === stageKey ? text.stageStatusLive : text.stageStatusIdle}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${roomSlug}/acts/${stageKey}`}
              className="arena-button-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              <Sparkles size={16} />
              {text.openGuide}
            </Link>
            <Link
              href={`/${roomSlug}/live/${stageKey}`}
              className="arena-button-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              <Radio size={16} />
              {text.openShow}
            </Link>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {statusText ? <div className="rounded-[1.4rem] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{statusText}</div> : null}
      {membershipError ? <div className="rounded-[1.4rem] bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{membershipError}</div> : null}

      {!lineupReady ? (
        <section className="show-card p-4 text-sm text-arenaMuted">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.stageForming}</p>
          <p className="mt-2">{text.stageFormingText(currentEntries, expectedEntries)}</p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.summaryTitle}</p>
          <p className="mt-3 text-lg font-semibold text-white">
            {locked ? text.lockedState : currentStageOpen ? text.liveWindowOpen : text.liveWindowClosed}
          </p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.lineupLabel}</p>
          <p className="display-copy mt-2 text-4xl font-black">{currentEntries}/{expectedEntries}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.notesCount}</p>
          <p className="display-copy mt-2 text-4xl font-black">{noteCount}</p>
        </div>
        <div className="show-card p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.rankingCount}</p>
          <p className="display-copy mt-2 text-4xl font-black">{ranking.length}</p>
        </div>
      </section>

      {!account ? (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.accountNeeded}</p>
            <h3 className="display-copy mt-3 text-3xl font-black">{text.submitTitle}</h3>
            <p className="mt-4 text-sm leading-7 text-arenaMuted">{text.loginHint}</p>
          </div>
          <AuthCard roomSlug={roomSlug} onAuthenticated={() => setStatusText(text.accountReady)} />
        </section>
      ) : (
        <section className="show-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={account.publicName}
                emoji={account.emoji}
                avatarUrl={account.avatarUrl}
                avatarTheme={account.avatarTheme}
                className="h-14 w-14"
                textClass="text-base"
              />
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.accountReady}</p>
                <p className="mt-2 text-lg font-semibold text-white">{account.publicName}</p>
              </div>
            </div>
            <p className="text-sm text-arenaMuted">{text.saveOrderHint}</p>
          </div>
        </section>
      )}

      <section className="show-card p-3">
        <div className="grid gap-2 md:grid-cols-3">
          {([
            { key: "acts", icon: Sparkles },
            { key: "notes", icon: NotebookPen },
            { key: "order", icon: ClipboardList },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={`rounded-[1.4rem] px-4 py-4 text-left transition ${
                  active
                    ? "bg-arenaSurfaceMax text-white shadow-glow"
                    : "bg-white/[0.04] text-arenaMuted hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span className="label-copy uppercase tracking-[0.22em]">{text.tabs[tab.key]}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-inherit/80">{text.tabDescriptions[tab.key]}</p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedTab === "acts" ? renderActsTab() : null}
      {selectedTab === "notes" ? renderNotesTab() : null}
      {selectedTab === "order" ? renderOrderTab() : null}

      <BottomSheet open={Boolean(selectedAct)} onClose={() => setSelectedActCode(null)}>
        {selectedAct ? (
          <div className="grid gap-5">
            <ActPoster act={selectedAct} mode="hero" contentDensity="compact" />

            <div className="flex flex-wrap gap-2">
              <span className="show-chip text-xs text-arenaBeam">
                {getCountryName(selectedAct.code, selectedAct.country)}
              </span>
              <span className="show-chip text-xs text-white">
                {text.rankingLabel} {getCurrentPlaceLabel(selectedAct.code)}
              </span>
              {selectedAct.stageKey === "final" ? (
                <span className="show-chip text-xs text-arenaMuted">
                  {text.finalContextLabel}: {getActContext(selectedAct).value}
                </span>
              ) : null}
            </div>

            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.aboutArtist}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(selectedAct)}</p>
              {getActFacts(selectedAct).length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {getActFacts(selectedAct).map((fact) => (
                    <p key={`${selectedAct.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                      {fact}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="show-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.noteLabel}</p>
                  <p className="mt-2 text-sm text-arenaMuted">{text.noteHint}</p>
                </div>
                {hasNote(notes[selectedAct.code]) ? (
                  <span className="show-chip text-xs text-arenaBeam">
                    <CheckCircle2 size={14} />
                    {text.noteSaved}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {NOTE_TONES.map((tone) => (
                  <button
                    key={`${selectedAct.code}-${tone.key}`}
                    type="button"
                    onClick={() => updateNote(selectedAct.code, { tone: notes[selectedAct.code]?.tone === tone.key ? null : tone.key })}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      notes[selectedAct.code]?.tone === tone.key
                        ? "bg-arenaSurfaceMax text-white shadow-glow"
                        : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="label-copy uppercase tracking-[0.2em]">{toneLabels[tone.key]}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="arena-input mt-4 min-h-28 resize-y"
                placeholder={text.notePlaceholder}
                value={notes[selectedAct.code]?.text || ""}
                onChange={(event) => updateNote(selectedAct.code, { text: event.target.value })}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-arenaMuted">
                  {hasNote(notes[selectedAct.code]) ? text.noteSaved : text.noNotesYet}
                </p>
                {hasNote(notes[selectedAct.code]) ? (
                  <button
                    type="button"
                    className="arena-button-secondary px-5 py-3 text-sm"
                    onClick={() => clearNote(selectedAct.code)}
                  >
                    {text.clearNote}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="show-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.orderTitle}</p>
                  <p className="mt-2 text-sm text-arenaMuted">{text.currentPlace} {getCurrentPlaceLabel(selectedAct.code)}</p>
                </div>
                {locked ? (
                  <span className="show-chip text-xs text-amber-100">
                    <Lock size={14} />
                    {text.lockedState}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[auto_auto_minmax(0,12rem)]">
                <button
                  type="button"
                  className="arena-button-secondary px-5 py-3 text-sm"
                  disabled={locked || rankingMap[selectedAct.code] === 1}
                  onClick={() => persistRanking(moveCodeBy(ranking, selectedAct.code, -1))}
                >
                  <ArrowUp size={16} />
                  {text.moveHigher}
                </button>
                <button
                  type="button"
                  className="arena-button-secondary px-5 py-3 text-sm"
                  disabled={locked || rankingMap[selectedAct.code] === ranking.length}
                  onClick={() => persistRanking(moveCodeBy(ranking, selectedAct.code, 1))}
                >
                  <ArrowDown size={16} />
                  {text.moveLower}
                </button>
                <label className="grid gap-2 text-xs text-arenaMuted">
                  <span className="label-copy uppercase tracking-[0.2em]">{text.choosePlace}</span>
                  <select
                    className="arena-input"
                    value={rankingMap[selectedAct.code] || 1}
                    disabled={locked}
                    onChange={(event) => persistRanking(moveCodeToIndex(ranking, selectedAct.code, Number(event.target.value) - 1))}
                  >
                    {ranking.map((_, index) => (
                      <option key={`${selectedAct.code}-sheet-${index + 1}`} value={index + 1}>
                        #{index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedAct.profileUrl ? (
                <a
                  href={selectedAct.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="arena-button-secondary inline-flex items-center justify-center px-5 py-3 text-sm"
                >
                  {text.officialProfile}
                </a>
              ) : null}
              <Link
                href={`/${roomSlug}/acts/${stageKey}`}
                className="arena-button-primary inline-flex items-center justify-center px-6 py-3 text-sm"
              >
                {text.quickGuide}
              </Link>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
