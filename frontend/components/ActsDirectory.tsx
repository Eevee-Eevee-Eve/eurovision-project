'use client';

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { fetchActs, fetchRoom } from "../lib/api";
import { loadNotes, loadRanking, saveNotes } from "../lib/storage";
import type { ActEntry, ActNote, RoomDetails, StageKey } from "../lib/types";
import { hasNote, normalizeRanking, NOTE_TONES } from "../lib/vote-utils";
import { ActPoster } from "./ActPoster";
import { BottomSheet } from "./BottomSheet";
import { useLanguage } from "./LanguageProvider";
import { StageSwitch } from "./StageSwitch";

export function ActsDirectory({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [acts, setActs] = useState<ActEntry[]>([]);
  const [lineupReady, setLineupReady] = useState(true);
  const [expectedEntries, setExpectedEntries] = useState(0);
  const [rankingMap, setRankingMap] = useState<Record<string, number>>({});
  const [hasPersonalRanking, setHasPersonalRanking] = useState(false);
  const [notes, setNotes] = useState<Record<string, ActNote>>({});
  const [query, setQuery] = useState("");
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { copy, getActBlurb, getActContext, getActFacts, getCountryName, language } = useLanguage();

  const deferredQuery = useDeferredValue(query);

  function describeNote(note?: ActNote | null) {
    if (!note || (!note.text.trim() && !note.tone)) return copy.vote.noNotesYet;
    if (note.text.trim()) return note.text.trim();
    return copy.notes[note.tone as keyof typeof copy.notes] || copy.vote.noNotesYet;
  }

  function getRunningOrderLabel(value: number | null) {
    return value ? copy.acts.runningOrder(value) : null;
  }

  function getPlacementLabel(value: number | null | undefined) {
    return value != null ? `#${value}` : "—";
  }

  function noteChipClass(selected: boolean) {
    return selected
      ? "bg-arenaSurfaceMax text-white shadow-glow"
      : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white";
  }

  function persistNotes(nextNotes: Record<string, ActNote>) {
    saveNotes(roomSlug, stageKey, nextNotes);
    return nextNotes;
  }

  function updateNote(code: string, patch: Partial<ActNote>) {
    setNotes((current) => {
      const previous = current[code] || { tone: null, text: "" };
      const nextEntry = {
        tone: patch.tone !== undefined ? patch.tone : previous.tone,
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

  function clearNote(code: string) {
    setNotes((current) => {
      const nextNotes = { ...current };
      delete nextNotes[code];
      return persistNotes(nextNotes);
    });
  }

  function getAboutFacts(act: ActEntry) {
    const blurb = getActBlurb(act).trim();
    return getActFacts(act).filter((fact) => fact.trim() && fact.trim() !== blurb);
  }

  function getFinalContext(act: ActEntry) {
    if (act.stageKey !== "final") return null;
    return getActContext(act);
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
        setHasPersonalRanking(rawStoredRanking.length > 0);
        setNotes(storedNotes);
        setLoading(false);
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(copy.acts.loadError);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [copy.acts.loadError, roomSlug, stageKey]);

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
        <div className="h-14 animate-pulse rounded-full bg-white/5" />
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-52 animate-pulse rounded-[1.8rem] bg-white/5" />
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

      <section className="show-card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.acts.heroKicker}</p>
            <h2 className="display-copy mt-2 text-3xl font-black md:text-5xl">{copy.acts.heroTitle}</h2>
            <p className="mt-3 text-sm text-arenaMuted md:text-base">{copy.acts.heroDescription}</p>
            {room ? <p className="mt-3 text-sm text-arenaMuted">{copy.acts.roomLabel}: {room.name}</p> : null}
          </div>
          <Link
            href={`/${roomSlug}/vote/${stageKey}`}
            className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
          >
            {copy.acts.openVoteStudio}
          </Link>
        </div>
      </section>

      {!lineupReady ? (
        <section className="show-card p-4 text-sm text-arenaMuted">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
            {language === "ru" ? "Состав этапа ещё формируется" : "Stage lineup still forming"}
          </p>
          <p className="mt-2">
            {language === "ru"
              ? `Сейчас подтверждено ${acts.length} из ${expectedEntries} участников. Полный состав для официального голосования появится после завершения полуфиналов.`
              : `${acts.length} of ${expectedEntries} expected acts are confirmed right now. The full official voting lineup will appear after the semi-finals are complete.`}
          </p>
        </section>
      ) : null}

      <section className="show-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted" size={18} />
          <input
            className="arena-input pl-12"
            placeholder={copy.acts.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredActs.map((act) => {
          const note = notes[act.code];
          const aboutFacts = getAboutFacts(act);

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
                {hasPersonalRanking ? (
                  <span className="show-chip text-xs text-white">
                    {copy.acts.currentPlace} {getPlacementLabel(rankingMap[act.code])}
                  </span>
                ) : null}
                {getRunningOrderLabel(act.runningOrder) ? (
                  <span className="show-chip text-xs text-arenaMuted">{getRunningOrderLabel(act.runningOrder)}</span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-1 flex-col">
                {getFinalContext(act) ? (
                  <div className="show-panel-muted p-4">
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                      {getFinalContext(act)?.label || copy.acts.stageMetaLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white">{getFinalContext(act)?.value}</p>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                    {copy.acts.aboutArtist}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-arenaMuted">{getActBlurb(act)}</p>

                  {aboutFacts.length ? (
                    <div className="mt-4 grid gap-3">
                      {aboutFacts.map((fact) => (
                        <p key={`${act.code}-${fact}`} className="text-sm leading-6 text-arenaMuted">
                          {fact}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>

                {hasNote(note) ? (
                  <div className="show-panel mt-4 p-4">
                    <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                      {copy.acts.noteSummaryPrefix}
                    </p>
                    <p className="mt-2 text-sm text-arenaMuted">{describeNote(note)}</p>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </section>

      <BottomSheet open={Boolean(selectedAct)} onClose={() => setSelectedActCode(null)}>
        {selectedAct ? (
          <div className="grid gap-5">
            <ActPoster act={selectedAct} mode="hero" />

            <div className="flex flex-wrap gap-2">
              <span className="show-chip text-xs text-arenaBeam">
                {getCountryName(selectedAct.code, selectedAct.country)}
              </span>
              {hasPersonalRanking ? (
                <span className="show-chip text-xs text-white">
                  {copy.acts.currentPlace} {getPlacementLabel(rankingMap[selectedAct.code])}
                </span>
              ) : null}
              {getRunningOrderLabel(selectedAct.runningOrder) ? (
                <span className="show-chip text-xs text-arenaMuted">
                  {getRunningOrderLabel(selectedAct.runningOrder)}
                </span>
              ) : null}
            </div>

            {getFinalContext(selectedAct) ? (
              <div className="show-panel-muted p-4">
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                  {getFinalContext(selectedAct)?.label || copy.acts.stageMetaLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-white">{getFinalContext(selectedAct)?.value}</p>
              </div>
            ) : null}

            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                {copy.acts.aboutArtist}
              </p>
              <p className="mt-3 text-sm leading-6 text-arenaMuted">{getActBlurb(selectedAct)}</p>

              {getAboutFacts(selectedAct).length ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {getAboutFacts(selectedAct).map((fact) => (
                    <p key={fact} className="text-sm leading-6 text-arenaMuted">
                      {fact}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                {copy.vote.tabNotes}
              </p>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mt-2 text-sm text-arenaMuted">
                    {hasNote(notes[selectedAct.code]) ? describeNote(notes[selectedAct.code]) : copy.vote.noNotesYet}
                  </p>
                  <p className="mt-2 text-sm text-arenaMuted">{copy.vote.notesAutosave}</p>
                </div>
                {hasNote(notes[selectedAct.code]) ? (
                  <span className="show-chip text-xs text-arenaBeam">{copy.vote.noteSavedBadge}</span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {NOTE_TONES.map((tone) => (
                  <button
                    key={tone.key}
                    type="button"
                    onClick={() =>
                      updateNote(selectedAct.code, {
                        tone: notes[selectedAct.code]?.tone === tone.key ? null : tone.key,
                      })
                    }
                    className={`rounded-full px-4 py-2 text-sm transition ${noteChipClass(notes[selectedAct.code]?.tone === tone.key)}`}
                  >
                    <span className="label-copy uppercase tracking-[0.2em]">{copy.notes[tone.key]}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="arena-input mt-4 min-h-28 resize-y"
                placeholder={copy.vote.notePlaceholder}
                value={notes[selectedAct.code]?.text || ""}
                onChange={(event) => updateNote(selectedAct.code, { text: event.target.value })}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-arenaMuted">
                  {hasNote(notes[selectedAct.code])
                    ? copy.acts.noteSavedLocally
                    : copy.vote.tapToAddNote}
                </p>
                {hasNote(notes[selectedAct.code]) ? (
                  <button
                    type="button"
                    onClick={() => clearNote(selectedAct.code)}
                    className="arena-button-secondary px-5 py-3 text-sm"
                  >
                    {copy.vote.clearNote}
                  </button>
                ) : null}
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
                  {language === "ru" ? "Официальный профиль" : "Official profile"}
                </a>
              ) : null}
              <Link
                href={`/${roomSlug}/vote/${stageKey}`}
                className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
              >
                {copy.acts.openVoteStudio}
              </Link>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
