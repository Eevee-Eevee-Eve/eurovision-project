'use client';

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, ExternalLink, GripVertical, Lock, PlayCircle, RotateCcw, Search, Send } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createRoomSocket,
  fetchActs,
  fetchMyPrediction,
  fetchRoom,
  submitMyPrediction,
} from "../lib/api";
import { resolveMediaUrl } from "../lib/media";
import { clearRanking, loadNotes, loadRanking, saveNotes, saveRanking } from "../lib/storage";
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
  state: "current" | "occupied" | "free";
  countryName: string | null;
  flagUrl: string | null;
  artist: string | null;
  song: string | null;
  caption: string;
};

function CountryBadge({
  countryName,
  flagUrl,
}: {
  countryName: string;
  flagUrl: string | null;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/92">
      <span className="h-5 w-5 shrink-0 overflow-hidden rounded-[0.45rem] border border-white/10 bg-white/10">
        <img
          src={flagUrl || undefined}
          alt={countryName}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </span>
      <span className="truncate">{countryName}</span>
    </span>
  );
}

function PlaceOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: PlaceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.25rem] border px-3 py-3 text-left transition ${
        selected
          ? "border-arenaBeam/30 bg-arenaBeam/10 text-white shadow-[0_8px_24px_rgba(129,236,255,0.12)]"
          : "border-white/6 bg-white/[0.04] text-white/92 hover:bg-white/[0.07]"
      }`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <div className="show-rank h-10 w-10 shrink-0">
          <span className="display-copy text-sm font-black text-arenaText">{option.value}</span>
        </div>
        <div className="min-w-0">
          {option.countryName ? (
            <CountryBadge countryName={option.countryName} flagUrl={option.flagUrl} />
          ) : (
            <span className="show-chip px-2.5 py-1 text-[11px] text-arenaMuted">{option.caption}</span>
          )}
          {option.artist ? (
            <p className="mt-2 line-clamp-1 text-sm font-medium text-white">{option.artist}</p>
          ) : null}
          <p className="mt-1 line-clamp-1 text-xs text-arenaMuted">
            {option.song || option.caption}
          </p>
        </div>
        <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-arenaBeam">
          {selected ? <Check size={15} /> : <span className="h-1.5 w-1.5 rounded-full bg-white/25" />}
        </span>
      </div>
    </button>
  );
}

function SortableOrderRow({
  act,
  rank,
  countryName,
  noteBadge,
  isQualifier,
  locked,
  dragLabel,
  onOpen,
}: {
  act: ActEntry;
  rank: number;
  countryName: string;
  noteBadge: string | null;
  isQualifier: boolean;
  locked: boolean;
  dragLabel: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: act.code,
    disabled: locked,
  });
  const flagUrl = resolveMediaUrl(act.flagUrl);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`show-card p-2.5 transition md:p-3 ${
        isQualifier
          ? "border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(70,220,165,0.12),transparent_48%),rgba(255,255,255,0.03)]"
          : ""
      } ${isDragging ? "scale-[0.995] shadow-[0_28px_80px_rgba(0,0,0,0.34)]" : ""}`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
          <div className={`show-rank h-10 w-10 shrink-0 ${isQualifier ? "border-emerald-300/20 shadow-[0_0_0_1px_rgba(70,220,165,0.08),0_18px_32px_rgba(22,118,89,0.18)]" : ""}`}>
            <span className={`display-copy text-base font-black ${isQualifier ? "text-emerald-100" : "text-arenaText"}`}>{rank}</span>
          </div>
          <div className="shrink-0">
            <ActPoster act={act} mode="row" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CountryBadge countryName={countryName} flagUrl={flagUrl} />
              {noteBadge ? <span className="show-chip px-2.5 py-1 text-[10px] text-white">{noteBadge}</span> : null}
            </div>
            <p className="mt-2 line-clamp-1 text-[0.95rem] font-medium leading-tight text-white/92">{act.artist}</p>
            <p className="mt-0.5 line-clamp-1 text-[0.82rem] text-arenaMuted">{act.song}</p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="arena-button-secondary inline-flex h-10 w-10 touch-none items-center justify-center rounded-[1rem] px-0 text-sm enabled:cursor-grab active:enabled:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
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
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [lineupReady, setLineupReady] = useState(true);
  const [expectedEntries, setExpectedEntries] = useState(0);
  const [currentEntries, setCurrentEntries] = useState(0);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const text = useMemo(() => (
    language === "ru"
      ? {
          kicker: "Телефон / голосование",
          title: "Голосование",
          description:
            "Перетаскивай артистов в свой порядок. Тап по строке открывает карточку с описанием, заметкой и видео.",
          stageForming: "Состав этапа ещё формируется",
          stageFormingText: (count: number, total: number) => `Сейчас подтверждено ${count} из ${total} участников. Как только состав будет полным, экран голосования автоматически подстроится под официальный этап.`,
          roomLabel: "Комната",
          accountReady: "Аккаунт активен",
          accountNeeded: "Чтобы сохранить порядок, нужен аккаунт",
          loginHint: "Черновик можно собирать уже сейчас. Чтобы сохранить порядок, войди на главной.",
          loginAction: "На главную",
          lockedState: "Ответ уже сохранён",
          searchPlaceholder: "Поиск по артисту, стране или песне",
          searchDragHint: "Поиск включён. Чтобы спокойно переставлять артистов, очисти запрос.",
          aboutArtist: "Об исполнителе",
          noteLabel: "Моя заметка",
          noteHint: "Короткая мысль по ходу шоу, как на бумаге.",
          noteSaved: "Сохранено на этом устройстве",
          noNotesYet: "Пока заметок нет. Выбери тег или напиши короткую мысль.",
          clearNote: "Очистить",
          rankingLabel: "Место в порядке",
          rankingFieldLabel: "Место артиста в моём порядке",
          quickGuide: "Открыть полный гид",
          linksTitle: "Прямые ссылки",
          officialProfile: "Официальный профиль",
          officialProfileHint: "Открой страницу артиста напрямую, без поиска по YouTube.",
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
          emptyActs: "Ничего не найдено. Попробуй другой запрос.",
          submitTitle: "Сохранить порядок",
          submitText: "Когда порядок готов, сохрани его. После этого этап для тебя закроется.",
          submitButton: "Сохранить порядок",
          submitDisabledNoAccount: "Войди на главной, чтобы сохранить порядок",
          submitDisabledClosed: "Сейчас окно голосования закрыто",
          submitDisabledLineup: "Этап ещё не собран полностью",
          submitDisabledLocked: "Ответ уже зафиксирован",
          submitDisabledUnchanged: "Сначала переставь хотя бы одного артиста",
          submitSuccess: "Ответ сохранён. Теперь можно спокойно следить за шоу.",
          loadError: "Не удалось загрузить голосование для этого этапа.",
          saveOrderHint: "Черновик и заметки сохраняются на этом устройстве до отправки.",
          blockedMessage: "Хост временно убрал тебя из этой комнаты. Смотреть артистов можно, но ответ отправить нельзя.",
          currentPlace: "Этот артист сейчас на",
          finalContextLabel: "Путь в финал",
          notePlaceholder: "Короткая заметка про номер, вокал, песню или вайб…",
          savedBadge: "Есть заметка",
          openActHint: "Тапни по артисту, чтобы открыть описание, заметки и видео.",
          placeOptionCurrent: (place: number) => `#${place} — сейчас здесь`,
          placeOptionOccupied: (place: number, artist: string) => `#${place} — сейчас ${artist}`,
          placeOptionFree: (place: number) => `#${place} — свободно`,
        }
        : {
          kicker: "Phone / voting",
          title: "Voting",
          description:
            "Drag acts into your own order. Tap any row to open the card with details, notes, and video.",
          stageForming: "This stage lineup is still forming",
          stageFormingText: (count: number, total: number) => `${count} of ${total} acts are confirmed right now. Once the lineup is complete, the voting screen will align to the official stage.`,
          roomLabel: "Room",
          accountReady: "Account active",
          accountNeeded: "You need an account to save your order",
          loginHint: "You can build the draft right now. Sign in on the homepage when you are ready to save it.",
          loginAction: "Open homepage",
          lockedState: "Answer already saved",
          searchPlaceholder: "Search by act, country, or song",
          searchDragHint: "Search is active. Clear it when you want smooth drag-and-drop.",
          aboutArtist: "About the artist",
          noteLabel: "My note",
          noteHint: "A quick thought during the show, just like on paper.",
          noteSaved: "Saved on this device",
          noNotesYet: "No notes yet. Pick a tag or write a quick thought.",
          clearNote: "Clear",
          rankingLabel: "Place in my order",
          rankingFieldLabel: "This artist in my order",
          quickGuide: "Open full guide",
          linksTitle: "Direct links",
          officialProfile: "Official profile",
          officialProfileHint: "Open the artist page directly without a YouTube search.",
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
          emptyActs: "Nothing matched this search.",
          submitTitle: "Save order",
          submitText: "When the order is ready, save it. After that this stage is closed for you.",
          submitButton: "Save order",
          submitDisabledNoAccount: "Sign in on the homepage first",
          submitDisabledClosed: "Voting is closed right now",
          submitDisabledLineup: "The stage lineup is not complete yet",
          submitDisabledLocked: "Answer already locked",
          submitDisabledUnchanged: "Move at least one act first",
          submitSuccess: "Answer saved. Now you can just enjoy the show.",
          loadError: "Unable to load voting for this stage.",
          saveOrderHint: "Draft order and notes stay on this device until you submit.",
          blockedMessage: "The host temporarily removed you from this room. You can still browse acts, but you cannot submit.",
          currentPlace: "This artist is currently at",
          finalContextLabel: "Road to the final",
          notePlaceholder: "A quick note about vocals, staging, song, or overall vibe…",
          savedBadge: "Note saved",
          openActHint: "Tap any act to open details, notes, and video.",
          placeOptionCurrent: (place: number) => `#${place} — currently here`,
          placeOptionOccupied: (place: number, artist: string) => `#${place} — now ${artist}`,
          placeOptionFree: (place: number) => `#${place} — free`,
        }
  ), [language]);

  const qualificationCutoff = room?.stageMeta?.[stageKey]?.qualificationCutoff ?? null;
  const qualificationCopy = useMemo(() => (
    language === "ru"
      ? {
          zoneTitle: qualificationCutoff ? `В финал проходят места 1–${qualificationCutoff}` : "",
          dividerTitle: qualificationCutoff ? `Начиная с места #${qualificationCutoff + 1}` : "",
          dividerText: "Ниже начинается зона вне финала.",
          inZone: "Сейчас в проходной зоне",
          outZone: "Сейчас вне проходной зоны",
        }
      : {
          zoneTitle: qualificationCutoff ? `Places 1-${qualificationCutoff} qualify for the final` : "",
          dividerTitle: qualificationCutoff ? `From place #${qualificationCutoff + 1}` : "",
          dividerText: "Below this line the acts are outside the final zone.",
          inZone: "Currently in the qualifying zone",
          outZone: "Currently outside the final zone",
        }
  ), [language, qualificationCutoff]);

  const currentStageOpen = room?.predictionWindows[stageKey] ?? false;
  const selectedAct = acts.find((act) => act.code === selectedActCode) || null;
  const selectedActLinks = useMemo(() => getActLinks(selectedAct), [selectedAct]);
  const defaultRanking = useMemo(() => createDefaultRanking(acts), [acts]);
  const actsByCode = useMemo(
    () =>
      acts.reduce<Record<string, ActEntry>>((acc, act) => {
        acc[act.code] = act;
        return acc;
      }, {}),
    [acts],
  );
  const rankingMap = useMemo(() => buildRankingMap(ranking), [ranking]);
  const hasCustomRanking = useMemo(
    () => ranking.length > 0 && !arraysEqual(ranking, defaultRanking),
    [defaultRanking, ranking],
  );
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
    const baseline = defaultRanking;
    setRanking(baseline);
    clearRanking(roomSlug, stageKey);
  }

  function handleResetRanking() {
    clearPersonalRankingState();
    setConfirmResetOpen(false);
    setStatusText("");
    setError("");
  }

  function openActCard(code: string) {
    setPlacePickerOpen(false);
    setSelectedActCode(code);
  }

  function openActPlacePicker(code: string) {
    setSelectedActCode(code);
    setPlacePickerOpen(true);
  }

  function moveArtistBy(code: string, delta: number) {
    persistRanking(moveCodeBy(ranking, code, delta));
  }

  function placeArtistAt(code: string, nextIndex: number) {
    persistRanking(moveCodeToIndex(ranking, code, nextIndex));
  }

  function getCurrentPlaceLabel(code: string) {
    const rank = rankingMap[code];
    if (!rank) return text.choosePlacePlaceholder;
    return `#${rank}`;
  }

  function getCurrentPlaceDescription(code: string) {
    const rank = rankingMap[code];
    if (!rank) return text.choosePlacePlaceholder;
    if (qualificationCutoff && rank <= qualificationCutoff) {
      return `${text.currentPlace} #${rank}. ${qualificationCopy.inZone}`;
    }
    if (qualificationCutoff) {
      return `${text.currentPlace} #${rank}. ${qualificationCopy.outZone}`;
    }
    return `${text.currentPlace} #${rank}`;
  }

  function getPlaceOptions(code: string) {
    const currentAct = actsByCode[code];
    const currentRank = rankingMap[code];

    return ranking.map((_, rankingIndex) => {
      const value = rankingIndex + 1;
      const occupantCode = ranking[rankingIndex];
      const occupantAct = occupantCode ? actsByCode[occupantCode] : null;
      if (currentAct && currentRank === value) {
        return {
          value,
          state: "current" as const,
          countryName: getCountryName(currentAct.code, currentAct.country),
          flagUrl: resolveMediaUrl(currentAct.flagUrl),
          artist: currentAct.artist,
          song: currentAct.song,
          caption: text.placeOptionCurrent(value),
        };
      }

      if (occupantAct) {
        return {
          value,
          state: "occupied" as const,
          countryName: getCountryName(occupantAct.code, occupantAct.country),
          flagUrl: resolveMediaUrl(occupantAct.flagUrl),
          artist: occupantAct.artist,
          song: occupantAct.song,
          caption: text.placeOptionOccupied(value, occupantAct.artist),
        };
      }

      return {
        value,
        state: "free" as const,
        countryName: null,
        flagUrl: null,
        artist: null,
        song: null,
        caption: text.placeOptionFree(value),
      };
    });
  }

  function getPlacePickerLabel(code: string) {
    const act = actsByCode[code];
    const rank = rankingMap[code];
    if (!act || !rank) {
      return text.choosePlacePlaceholder;
    }

    return `#${rank} · ${getCountryName(act.code, act.country)}`;
  }

  function getNoteSummaryText(note?: ActNote | null) {
    const tags = getNoteTags(note);
    if (!note || (!note.text.trim() && !tags.length)) return null;
    if (note.text.trim()) return note.text.trim();
    return tags.map((tone) => resolvedNoteTagLabels[tone]).join(" · ");
  }

  function getActLinks(act: ActEntry | null) {
    if (!act) {
      return {
        profileUrl: null,
        videoUrl: null,
      };
    }

    return {
      profileUrl: act.profileUrl?.trim() || null,
      videoUrl: buildActVideoUrl(act),
    };
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
        setNotes(storedNotes);
        saveNotes(roomSlug, stageKey, storedNotes);

        if (account) {
          try {
            const predictionPayload = await fetchMyPrediction(roomSlug, stageKey);
            if (!active) return;
            const normalized = normalizeRanking(
              actsPayload.acts,
              predictionPayload.ranking.length ? predictionPayload.ranking : storedRanking,
            );
            const baseline = normalized.length ? normalized : createDefaultRanking(actsPayload.acts);
            setRanking(baseline);
            saveRanking(roomSlug, stageKey, baseline);
            setLocked(predictionPayload.locked);
          } catch (predictionError) {
            console.error(predictionError);
            if (!active) return;
            const fallback = normalizeRanking(actsPayload.acts, storedRanking);
            const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
            setRanking(baseline);
            if (storedRanking.length > 0) {
              saveRanking(roomSlug, stageKey, baseline);
            }
            setLocked(false);
          }
        } else {
          const fallback = normalizeRanking(actsPayload.acts, storedRanking);
          const baseline = fallback.length ? fallback : createDefaultRanking(actsPayload.acts);
          setRanking(baseline);
          if (storedRanking.length > 0) {
            saveRanking(roomSlug, stageKey, baseline);
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

    if (!arraysEqual(normalized, ranking)) {
      setRanking(normalized);
      if (ranking.length > 0) {
        saveRanking(roomSlug, stageKey, normalized);
      }
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
  const canDrag = !locked && deferredQuery.trim().length === 0;

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
            : !hasCustomRanking
              ? text.submitDisabledUnchanged
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
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : text.submitDisabledClosed);
    } finally {
      setSubmitting(false);
    }
  }

  function renderVotingList() {
    const showQualifierDivider = Boolean(qualificationCutoff && deferredQuery.trim().length === 0);

    return (
      <div className="grid gap-4">
        {qualificationCutoff ? (
          <section className="show-panel-muted border border-emerald-300/10 p-3 md:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                <CheckCircle2 size={13} />
                {qualificationCopy.zoneTitle}
              </span>
              <span className="text-xs leading-6 text-arenaMuted">
                {language === "ru"
                  ? "Ты всё равно расставляешь все страны по местам, а граница прохода в финал остаётся видна прямо в списке."
                  : "You still rank every act, but the qualification line stays visible across the list."}
              </span>
            </div>
          </section>
        ) : null}

        <section className="show-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted" size={16} />
            <input
              className="arena-input h-11 pl-12 pr-4 text-sm md:h-12 md:pl-14"
              placeholder={text.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {qualificationCutoff && deferredQuery.trim().length > 0 ? (
            <div className="mt-3">
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                <CheckCircle2 size={13} />
                {qualificationCopy.zoneTitle}
              </span>
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-6 text-arenaMuted">{canDrag ? text.openActHint : text.searchDragHint}</p>
        </section>

        {filteredActs.length === 0 ? <section className="show-card p-5 text-sm text-arenaMuted">{text.emptyActs}</section> : null}

        <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleOrderDragEnd}>
          <SortableContext items={filteredActs.map((act) => act.code)} strategy={verticalListSortingStrategy}>
            <section className="grid gap-3">
              {filteredActs.flatMap((act) => {
                const note = notes[act.code];
                const rank = rankingMap[act.code] ?? 0;
                const isAfterCutoff = Boolean(showQualifierDivider && qualificationCutoff && rank === qualificationCutoff + 1);
                return [
                  isAfterCutoff ? (
                    <div key={`cutoff-${stageKey}-${act.code}`} className="show-panel-muted relative overflow-hidden border border-amber-200/10 p-3.5 md:p-4">
                      <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
                      <div className="relative flex flex-wrap items-center gap-3">
                        <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-amber-100">
                          {qualificationCopy.dividerTitle}
                        </span>
                        <p className="text-xs leading-6 text-arenaMuted">{qualificationCopy.dividerText}</p>
                      </div>
                    </div>
                  ) : null,
                  <SortableOrderRow
                    key={act.code}
                    act={act}
                    rank={rank}
                    countryName={getCountryName(act.code, act.country)}
                    noteBadge={hasNote(note) ? text.savedBadge : null}
                    isQualifier={Boolean(qualificationCutoff && rank > 0 && rank <= qualificationCutoff)}
                    locked={!canDrag}
                    dragLabel={language === "ru" ? "Перетащить" : "Drag to reorder"}
                    onOpen={() => openActCard(act.code)}
                  />,
                ].filter(Boolean);
              })}
            </section>
          </SortableContext>
        </DndContext>

        <section className="show-card sticky bottom-4 z-10 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.submitTitle}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{account ? text.submitText : text.loginHint}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              {!account ? (
                <Link
                  href="/"
                  className="arena-button-secondary inline-flex h-11 items-center justify-center px-4 text-sm"
                >
                  {text.loginAction}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={Boolean(submitDisabledReason) || submitting}
                className="arena-button-primary flex h-12 items-center justify-center gap-2 px-6 text-sm md:h-14 md:px-8"
              >
                <Send size={16} />
                {submitting ? "..." : text.submitButton}
              </button>
              {hasCustomRanking ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  disabled={locked}
                  className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
                >
                  <RotateCcw size={15} />
                  {text.resetRanking}
                </button>
              ) : null}
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

      <section className="show-card p-4 md:p-5">
        <div className="max-w-4xl">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.kicker}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-arenaMuted">
            <h2 className="display-copy text-[1.65rem] font-black leading-none md:text-4xl">{text.title}</h2>
            {room ? <span>{text.roomLabel}: {room.name}</span> : null}
            <span className="show-chip text-xs text-arenaBeam">{getStageLabel(stageKey)}</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-arenaMuted">{text.description}</p>
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

      {renderVotingList()}

      <BottomSheet
        open={Boolean(selectedAct)}
        onClose={() => {
          setSelectedActCode(null);
          setPlacePickerOpen(false);
        }}
      >
        {selectedAct ? (
          <div className="grid gap-4 md:gap-5">
            <div className="grid grid-cols-[4.75rem_1fr] items-start gap-3 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
              <div className="mx-auto w-full max-w-[5.5rem]">
                <ActPoster act={selectedAct} mode="row" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <CountryBadge
                    countryName={getCountryName(selectedAct.code, selectedAct.country)}
                    flagUrl={resolveMediaUrl(selectedAct.flagUrl)}
                  />
                  <span className="show-chip text-xs text-white">
                    {text.rankingLabel} {getCurrentPlaceLabel(selectedAct.code)}
                  </span>
                  {selectedAct.stageKey === "final" ? (
                    <span className="show-chip text-xs text-arenaMuted">
                      {text.finalContextLabel}: {getActContext(selectedAct).value}
                    </span>
                  ) : null}
                </div>

                <h3 className="display-copy mt-3 text-[1.85rem] font-black leading-[0.94] text-white md:text-4xl">
                  {selectedAct.artist}
                </h3>
                <p className="mt-1 text-base text-arenaMuted md:text-lg">{selectedAct.song}</p>
                <p className="mt-3 text-sm leading-6 text-arenaMuted">{getActBlurb(selectedAct)}</p>
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

              <div className="mt-4 grid gap-2.5">
                <button
                  type="button"
                  className="arena-input flex h-11 items-center justify-between px-4 text-left text-sm sm:h-12"
                  onClick={() => setPlacePickerOpen((current) => !current)}
                  disabled={locked}
                  aria-expanded={placePickerOpen}
                  aria-label={text.choosePlace}
                >
                  <span className="truncate text-white/92">{getPlacePickerLabel(selectedAct.code)}</span>
                  <ChevronDown size={16} className={`shrink-0 text-arenaMuted transition ${placePickerOpen ? "rotate-180" : ""}`} />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm"
                    disabled={locked || rankingMap[selectedAct.code] === 1}
                    onClick={() => moveArtistBy(selectedAct.code, -1)}
                    aria-label={text.moveHigher}
                    title={text.moveHigher}
                  >
                    <ArrowUp size={16} />
                    {text.moveHigher}
                  </button>
                  <button
                    type="button"
                    className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm"
                    disabled={locked || rankingMap[selectedAct.code] === ranking.length}
                    onClick={() => moveArtistBy(selectedAct.code, 1)}
                    aria-label={text.moveLower}
                    title={text.moveLower}
                  >
                    <ArrowDown size={16} />
                    {text.moveLower}
                  </button>
                </div>
              </div>

              {placePickerOpen ? (
                <div className="show-panel-muted mt-3 border border-white/8 p-2">
                  <div className="max-h-[min(40svh,16rem)] overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
                    <div className="grid gap-2">
                      {getPlaceOptions(selectedAct.code).map((option) => (
                        <PlaceOptionRow
                          key={`${selectedAct.code}-sheet-${option.value}`}
                          option={option}
                          selected={rankingMap[selectedAct.code] === option.value}
                          onSelect={() => {
                            placeArtistAt(selectedAct.code, option.value - 1);
                            setPlacePickerOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
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
                    onClick={() => toggleTone(selectedAct.code, tone.key)}
                    className={`rounded-full px-2.5 py-1 text-[9px] transition sm:text-[10px] ${
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
                className="arena-input mt-3 min-h-[6.75rem] resize-y text-sm md:min-h-[8rem]"
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

            {selectedActLinks.videoUrl ? (
              <div className="show-panel p-4">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.watchVideo}</p>
                <p className="mt-2 text-sm leading-6 text-arenaMuted">{text.watchVideoHint}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={selectedActLinks.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
                  >
                    <PlayCircle size={16} />
                    {text.watchVideo}
                  </a>
                  {selectedActLinks.profileUrl ? (
                    <a
                      href={selectedActLinks.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-arenaMuted underline-offset-4 transition hover:text-white hover:underline"
                    >
                      <ExternalLink size={14} />
                      {text.officialProfile}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

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
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/${roomSlug}/acts/${stageKey}`}
                  className="arena-button-primary inline-flex items-center justify-center px-6 py-3 text-sm"
                >
                  {text.quickGuide}
                </Link>
              </div>
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
