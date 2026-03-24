'use client';

import Link from "next/link";
import { NotebookPen, PlayCircle, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchActs, fetchRoom } from "../lib/api";
import { loadNotes, loadPlacedActs, loadRanking, saveNotes } from "../lib/storage";
import type { ActEntry, ActNote, RoomDetails, StageKey } from "../lib/types";
import { buildActVideoUrl, getNoteTags, hasNote, normalizeRanking, NOTE_TONES } from "../lib/vote-utils";
import { ActPoster } from "./ActPoster";
import { BottomSheet } from "./BottomSheet";
import { StageSwitch } from "./StageSwitch";
import { useLanguage } from "./LanguageProvider";

export function ActsDirectory({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [acts, setActs] = useState<ActEntry[]>([]);
  const [lineupReady, setLineupReady] = useState(true);
  const [expectedEntries, setExpectedEntries] = useState(0);
  const [rankingMap, setRankingMap] = useState<Record<string, number>>({});
  const [placedActs, setPlacedActs] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, ActNote>>({});
  const [query, setQuery] = useState("");
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { getActBlurb, getActContext, getActFacts, getCountryName, language } = useLanguage();
  const deferredQuery = useDeferredValue(query);

  const text = useMemo(() => (
    language === "ru"
      ? {
          kicker: "Companion screen",
          title: "Гид по артистам",
          description:
            "Открывай артистов во время шоу, быстро читай про них и держи заметку рядом с карточкой, а не в отдельном тяжёлом интерфейсе.",
          searchPlaceholder: "Поиск по артисту, стране или песне",
          roomLabel: "Комната",
          openVoteStudio: "Открыть бюллетень",
          stageForming: "Состав этапа ещё формируется",
          stageFormingText: (count: number, total: number) => `Сейчас подтверждено ${count} из ${total} участников. Когда состав станет полным, карточки автоматически выстроятся под официальный этап.`,
          currentPlace: "Место в моём рейтинге",
          aboutArtist: "Об исполнителе",
          noteLabel: "Моя заметка",
          noNotesYet: "Пока нет заметки. Открой артиста и оставь быструю пометку, как на бумаге.",
          noteSaved: "Заметка сохранена на этом устройстве",
          tapToAddNote: "Открой карточку и добавь заметку",
          clearNote: "Очистить заметку",
          officialProfile: "Официальный профиль",
          watchVideo: "Посмотреть видео",
          watchVideoHint: "Если забыли выступление, можно быстро освежить его в памяти.",
          noteSavedBadge: "Есть заметка",
          placeUnknown: "Пока не расставлено",
        }
      : {
          kicker: "Companion screen",
          title: "Acts guide",
          description:
            "Open performers during the show, read the essentials fast, and keep your note attached to the card instead of hidden in a heavy UI.",
          searchPlaceholder: "Search by artist, country, or song",
          roomLabel: "Room",
          openVoteStudio: "Open ballot",
          stageForming: "Stage lineup is still forming",
          stageFormingText: (count: number, total: number) => `${count} of ${total} acts are confirmed right now. Once the lineup is complete, these cards will align to the official stage setup.`,
          currentPlace: "Place in my ranking",
          aboutArtist: "About the artist",
          noteLabel: "My note",
          noNotesYet: "No note yet. Open the act and keep one fast note just like on paper.",
          noteSaved: "The note is already saved on this device",
          tapToAddNote: "Open the card to add a note",
          clearNote: "Clear note",
          officialProfile: "Official profile",
          watchVideo: "Watch video",
          watchVideoHint: "Open the video to quickly remember the act and the vibe.",
          noteSavedBadge: "Note saved",
          placeUnknown: "Not placed yet",
        }
  ), [language]);
  const resolvedNoteTagLabels = language === "ru"
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
      };

  function describeNote(note?: ActNote | null) {
    const selectedTags = getNoteTags(note);
    if (!note || (!note.text.trim() && !selectedTags.length)) return text.noNotesYet;
    if (note.text.trim()) return note.text.trim();
    return selectedTags.map((tone) => resolvedNoteTagLabels[tone]).join(", ") || text.noNotesYet;
  }

  const placedActsSet = useMemo(() => new Set(placedActs), [placedActs]);

  function persistNotes(nextNotes: Record<string, ActNote>) {
    saveNotes(roomSlug, stageKey, nextNotes);
    return nextNotes;
  }

  function updateNote(code: string, patch: Partial<ActNote>) {
    setNotes((current) => {
      const previous = current[code] || { tones: [], text: "" };
      const nextEntry = {
        tones: patch.tones !== undefined ? patch.tones : previous.tones,
        text: patch.text !== undefined ? patch.text : previous.text,
      };
      const nextNotes = { ...current };

      if (!hasNote(nextEntry)) {
        delete nextNotes[code];
      } else {
        nextNotes[code] = nextEntry;
      }

      return persistNotes(nextNotes);
    });
  }

  function toggleTone(code: string, toneKey: (typeof NOTE_TONES)[number]["key"]) {
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
      return persistNotes(nextNotes);
    });
  }

  function getAboutFacts(act: ActEntry) {
    return getActFacts(act).filter(Boolean);
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [roomPayload, actsPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchActs(roomSlug, stageKey),
        ]);
        if (!active) return;

        const storedNotes = loadNotes(roomSlug, stageKey);
        const rawStoredRanking = loadRanking(roomSlug, stageKey);
        const storedPlacedActs = loadPlacedActs(roomSlug, stageKey);
        const storedRanking = normalizeRanking(actsPayload.acts, rawStoredRanking);

        setRoom(roomPayload);
        setActs(actsPayload.acts);
        setLineupReady(actsPayload.lineupReady);
        setExpectedEntries(actsPayload.expectedEntries);
        setRankingMap(
          storedRanking.reduce<Record<string, number>>((acc, code, index) => {
            acc[code] = index + 1;
            return acc;
          }, {}),
        );
        setPlacedActs(
          storedPlacedActs.length > 0
            ? storedPlacedActs.filter((code) => storedRanking.includes(code))
            : rawStoredRanking.length > 0
              ? storedRanking
              : [],
        );
        setNotes(storedNotes);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(language === "ru" ? "Не удалось загрузить гид по артистам." : "Unable to load the acts guide.");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [language, roomSlug, stageKey]);

  const filteredActs = acts.filter((act) => {
    const value = deferredQuery.trim().toLowerCase();
    if (!value) return true;
    return [act.artist, getCountryName(act.code, act.country), act.song].some((field) =>
      field.toLowerCase().includes(value),
    );
  });

  const selectedAct = acts.find((act) => act.code === selectedActCode) || null;

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse rounded-[1.8rem] bg-white/5" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-[30rem] animate-pulse rounded-[1.8rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">{error}</div>;
  }

  return (
    <div className="grid gap-5">
      <StageSwitch roomSlug={roomSlug} currentStage={stageKey} section="acts" />

      <section className="show-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.kicker}</p>
            <h2 className="display-copy mt-3 text-3xl font-black md:text-5xl">{text.title}</h2>
            <p className="mt-4 text-sm leading-7 text-arenaMuted md:text-base">{text.description}</p>
            {room ? (
              <p className="mt-3 text-sm text-arenaMuted">
                {text.roomLabel}: {room.name}
              </p>
            ) : null}
          </div>

          <Link
            href={`/${roomSlug}/vote/${stageKey}`}
            className="arena-button-primary inline-flex h-14 items-center justify-center gap-2 px-8 text-sm"
          >
            <NotebookPen size={16} />
            {text.openVoteStudio}
          </Link>
        </div>
      </section>

      {!lineupReady ? (
        <section className="show-card p-4 text-sm text-arenaMuted">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">{text.stageForming}</p>
          <p className="mt-2">{text.stageFormingText(acts.length, expectedEntries)}</p>
        </section>
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredActs.map((act) => {
          const note = notes[act.code];
          const facts = getAboutFacts(act);
          const finalContext = act.stageKey === "final" ? getActContext(act) : null;

          return (
            <button
              key={act.code}
              type="button"
              onClick={() => setSelectedActCode(act.code)}
              className="show-card flex h-full flex-col p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <ActPoster act={act} mode="hero" contentDensity="compact" />

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="show-chip text-xs text-arenaBeam">{getCountryName(act.code, act.country)}</span>
                {placedActsSet.has(act.code) ? (
                  <span className="show-chip text-xs text-white">
                    {text.currentPlace} #{rankingMap[act.code]}
                  </span>
                ) : (
                  <span className="show-chip text-xs text-arenaMuted">{text.placeUnknown}</span>
                )}
                {finalContext ? (
                  <span className="show-chip text-xs text-arenaMuted">{finalContext.value}</span>
                ) : null}
                {hasNote(note) ? (
                  <span className="show-chip text-xs text-white">{text.noteSavedBadge}</span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                  {text.aboutArtist}
                </p>
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(act)}</p>

                {facts.length ? (
                  <div className="mt-4 grid gap-2">
                    {facts.slice(0, 2).map((fact) => (
                      <p key={`${act.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                        {fact}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="show-panel mt-5 p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{text.noteLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-arenaMuted">{describeNote(note)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

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
                      {text.currentPlace} #{rankingMap[selectedAct.code]}
                    </span>
                  ) : (
                    <span className="show-chip text-xs text-arenaMuted">{text.placeUnknown}</span>
                  )}
                  {selectedAct.stageKey === "final" ? (
                    <span className="show-chip text-xs text-arenaMuted">{getActContext(selectedAct).value}</span>
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
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.aboutArtist}</p>
              {getAboutFacts(selectedAct).length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {getAboutFacts(selectedAct).map((fact) => (
                    <p key={`${selectedAct.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                      {fact}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{getActBlurb(selectedAct)}</p>
              )}
            </div>

            <div className="show-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.noteLabel}</p>
                  <p className="mt-2 text-sm text-arenaMuted">
                    {hasNote(notes[selectedAct.code]) ? text.noteSaved : text.tapToAddNote}
                  </p>
                </div>
                {hasNote(notes[selectedAct.code]) ? (
                  <span className="show-chip text-xs text-arenaBeam">{text.noteSavedBadge}</span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {NOTE_TONES.map((tone) => (
                  <button
                    key={tone.key}
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
                className="arena-input mt-4 min-h-[9rem] resize-y"
                placeholder={text.noNotesYet}
                value={notes[selectedAct.code]?.text || ""}
                onChange={(event) => updateNote(selectedAct.code, { text: event.target.value })}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-arenaMuted">{describeNote(notes[selectedAct.code])}</p>
                {hasNote(notes[selectedAct.code]) ? (
                  <button
                    type="button"
                    onClick={() => clearNote(selectedAct.code)}
                    className="arena-button-secondary px-5 py-3 text-sm"
                  >
                    {text.clearNote}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{text.watchVideo}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-arenaMuted">{text.watchVideoHint}</p>
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

            <div className="flex flex-wrap gap-3">
              {selectedAct.profileUrl ? (
                <a
                  href={selectedAct.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="arena-button-secondary inline-flex h-14 items-center justify-center px-6 text-sm"
                >
                  {text.officialProfile}
                </a>
              ) : null}
              <Link
                href={`/${roomSlug}/vote/${stageKey}`}
                className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
              >
                {text.openVoteStudio}
              </Link>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
