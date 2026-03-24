'use client';

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Lock, NotebookPen, PlayCircle, Radio, RotateCcw, Search, Send, Sparkles } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createRoomSocket,
  fetchActs,
  fetchMyPrediction,
  fetchRoom,
  joinRoom,
  submitMyPrediction,
} from "../lib/api";
import { clearRanking, loadNotes, loadPlacedActs, loadRanking, saveNotes, savePlacedActs, saveRanking } from "../lib/storage";
import type { ActEntry, ActNote, NoteTone, RoomDetails, StageKey } from "../lib/types";
import {
  NOTE_TONES,
  buildActVideoUrl,
  createDefaultRanking,
  getNoteTags,
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

type VoteTab = "acts" | "notes";

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

type PlaceOption = {
  value: number;
  label: string;
};

function SortableOrderRow({
  act,
  rank,
  countryName,
  noteBadge,
  finalContext,
  locked,
  selectValue,
  placeOptions,
  choosePlacePlaceholder,
  dragLabel,
  onOpen,
  onPlaceChange,
}: {
  act: ActEntry;
  rank: number;
  countryName: string;
  noteBadge: string | null;
  finalContext: string | null;
  locked: boolean;
  selectValue: string;
  placeOptions: PlaceOption[];
  choosePlacePlaceholder: string;
  dragLabel: string;
  onOpen: () => void;
  onPlaceChange: (nextPlace: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: act.code,
    disabled: locked,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`show-card p-3 transition md:p-3.5 ${isDragging ? "scale-[0.995] shadow-[0_28px_80px_rgba(0,0,0,0.34)]" : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
          <div className="show-rank h-11 w-11 shrink-0 md:h-12 md:w-12">
            <span className="display-copy text-xl font-black text-arenaText md:text-2xl">{rank}</span>
          </div>
          <div className="shrink-0">
            <ActPoster act={act} mode="row" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="show-chip px-2.5 py-1 text-[10px] text-arenaBeam">{countryName}</span>
              {finalContext ? <span className="show-chip px-2.5 py-1 text-[10px] text-arenaMuted">{finalContext}</span> : null}
              {noteBadge ? <span className="show-chip px-2.5 py-1 text-[10px] text-white">{noteBadge}</span> : null}
            </div>
            <p className="mt-2 line-clamp-1 text-base font-semibold leading-tight text-white md:text-lg">{act.artist}</p>
            <p className="mt-1 line-clamp-1 text-sm text-arenaMuted">{act.song}</p>
          </div>
        </button>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-[11rem]">
          <select
            className="arena-input h-10 min-w-0 px-3 text-sm"
            value={selectValue}
            disabled={locked}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (Number.isFinite(nextValue) && nextValue > 0) {
                onPlaceChange(nextValue);
              }
            }}
          >
            <option value="" disabled>
              {choosePlacePlaceholder}
            </option>
            {placeOptions.map((option) => (
              <option key={`${act.code}-placed-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="arena-button-secondary inline-flex h-10 w-10 touch-none items-center justify-center rounded-[1rem] px-0 text-sm"
            aria-label={dragLabel}
            title={dragLabel}
            disabled={locked}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>
    </article>
  );
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
  const [placedActs, setPlacedActs] = useState<string[]>([]);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
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
          rankingCount: "Артистов расставлено",
          tabs: {
            acts: "Артисты",
            notes: "Заметки",
            order: "Мой порядок",
          },
          searchPlaceholder: "Поиск по артисту, стране или песне",
          openCard: "Карточка",
          aboutArtist: "Об исполнителе",
          noteLabel: "Моя заметка",
          noteHint: "Короткая мысль по ходу шоу, как на бумаге.",
          noteSaved: "Сохранено на этом устройстве",
          noNotesYet: "Пока заметок нет. Выбери тег или напиши короткую мысль.",
          clearNote: "Очистить",
          rankingLabel: "Место в моём рейтинге",
          rankingFieldLabel: "Место артиста в моём рейтинге",
          quickGuide: "Открыть полный гид",
          officialProfile: "Официальный профиль",
          choosePlace: "Поставить артиста на место",
          choosePlacePlaceholder: "Выбрать место",
          moveHigher: "Выше",
          moveLower: "Ниже",
          watchVideo: "Посмотреть видео",
          watchVideoHint: "Открой видео, чтобы быстро вспомнить артиста и вайб номера.",
          resetRanking: "Сбросить рейтинг",
          resetRankingConfirmTitle: "Сбросить личный рейтинг?",
          resetRankingConfirmText: "Все выставленные места будут очищены. Это действие нельзя отменить.",
          resetRankingConfirmCancel: "Отмена",
          resetRankingConfirmAction: "Сбросить",
          openActsTab: "К артистам",
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
          currentPlace: "Этот артист сейчас на",
          notesBoardTitle: "Цифровой лист заметок",
          notesBoardText: "Здесь удобно быстро помечать всех артистов подряд, а не открывать каждую карточку по отдельности.",
          noNoteRows: "Пока нет артистов для заметок.",
          orderTitle: "Личный рейтинг",
          orderText: "Когда начнёшь расставлять артистов, здесь появится полный порядок 1..N. Пока удобнее выбирать места прямо из списка.",
          orderEmptyTitle: "Рейтинг пока пуст",
          orderEmptyText: "Поставь артисту место прямо в списке или открой карточку, чтобы начать собирать личный порядок.",
          summaryTitle: "Статус бюллетеня",
          stageStatusIdle: "Ожидаем шоу",
          stageStatusLive: "Этап в эфире",
          finalContextLabel: "Путь в финал",
          notePlaceholder: "Короткая заметка про номер, вокал, песню или вайб…",
          savedBadge: "Есть заметка",
          placeUnknown: "Пока не расставлено",
          placeUnknownHint: "Выбери место в своём рейтинге",
          placeOptionCurrent: (place: number) => `#${place} — сейчас здесь`,
          placeOptionOccupied: (place: number, artist: string) => `#${place} — сейчас ${artist}`,
          placeOptionFree: (place: number) => `#${place} — свободно`,
          tabDescriptions: {
            acts: "Список артистов с быстрым выбором места и входом в карточку.",
            notes: "Личный цифровой лист заметок по всем артистам.",
            order: "Личный порядок 1..N, который появляется после первых расстановок.",
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
          openCard: "Details",
          aboutArtist: "About the artist",
          noteLabel: "My note",
          noteHint: "A quick thought during the show, just like on paper.",
          noteSaved: "Saved on this device",
          noNotesYet: "No notes yet. Pick a tag or write a quick thought.",
          clearNote: "Clear",
          rankingLabel: "Place in my ranking",
          rankingFieldLabel: "This artist in my ranking",
          quickGuide: "Open full guide",
          officialProfile: "Official profile",
          choosePlace: "Place this artist at",
          choosePlacePlaceholder: "Choose place",
          moveHigher: "Move up",
          moveLower: "Move down",
          watchVideo: "Watch video",
          watchVideoHint: "Open the video to quickly remember the artist and the performance vibe.",
          resetRanking: "Reset ranking",
          resetRankingConfirmTitle: "Reset your personal ranking?",
          resetRankingConfirmText: "All placed positions will be cleared. This action cannot be undone.",
          resetRankingConfirmCancel: "Cancel",
          resetRankingConfirmAction: "Reset",
          openActsTab: "Back to acts",
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
          currentPlace: "This artist is currently at",
          notesBoardTitle: "Digital notes sheet",
          notesBoardText: "This is the fastest place to mark everyone in a row without opening every single card.",
          noNoteRows: "No acts available for notes yet.",
          orderTitle: "Personal ranking",
          orderText: "Once you start placing artists, your full 1..N order will appear here. Until then, picking places from the list is faster.",
          orderEmptyTitle: "Your ranking is still empty",
          orderEmptyText: "Choose places from the acts list or open any card to start building your order.",
          summaryTitle: "Ballot status",
          stageStatusIdle: "Waiting for the show",
          stageStatusLive: "Stage live",
          finalContextLabel: "Road to the final",
          notePlaceholder: "A quick note about vocals, staging, song, or overall vibe…",
          savedBadge: "Note saved",
          placeUnknown: "Not placed yet",
          placeUnknownHint: "Choose a place in your ranking",
          placeOptionCurrent: (place: number) => `#${place} — currently here`,
          placeOptionOccupied: (place: number, artist: string) => `#${place} — now ${artist}`,
          placeOptionFree: (place: number) => `#${place} — free`,
          tabDescriptions: {
            acts: "Acts list with quick place selection and card details.",
            notes: "Your personal digital notes sheet for every act.",
            order: "Your personal 1..N order once you start placing acts.",
          },
        }
  ), [language]);

  const currentStageOpen = room?.predictionWindows[stageKey] ?? false;
  const selectedAct = acts.find((act) => act.code === selectedActCode) || null;
  const rankingMap = useMemo(() => buildRankingMap(ranking), [ranking]);
  const placedActsSet = useMemo(() => new Set(placedActs), [placedActs]);
  const hasStartedRanking = placedActs.length > 0;
  const placedActsCount = placedActs.length;
  const noteCount = useMemo(() => Object.values(notes).filter((entry) => hasNote(entry)).length, [notes]);
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const resolvedNoteTagLabels: Record<NoteTone, string> = useMemo(() => (
    language === "ru"
      ? {
          favorite: "Фаворит",
          winner: "Победитель",
          vocals: "Вокал",
          staging: "Номер",
          song: "Песня",
          energy: "Энергия",
          memorable: "Запомнилось",
          skip: "Мимо",
        }
      : {
          favorite: "Favorite",
          winner: "Winner",
          vocals: "Vocals",
          staging: "Staging",
          song: "Song",
          energy: "Energy",
          memorable: "Memorable",
          skip: "Skip",
        }
  ), [language]);

  function persistRanking(nextRanking: string[], touchedCodes: string[] = []) {
    const normalized = normalizeRanking(acts, nextRanking);
    const validCodes = new Set(normalized);
    const nextPlacedActs = Array.from(new Set([...placedActs, ...touchedCodes])).filter((code) => validCodes.has(code));

    setRanking(normalized);
    setPlacedActs(nextPlacedActs);
    if (acts.length) {
      saveRanking(roomSlug, stageKey, normalized);
      savePlacedActs(roomSlug, stageKey, nextPlacedActs);
    }
  }

  function persistNotes(nextNotes: Record<string, ActNote>) {
    setNotes(nextNotes);
    saveNotes(roomSlug, stageKey, nextNotes);
  }

  function updateNote(code: string, patch: Partial<ActNote>) {
    setNotes((current) => {
      const previous = current[code] || { tones: [], text: "" };
      const nextEntry: ActNote = {
        tones: patch.tones !== undefined ? patch.tones : previous.tones,
        text: patch.text !== undefined ? patch.text : previous.text,
      };
      const nextNotes = { ...current };

      if (!hasNote(nextEntry)) {
        delete nextNotes[code];
      } else {
        nextNotes[code] = nextEntry;
      }

      saveNotes(roomSlug, stageKey, nextNotes);
      return nextNotes;
    });
  }

  function toggleTone(code: string, toneKey: NoteTone) {
    const currentTags = getNoteTags(notes[code]);
    const nextTags = currentTags.includes(toneKey)
      ? currentTags.filter((entry) => entry !== toneKey)
      : [...currentTags, toneKey];
    updateNote(code, { tones: nextTags });
  }

  function clearNote(code: string) {
    setNotes((current) => {
      const nextNotes = { ...current };
      delete nextNotes[code];
      saveNotes(roomSlug, stageKey, nextNotes);
      return nextNotes;
    });
  }

  function clearPersonalRankingState() {
    const baseline = createDefaultRanking(acts);
    setRanking(baseline);
    setPlacedActs([]);
    clearRanking(roomSlug, stageKey);
  }

  function handleResetRanking() {
    clearPersonalRankingState();
    setConfirmResetOpen(false);
    setStatusText("");
    setError("");
  }

  function moveArtistBy(code: string, delta: number) {
    persistRanking(moveCodeBy(ranking, code, delta), [code]);
  }

  function placeArtistAt(code: string, nextIndex: number) {
    persistRanking(moveCodeToIndex(ranking, code, nextIndex), [code]);
  }

  function getSelectValue(code: string) {
    if (!placedActsSet.has(code)) return "";
    const rank = rankingMap[code];
    return rank ? String(rank) : "";
  }

  function getCurrentPlaceLabel(code: string) {
    const rank = rankingMap[code];
    if (!placedActsSet.has(code) || !rank) return text.placeUnknown;
    return `#${rank}`;
  }

  function getCurrentPlaceDescription(code: string) {
    const rank = rankingMap[code];
    if (!placedActsSet.has(code) || !rank) return text.placeUnknownHint;
    return `${text.currentPlace} #${rank}`;
  }

  function getPlaceOptionLabel(rankIndex: number, currentCode: string) {
    const place = rankIndex + 1;
    const occupantCode = ranking[rankIndex];
    if (!hasStartedRanking || !occupantCode) {
      return `#${place}`;
    }

    if (occupantCode === currentCode && placedActsSet.has(currentCode)) {
      return `#${place}`;
    }

    return `#${place}`;
  }

  function getPlaceOptions(code: string) {
    return ranking.map((_, rankingIndex) => ({
      value: rankingIndex + 1,
      label: getPlaceOptionLabel(rankingIndex, code),
    }));
  }

  function getNoteSummaryText(note?: ActNote | null) {
    const tags = getNoteTags(note);
    if (!note || (!note.text.trim() && !tags.length)) return null;
    if (note.text.trim()) return note.text.trim();
    return tags.map((tone) => resolvedNoteTagLabels[tone]).join(" · ");
  }

  function handleOrderDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCode = String(active.id);
    const overCode = String(over.id);
    const nextIndex = rankingMap[overCode];

    if (!nextIndex) return;
    placeArtistAt(activeCode, nextIndex - 1);
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
        const storedRanking = loadRanking(roomSlug, stageKey);
        const storedPlacedActs = loadPlacedActs(roomSlug, stageKey);
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
                : storedRanking,
            );
            const baseline = normalized.length ? normalized : createDefaultRanking(actsPayload.acts);
            const nextPlacedActs = predictionPayload.value.ranking.length > 0
              ? baseline
              : storedPlacedActs.length > 0
                ? storedPlacedActs.filter((code) => baseline.includes(code))
                : [];
            setRanking(baseline);
            setPlacedActs(nextPlacedActs);
            if (nextPlacedActs.length > 0) {
              saveRanking(roomSlug, stageKey, baseline);
              savePlacedActs(roomSlug, stageKey, nextPlacedActs);
            }
            setLocked(predictionPayload.value.locked);
          } else {
            const fallback = normalizeRanking(actsPayload.acts, storedRanking);
            const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
            const nextPlacedActs = storedPlacedActs.length > 0
              ? storedPlacedActs.filter((code) => baseline.includes(code))
              : [];
            setRanking(baseline);
            setPlacedActs(nextPlacedActs);
            if (nextPlacedActs.length > 0) {
              saveRanking(roomSlug, stageKey, baseline);
              savePlacedActs(roomSlug, stageKey, nextPlacedActs);
            }
            setLocked(false);
          }
        } else {
          const fallback = normalizeRanking(actsPayload.acts, storedRanking);
          const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
          const nextPlacedActs = storedPlacedActs.length > 0
            ? storedPlacedActs.filter((code) => baseline.includes(code))
            : [];
          setRanking(baseline);
          setPlacedActs(nextPlacedActs);
          if (nextPlacedActs.length > 0) {
            saveRanking(roomSlug, stageKey, baseline);
            savePlacedActs(roomSlug, stageKey, nextPlacedActs);
          }
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
    const normalizedPlacedActs = placedActs.filter((code) => normalized.includes(code));

    if (!arraysEqual(normalized, ranking)) {
      setRanking(normalized);
      if (hasStartedRanking) {
        saveRanking(roomSlug, stageKey, normalized);
      }
    }

    if (!arraysEqual(normalizedPlacedActs, placedActs)) {
      setPlacedActs(normalizedPlacedActs);
      if (normalizedPlacedActs.length > 0) {
        savePlacedActs(roomSlug, stageKey, normalizedPlacedActs);
      }
    }
  }, [acts, hasStartedRanking, placedActs, ranking, roomSlug, stageKey]);

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

  const placedActsSorted = useMemo(() => {
    return sortActsByRanking(
      acts.filter((act) => placedActsSet.has(act.code)),
      rankingMap,
    );
  }, [acts, placedActsSet, rankingMap]);

  const placedFilteredActs = useMemo(() => {
    return filteredActs.filter((act) => placedActsSet.has(act.code));
  }, [filteredActs, placedActsSet]);

  const unplacedFilteredActs = useMemo(() => {
    return filteredActs.filter((act) => !placedActsSet.has(act.code));
  }, [filteredActs, placedActsSet]);

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
            : !hasStartedRanking
              ? (language === "ru" ? "Сначала поставь хотя бы одного артиста в рейтинг" : "Start placing at least one act in your ranking")
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
      setSelectedTab("acts");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : text.submitDisabledClosed);
    } finally {
      setSubmitting(false);
    }
  }

  function renderActsTab() {
    return (
      <div className="grid gap-4">
        {hasStartedRanking ? (
          <section className="show-card p-3 md:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.orderTitle}</p>
                <p className="mt-2 text-xs leading-6 text-arenaMuted">
                  {language === "ru"
                    ? "Здесь твой текущий порядок. Перетаскивай артистов прямо в списке или двигай их кнопками на шаг выше и ниже."
                    : "This is your current order. Drag acts right here in the list or nudge them up and down."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="show-chip text-xs text-white">
                  {language === "ru" ? `Расставлено ${placedActsCount} из ${acts.length}` : `${placedActsCount} of ${acts.length} placed`}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  disabled={locked}
                  className="arena-button-secondary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm"
                >
                  <RotateCcw size={15} />
                  {text.resetRanking}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {hasStartedRanking ? (
          <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleOrderDragEnd}>
            <SortableContext items={placedFilteredActs.map((act) => act.code)} strategy={verticalListSortingStrategy}>
              <section className="grid gap-3">
                {placedFilteredActs.length ? (
                  <p className="px-1 text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                    {language === "ru" ? "Уже в твоём рейтинге" : "Already in your ranking"}
                  </p>
                ) : null}
                {placedFilteredActs.map((act) => {
                  const rank = rankingMap[act.code] ?? 0;
                  const note = notes[act.code];
                  return (
                    <SortableOrderRow
                      key={act.code}
                      act={act}
                      rank={rank}
                      countryName={getCountryName(act.code, act.country)}
                      noteBadge={hasNote(note) ? text.savedBadge : null}
                      finalContext={act.stageKey === "final" ? getActContext(act).value : null}
                      locked={locked}
                      selectValue={getSelectValue(act.code)}
                      placeOptions={getPlaceOptions(act.code)}
                      choosePlacePlaceholder={text.choosePlacePlaceholder}
                      dragLabel={language === "ru" ? "Перетащить" : "Drag to reorder"}
                      onOpen={() => setSelectedActCode(act.code)}
                      onPlaceChange={(nextPlace) => placeArtistAt(act.code, nextPlace - 1)}
                    />
                  );
                })}
              </section>
            </SortableContext>
          </DndContext>
        ) : null}

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

        {((!hasStartedRanking && filteredActs.length === 0) || (hasStartedRanking && placedFilteredActs.length === 0 && unplacedFilteredActs.length === 0)) ? (
          <section className="show-card p-5 text-sm text-arenaMuted">
            {hasStartedRanking && !deferredQuery.trim()
              ? (language === "ru" ? "Все артисты уже добавлены в твой порядок." : "All acts are already added to your order.")
              : text.emptyActs}
          </section>
        ) : null}

        {hasStartedRanking ? (
          <section className="px-1 text-xs leading-6 text-arenaMuted">
            {language === "ru"
              ? `Осталось добавить в рейтинг: ${acts.length - placedActsCount}. Ниже список тех, кто ещё не расставлен.`
              : `${acts.length - placedActsCount} acts are still unplaced. Add them from the list below.`}
          </section>
        ) : null}

        <section className="grid gap-3">
          {hasStartedRanking && unplacedFilteredActs.length ? (
            <p className="px-1 text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
              {language === "ru" ? "Ещё не выбрано" : "Still unplaced"}
            </p>
          ) : null}
          {(hasStartedRanking ? unplacedFilteredActs : filteredActs).map((act) => {
            const note = notes[act.code];
            const finalContext = act.stageKey === "final" ? getActContext(act).value : null;

            return (
              <article key={act.code} className="show-card p-3 md:p-3.5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedActCode(act.code)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <div className="shrink-0">
                      <ActPoster act={act} mode="row" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="show-chip px-2.5 py-1 text-[10px] text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                        {finalContext ? (
                          <span className="show-chip px-2.5 py-1 text-[10px] text-arenaMuted">{finalContext}</span>
                        ) : null}
                        {hasNote(note) ? <span className="show-chip px-2.5 py-1 text-[10px] text-white">{text.savedBadge}</span> : null}
                      </div>

                      <h3 className="mt-2 line-clamp-1 text-base font-semibold leading-tight text-white md:text-lg">{act.artist}</h3>
                      <p className="mt-1 truncate text-sm text-arenaMuted">{act.song}</p>
                    </div>
                  </button>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-[11rem]">
                    <select
                      className="arena-input h-10 min-w-0 px-3 text-sm"
                      value={getSelectValue(act.code)}
                      disabled={locked}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (Number.isFinite(nextValue) && nextValue > 0) {
                          placeArtistAt(act.code, nextValue - 1);
                        }
                      }}
                    >
                      <option value="" disabled>
                        {text.choosePlacePlaceholder}
                      </option>
                      {getPlaceOptions(act.code).map((option) => (
                        <option key={`${act.code}-list-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setSelectedActCode(act.code)}
                      className="arena-button-secondary inline-flex h-10 w-10 items-center justify-center rounded-[1rem] px-0 text-sm"
                      aria-label={text.openCard}
                      title={text.openCard}
                    >
                      <NotebookPen size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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
                      {placedActsSet.has(act.code) ? (
                        <span className="show-chip text-xs text-white">
                          {text.rankingLabel} {getCurrentPlaceLabel(act.code)}
                        </span>
                      ) : null}
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
                          onClick={() => toggleTone(act.code, tone.key)}
                          className={`rounded-full px-2.5 py-1 text-[10px] transition ${
                            getNoteTags(note).includes(tone.key)
                              ? "bg-arenaSurfaceMax text-white shadow-glow"
                              : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="label-copy uppercase tracking-[0.14em]">{resolvedNoteTagLabels[tone.key]}</span>
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="arena-input min-h-[9rem] resize-y"
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
    if (!hasStartedRanking) {
      return (
        <section className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.orderTitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.orderEmptyText}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setSelectedTab("acts")}
              className="arena-button-primary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
            >
              <Sparkles size={15} />
              {text.openActsTab}
            </button>
          </div>
        </section>
      );
    }

    return (
      <div className="grid gap-4">
        <section className="show-card p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.orderTitle}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">
                {language === "ru"
                  ? `Здесь только уже выбранные артисты. Перетаскивай их, двигай на шаг выше или ниже и при необходимости ставь на конкретное место.`
                  : `Only the acts you already placed appear here. Drag them, nudge them up or down, or send them to a specific place.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="show-chip text-xs text-white">
                {language === "ru" ? `Расставлено ${placedActsCount} из ${acts.length}` : `${placedActsCount} of ${acts.length} placed`}
              </span>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                disabled={locked}
                className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
              >
                <RotateCcw size={15} />
                {text.resetRanking}
              </button>
            </div>
          </div>
        </section>

        {acts.length > placedActsCount ? (
          <section className="show-card p-4 text-sm text-arenaMuted">
            {language === "ru"
              ? `Ещё не расставлено: ${acts.length - placedActsCount}. Быстрее всего добавлять новых артистов из списка выше, а сюда возвращаться уже для точной перестановки.`
              : `${acts.length - placedActsCount} acts are still unplaced. Add new ones from the acts list first, then come back here for fine-tuning.`}
          </section>
        ) : null}

        <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleOrderDragEnd}>
          <SortableContext items={placedActsSorted.map((act) => act.code)} strategy={verticalListSortingStrategy}>
            <section className="grid gap-3">
              {placedActsSorted.map((act) => {
                const rank = rankingMap[act.code] ?? 0;
                const note = notes[act.code];
                return (
                  <SortableOrderRow
                    key={act.code}
                    act={act}
                    rank={rank}
                    countryName={getCountryName(act.code, act.country)}
                    noteBadge={hasNote(note) ? text.savedBadge : null}
                    finalContext={act.stageKey === "final" ? getActContext(act).value : null}
                    locked={locked}
                    selectValue={getSelectValue(act.code)}
                    placeOptions={getPlaceOptions(act.code)}
                    choosePlacePlaceholder={text.choosePlacePlaceholder}
                    dragLabel={language === "ru" ? "Перетащить" : "Drag to reorder"}
                    onOpen={() => setSelectedActCode(act.code)}
                    onPlaceChange={(nextPlace) => placeArtistAt(act.code, nextPlace - 1)}
                  />
                );
              })}
            </section>
          </SortableContext>
        </DndContext>

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

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="show-card p-3.5 md:p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.summaryTitle}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white md:text-lg">
            {locked ? text.lockedState : currentStageOpen ? text.liveWindowOpen : text.liveWindowClosed}
          </p>
        </div>
        <div className="show-card p-3.5 md:p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.lineupLabel}</p>
          <p className="display-copy mt-2 text-3xl font-black md:text-4xl">{currentEntries}/{expectedEntries}</p>
        </div>
        <div className="show-card p-3.5 md:p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.notesCount}</p>
          <p className="display-copy mt-2 text-3xl font-black md:text-4xl">{noteCount}</p>
        </div>
        <div className="show-card p-3.5 md:p-4">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.rankingCount}</p>
          <p className="display-copy mt-2 text-3xl font-black md:text-4xl">{placedActsCount}</p>
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
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "acts", icon: Sparkles },
            { key: "notes", icon: NotebookPen },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = selectedTab === tab.key;
            const counter = tab.key === "notes" ? noteCount : acts.length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={`rounded-[1.4rem] px-4 py-3 text-left transition ${
                  active
                    ? "bg-arenaSurfaceMax text-white shadow-glow"
                    : "bg-white/[0.04] text-arenaMuted hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span className="label-copy text-[10px] uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.22em]">{text.tabs[tab.key]}</span>
                  </div>
                  <span className="show-chip hidden px-3 py-1 text-xs text-white sm:inline-flex">{counter}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedTab === "acts" ? renderActsTab() : null}
      {selectedTab === "notes" ? renderNotesTab() : null}

      <BottomSheet open={Boolean(selectedAct)} onClose={() => setSelectedActCode(null)}>
        {selectedAct ? (
          <div className="grid gap-5">
            <div className="grid grid-cols-[5.5rem_1fr] items-start gap-4 sm:grid-cols-[6.75rem_1fr]">
              <div className="mx-auto w-full max-w-[6.75rem]">
                <ActPoster act={selectedAct} mode="card" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="show-chip text-xs text-arenaBeam">
                    {getCountryName(selectedAct.code, selectedAct.country)}
                  </span>
                  {placedActsSet.has(selectedAct.code) ? (
                    <span className="show-chip text-xs text-white">
                      {text.rankingLabel} {getCurrentPlaceLabel(selectedAct.code)}
                    </span>
                  ) : (
                    <span className="show-chip text-xs text-arenaMuted">{text.placeUnknown}</span>
                  )}
                  {selectedAct.stageKey === "final" ? (
                    <span className="show-chip text-xs text-arenaMuted">
                      {text.finalContextLabel}: {getActContext(selectedAct).value}
                    </span>
                  ) : null}
                </div>

                <h3 className="display-copy mt-4 text-3xl font-black leading-[0.92] text-white md:text-4xl">
                  {selectedAct.artist}
                </h3>
                <p className="mt-2 text-base text-arenaMuted md:text-lg">{selectedAct.song}</p>
                <p className="mt-4 text-sm leading-7 text-arenaMuted">{getActBlurb(selectedAct)}</p>
              </div>
            </div>

            <div className="show-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.rankingFieldLabel}</p>
                  <p className="mt-2 text-sm text-arenaMuted">{getCurrentPlaceDescription(selectedAct.code)}</p>
                </div>
                {locked ? (
                  <span className="show-chip text-xs text-amber-100">
                    <Lock size={14} />
                    {text.lockedState}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center">
                <button
                  type="button"
                  className="arena-button-secondary inline-flex h-11 w-11 items-center justify-center rounded-[1rem] px-0 text-sm"
                  disabled={locked || !placedActsSet.has(selectedAct.code) || rankingMap[selectedAct.code] === 1}
                  onClick={() => moveArtistBy(selectedAct.code, -1)}
                  aria-label={text.moveHigher}
                  title={text.moveHigher}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="arena-button-secondary inline-flex h-11 w-11 items-center justify-center rounded-[1rem] px-0 text-sm"
                  disabled={locked || !placedActsSet.has(selectedAct.code) || rankingMap[selectedAct.code] === ranking.length}
                  onClick={() => moveArtistBy(selectedAct.code, 1)}
                  aria-label={text.moveLower}
                  title={text.moveLower}
                >
                  <ArrowDown size={16} />
                </button>
                <select
                  className="arena-input h-11"
                  value={getSelectValue(selectedAct.code)}
                  disabled={locked}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (Number.isFinite(nextValue) && nextValue > 0) {
                      placeArtistAt(selectedAct.code, nextValue - 1);
                    }
                  }}
                >
                  <option value="" disabled>
                    {text.choosePlacePlaceholder}
                  </option>
                  {getPlaceOptions(selectedAct.code).map((option) => (
                    <option key={`${selectedAct.code}-sheet-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="show-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.watchVideo}</p>
                  <p className="mt-2 text-sm leading-6 text-arenaMuted">{text.watchVideoHint}</p>
                </div>
                <a
                  href={buildActVideoUrl(selectedAct)}
                  target="_blank"
                  rel="noreferrer"
                  className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
                >
                  <PlayCircle size={16} />
                  {text.watchVideo}
                </a>
              </div>
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
                    onClick={() => toggleTone(selectedAct.code, tone.key)}
                    className={`rounded-full px-2.5 py-1 text-[10px] transition ${
                      getNoteTags(notes[selectedAct.code]).includes(tone.key)
                        ? "bg-arenaSurfaceMax text-white shadow-glow"
                        : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="label-copy uppercase tracking-[0.14em]">{resolvedNoteTagLabels[tone.key]}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="arena-input mt-4 min-h-[9.5rem] resize-y"
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
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.aboutArtist}</p>
              {getActFacts(selectedAct).length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {getActFacts(selectedAct).map((fact) => (
                    <p key={`${selectedAct.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                      {fact}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(selectedAct)}</p>
              )}
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

      <BottomSheet open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)}>
        <div className="grid gap-5">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">{text.resetRanking}</p>
            <h3 className="display-copy mt-3 text-3xl font-black text-white">{text.resetRankingConfirmTitle}</h3>
            <p className="mt-4 text-sm leading-7 text-arenaMuted">{text.resetRankingConfirmText}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="arena-button-secondary h-12 px-5 text-sm"
            >
              {text.resetRankingConfirmCancel}
            </button>
            <button
              type="button"
              onClick={handleResetRanking}
              className="arena-button-primary h-12 px-5 text-sm"
            >
              {text.resetRankingConfirmAction}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
