'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  LockKeyhole,
  NotebookPen,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createRoomSocket, fetchActs, fetchMyPrediction, fetchRoom, joinRoom, submitMyPrediction } from "../lib/api";
import { getAccountCopy } from "../lib/account-copy";
import { loadNotes, loadRanking, saveNotes, saveRanking } from "../lib/storage";
import type { ActEntry, ActNote, RoomDetails, StageKey } from "../lib/types";
import {
  createDefaultRanking,
  hasNote,
  moveCodeBy,
  moveCodeToIndex,
  normalizeRanking,
  NOTE_TONES,
} from "../lib/vote-utils";
import { useAccount } from "./AccountProvider";
import { ActPoster } from "./ActPoster";
import { AuthCard } from "./AuthCard";
import { BottomSheet } from "./BottomSheet";
import { useLanguage } from "./LanguageProvider";
import { StageSwitch } from "./StageSwitch";
import { UserAvatar } from "./UserAvatar";

const tabItems = [
  { key: "acts" },
  { key: "notes" },
  { key: "order" },
] as const;

type VoteTab = (typeof tabItems)[number]["key"];

function noteChipClass(selected: boolean) {
  return selected
    ? "bg-arenaSurfaceMax text-white shadow-glow"
    : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white";
}

export function VoteStudio({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [acts, setActs] = useState<ActEntry[]>([]);
  const [lineupReady, setLineupReady] = useState(true);
  const [expectedEntries, setExpectedEntries] = useState(0);
  const [ranking, setRanking] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, ActNote>>({});
  const [locked, setLocked] = useState(false);
  const [predictionsOpen, setPredictionsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [activeTab, setActiveTab] = useState<VoteTab>("acts");
  const [selectedActCode, setSelectedActCode] = useState<string | null>(null);
  const { copy, getCountryName, getActBlurb, getActContext, getActFacts, language } = useLanguage();
  const accountCopy = getAccountCopy(language);
  const { account, loading: accountLoading } = useAccount();

  function describeNote(note?: ActNote | null) {
    if (!hasNote(note)) return copy.vote.noNotesYet;
    if (note?.text.trim()) return note.text.trim();
    return note?.tone ? copy.notes[note.tone] : copy.vote.noNotesYet;
  }

  function getNoteToneLabel(note?: ActNote | null) {
    return note?.tone ? copy.notes[note.tone] : copy.vote.openAct;
  }

  function getRunningOrderLabel(value: number | null) {
    return value ? copy.acts.runningOrder(value) : null;
  }

  function getMetaChipLabel(act: ActEntry) {
    const context = getActContext(act);
    return context.value || copy.stageLabels[act.stageKey];
  }

  function getAboutFacts(act: ActEntry) {
    const blurb = getActBlurb(act).trim();
    return getActFacts(act).filter((fact) => fact.trim() && fact.trim() !== blurb);
  }

  function getFinalContext(act: ActEntry) {
    if (act.stageKey !== "final") return null;
    return getActContext(act);
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

  useEffect(() => {
    if (accountLoading) {
      return undefined;
    }

    let active = true;
    const storedNotes = loadNotes(roomSlug, stageKey);
    const storedRanking = loadRanking(roomSlug, stageKey);

    setNotes(storedNotes);
    setLoading(true);

    const load = async () => {
      try {
        const [roomPayload, actsPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchActs(roomSlug, stageKey),
        ]);
        if (!active) return;

        const baseRanking = storedRanking.length
          ? normalizeRanking(actsPayload.acts, storedRanking)
          : createDefaultRanking(actsPayload.acts);

        let nextRanking = baseRanking;
        let nextLocked = false;

        if (account) {
          try {
            await joinRoom(roomSlug);
            const prediction = await fetchMyPrediction(roomSlug, stageKey);
            if (!active) return;
            nextRanking = prediction.ranking.length
              ? normalizeRanking(actsPayload.acts, prediction.ranking)
              : baseRanking;
            nextLocked = prediction.locked;
          } catch (predictionError) {
            console.warn(predictionError);
          }
        }

        setRoom(roomPayload);
        setPredictionsOpen(roomPayload.predictionWindows?.[stageKey] ?? true);
        setActs(actsPayload.acts);
        setLineupReady(actsPayload.lineupReady);
        setExpectedEntries(actsPayload.expectedEntries);
        setRanking(nextRanking);
        setLocked(nextLocked);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(copy.vote.submitError);
      }
    };

    void load();

    const socket = createRoomSocket(roomSlug);
    socket.on("toggle", (payload: { roomSlug: string; stage?: StageKey; open?: boolean; predictionWindows?: Record<StageKey, boolean> }) => {
      if (payload.roomSlug !== roomSlug) return;
      if (payload.predictionWindows) {
        setPredictionsOpen(payload.predictionWindows[stageKey] ?? true);
        return;
      }
      if (payload.stage === stageKey && typeof payload.open === "boolean") {
        setPredictionsOpen(payload.open);
      }
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [account?.id, accountLoading, copy.vote.submitError, roomSlug, stageKey]);

  useEffect(() => {
    if (!acts.length) return;
    saveRanking(roomSlug, stageKey, ranking);
  }, [acts.length, ranking, roomSlug, stageKey]);

  const rankingMap = ranking.reduce<Record<string, number>>((acc, code, index) => {
    acc[code] = index + 1;
    return acc;
  }, {});

  const selectedAct = acts.find((act) => act.code === selectedActCode) || null;
  const notedActsCount = acts.filter((act) => hasNote(notes[act.code])).length;
  const filledPositions = ranking.length;
  const ballotTarget = lineupReady ? acts.length : expectedEntries || acts.length;

  async function handleSubmit() {
    if (!account) {
      setError(accountCopy.auth.switchToLogin);
      return;
    }
    if (!predictionsOpen) {
      setError(copy.vote.votingClosedError);
      return;
    }
    if (!lineupReady) {
      setError(
        language === "ru"
          ? "Для этого этапа ещё не подтверждён полный официальный состав участников."
          : "The full official lineup for this stage has not been confirmed yet.",
      );
      return;
    }
    if (ranking.length !== acts.length) {
      setError(copy.vote.incompleteError);
      return;
    }

    setSubmitting(true);
    try {
      await submitMyPrediction(roomSlug, stageKey, ranking);
      setLocked(true);
      setStatusText(copy.vote.submitSuccess);
      setError("");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : copy.vote.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-[1.8rem] bg-white/5" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-[1.8rem] bg-white/5" />
      </div>
    );
  }

  if (error && !acts.length) {
    return <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">{error}</div>;
  }

  return (
    <div className="grid gap-5">
      <StageSwitch roomSlug={roomSlug} currentStage={stageKey} section="vote" />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                {copy.vote.liveVotingWindow}
              </p>
              <h2 className="display-copy mt-2 text-3xl font-black md:text-5xl">
                {copy.vote.heroTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-arenaMuted md:text-base">
                {copy.vote.heroDescription}
              </p>
            </div>
            <div className="show-panel p-4 text-sm text-arenaMuted">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.vote.statusLabel}</p>
              <p className="mt-3 text-white">
                {predictionsOpen ? copy.vote.votingOpen : copy.vote.votingClosed}
              </p>
              <p className="mt-2 text-white">
                {locked ? copy.vote.stageLocked : copy.vote.stageEditable}
              </p>
              {room ? <p className="mt-2 text-arenaMuted">{copy.vote.roomLabel}: {room.name}</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.vote.actsLabel}</p>
            <p className="display-copy mt-2 text-4xl font-black">{acts.length}</p>
            <p className="mt-2 text-sm text-arenaMuted">{copy.vote.actsText}</p>
          </div>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.vote.notesLabel}</p>
            <p className="display-copy mt-2 text-4xl font-black">{notedActsCount}</p>
            <p className="mt-2 text-sm text-arenaMuted">{copy.vote.notesText}</p>
          </div>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.vote.ballotLabel}</p>
            <p className="display-copy mt-2 text-4xl font-black">{filledPositions}/{ballotTarget}</p>
            <p className="mt-2 text-sm text-arenaMuted">{copy.vote.ballotText(ballotTarget)}</p>
          </div>
        </section>
      </div>

      {!lineupReady ? (
        <section className="show-card p-4 text-sm text-arenaMuted">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
            {language === "ru" ? "Состав этапа ещё формируется" : "Stage lineup still forming"}
          </p>
          <p className="mt-2">
            {language === "ru"
              ? `Сейчас подтверждено ${acts.length} из ${expectedEntries} ожидаемых участников. Официальное голосование по этому этапу откроется после подтверждения полного состава.`
              : `${acts.length} of ${expectedEntries} expected acts are confirmed right now. Official voting for this stage opens after the full lineup is confirmed.`}
          </p>
        </section>
      ) : null}

      {!account ? (
        <AuthCard
          roomSlug={roomSlug}
          nextHref={`/account?next=/${roomSlug}/vote/${stageKey}`}
          onAuthenticated={() => {
            setStatusText(accountCopy.auth.loggedInAs);
            setError("");
          }}
        />
      ) : (
        <section className="show-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={account.publicName}
                emoji={account.emoji}
                avatarUrl={account.avatarUrl}
                avatarTheme={account.avatarTheme}
                className="h-12 w-12"
                textClass="text-sm"
              />
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.vote.votingOnPhone}</p>
                <p className="text-lg font-semibold text-white">{account.publicName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-arenaMuted">
              <span className="show-chip">
                <UserRound size={14} />
                {copy.vote.singleBallot}
              </span>
              <Link href="/account" className="show-chip text-white underline-offset-4 hover:underline">
                {accountCopy.auth.manageAccount}
              </Link>
            </div>
          </div>
        </section>
      )}

      {error && acts.length ? (
        <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}
      {statusText ? (
        <div className="rounded-[1.4rem] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{statusText}</div>
      ) : null}

      <section className="show-card p-3">
        <div className="flex flex-wrap gap-2">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeTab === tab.key
                  ? "bg-arenaSurfaceMax text-white shadow-glow"
                  : "bg-transparent text-arenaMuted hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="label-copy uppercase tracking-[0.22em]">
                {tab.key === "acts" ? copy.vote.tabActs : tab.key === "notes" ? copy.vote.tabNotes : copy.vote.tabOrder}
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeTab === "acts" ? (
        <section className="grid gap-3">
          {acts.map((act) => (
            <motion.button
              key={act.code}
              layout
              type="button"
              onClick={() => setSelectedActCode(act.code)}
              className="show-card w-full p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-4">
                <ActPoster act={act} compact />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                      #{rankingMap[act.code]}
                    </span>
                    <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                      {getCountryName(act.code, act.country)}
                    </span>
                    <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                      {getMetaChipLabel(act)}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">{act.artist}</p>
                  <p className="text-sm text-arenaMuted">{act.song}</p>
                  <p className="mt-2 truncate text-sm text-arenaMuted">
                    {hasNote(notes[act.code]) ? describeNote(notes[act.code]) : copy.vote.tapToAddNote}
                  </p>
                </div>
                <div className="show-chip shrink-0 text-xs text-white">
                  {hasNote(notes[act.code]) ? copy.vote.noteSavedBadge : copy.vote.openAct}
                </div>
              </div>
            </motion.button>
          ))}
        </section>
      ) : null}

      {activeTab === "notes" ? (
        <section className="grid gap-3">
          {ranking.map((code) => {
            const act = acts.find((entry) => entry.code === code);
            if (!act) return null;

            return (
              <button
                key={act.code}
                type="button"
                onClick={() => setSelectedActCode(act.code)}
                className="show-card p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                <div className="flex items-center gap-4">
                  <ActPoster act={act} compact />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                        {hasNote(notes[act.code]) ? getNoteToneLabel(notes[act.code]) : copy.vote.openAct}
                      </span>
                      <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                        {copy.vote.placeLabel} #{rankingMap[act.code]}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-white">{act.artist}</p>
                    <p className="mt-1 text-sm text-arenaMuted">
                      {hasNote(notes[act.code]) ? describeNote(notes[act.code]) : copy.vote.tapToAddNote}
                    </p>
                  </div>
                  <div className="show-chip shrink-0 text-xs text-white">
                    {hasNote(notes[act.code]) ? copy.vote.noteSavedBadge : copy.vote.openAct}
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      ) : null}

      {activeTab === "order" ? (
        <section className="grid gap-3">
          {ranking.map((code, index) => {
            const act = acts.find((entry) => entry.code === code);
            if (!act) return null;

            return (
              <motion.div
                key={act.code}
                layout
                className="show-card p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                <div className="flex items-center gap-4">
                  <div className="show-rank h-14 w-14 shrink-0 text-2xl font-black text-arenaText">
                    {index + 1}
                  </div>
                  <ActPoster act={act} compact />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-white">{act.artist}</p>
                    <p className="text-sm text-arenaMuted">{getCountryName(act.code, act.country)} · {act.song}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setRanking((current) => moveCodeBy(current, act.code, -1))}
                      className="arena-button-secondary flex h-11 w-11 items-center justify-center"
                      disabled={locked || index === 0}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRanking((current) => moveCodeBy(current, act.code, 1))}
                      className="arena-button-secondary flex h-11 w-11 items-center justify-center"
                      disabled={locked || index === ranking.length - 1}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActCode(act.code)}
                      className="arena-button-secondary px-4 text-sm"
                    >
                      {copy.vote.placeLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>
      ) : null}

      <div className="show-card sticky bottom-4 z-20 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.38)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-arenaMuted">
            <span className="show-chip">
              <NotebookPen size={14} />
              {copy.vote.fullOrderReady(filledPositions, ballotTarget)}
            </span>
            <span className="show-chip">
              <Radio size={14} className={predictionsOpen ? "text-arenaDanger" : "text-arenaMuted"} />
              {predictionsOpen ? copy.vote.windowOpen : copy.vote.windowClosed}
            </span>
            <span className="show-chip">
              <Sparkles size={14} />
              {copy.vote.savedOnPhone}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!account || locked || !predictionsOpen || submitting || !lineupReady}
            className="arena-button-primary h-14 px-8 text-sm"
          >
            {locked ? copy.vote.ballotLocked : submitting ? copy.vote.locking : copy.vote.submitBallot}
          </button>
        </div>
      </div>

      <BottomSheet open={Boolean(selectedAct)} onClose={() => setSelectedActCode(null)}>
        {selectedAct ? (
          <div className="grid gap-5">
            <ActPoster act={selectedAct} mode="hero" />

            <div className="flex flex-wrap gap-2">
              <span className="show-chip text-xs text-white">
                {copy.vote.placeLabel} #{rankingMap[selectedAct.code]}
              </span>
              <span className="show-chip text-xs text-arenaBeam">
                {getCountryName(selectedAct.code, selectedAct.country)}
              </span>
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                    {copy.vote.tabNotes}
                  </p>
                  <p className="mt-2 text-sm text-arenaMuted">{copy.vote.notesAutosave}</p>
                </div>
                {hasNote(notes[selectedAct.code]) ? (
                  <span className="show-chip text-xs text-arenaBeam">{copy.vote.noteSavedBadge}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
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
                  {hasNote(notes[selectedAct.code]) ? copy.acts.noteSavedLocally : copy.vote.tapToAddNote}
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

            <div className="show-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.vote.exactPlacement}</p>
                  <p className="mt-2 text-sm text-arenaMuted">
                    {copy.vote.exactPlacementText}
                  </p>
                </div>
                {locked ? (
                  <span className="show-chip text-xs uppercase tracking-[0.2em] text-arenaMuted">
                    <LockKeyhole size={14} />
                    {copy.common.locked}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <select
                  className="arena-input"
                  value={rankingMap[selectedAct.code]}
                  onChange={(event) =>
                    setRanking((current) => moveCodeToIndex(current, selectedAct.code, Number(event.target.value) - 1))
                  }
                  disabled={locked}
                >
                  {ranking.map((code, index) => (
                    <option key={code} value={index + 1}>
                      {copy.vote.placeLabel} #{index + 1}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setRanking((current) => moveCodeBy(current, selectedAct.code, -1))}
                  className="arena-button-secondary px-5 py-3"
                  disabled={locked || rankingMap[selectedAct.code] === 1}
                >
                  {copy.vote.higher}
                </button>
                <button
                  type="button"
                  onClick={() => setRanking((current) => moveCodeBy(current, selectedAct.code, 1))}
                  className="arena-button-secondary px-5 py-3"
                  disabled={locked || rankingMap[selectedAct.code] === ranking.length}
                >
                  {copy.vote.lower}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("order");
                  setSelectedActCode(null);
                }}
                className="arena-button-secondary mt-4 px-5 py-3 text-sm"
              >
                {copy.vote.openFullOrder}
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
