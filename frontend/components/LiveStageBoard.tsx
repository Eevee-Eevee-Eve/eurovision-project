'use client';

import { motion } from "framer-motion";
import { Mic2, MonitorPlay, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRoomSocket, fetchRoom, fetchStageResults } from "../lib/api";
import type { ActEntry, RoomDetails, StageKey } from "../lib/types";
import { ActPoster } from "./ActPoster";
import { useLanguage } from "./LanguageProvider";
import { MovementPill } from "./MovementPill";
import { StageSwitch } from "./StageSwitch";

export function LiveStageBoard({ roomSlug, stageKey }: { roomSlug: string; stageKey: StageKey }) {
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [results, setResults] = useState<ActEntry[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previousRanks = useRef<Record<string, number>>({});
  const { copy, getCountryName, getActContext, language } = useLanguage();
  const emptyMessage = language === "ru"
    ? "Результаты этого этапа еще не опубликованы. Когда хост откроет позиции, они появятся здесь."
    : "Stage results have not been published yet. Once the host reveals positions, they will appear here.";

  function getRunningOrderLabel(value: number | null) {
    return value ? copy.acts.runningOrder(value) : null;
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [roomPayload, resultsPayload] = await Promise.all([
          fetchRoom(roomSlug),
          fetchStageResults(roomSlug, stageKey),
        ]);
        if (!active) return;
        setRoom(roomPayload);
        setResults(resultsPayload.results);
        setLoading(false);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setLoading(false);
        setError(copy.live.loadError);
      }
    };

    load();

    const socket = createRoomSocket(roomSlug);
    socket.on("resultsUpdate", (payload: { stage: StageKey; results: ActEntry[] }) => {
      if (payload.stage !== stageKey) return;
      setResults(payload.results);
      setLoading(false);
    });

    return () => {
      active = false;
      socket.close();
    };
  }, [copy.live.loadError, roomSlug, stageKey]);

  useEffect(() => {
    const nextMovement = results.reduce<Record<string, number | null>>((acc, act) => {
      if (!act.rank) {
        acc[act.code] = null;
        return acc;
      }

      const previousRank = previousRanks.current[act.code];
      acc[act.code] = previousRank ? previousRank - act.rank : null;
      return acc;
    }, {});

    setMovement(nextMovement);
    previousRanks.current = results.reduce<Record<string, number>>((acc, act) => {
      if (act.rank) {
        acc[act.code] = act.rank;
      }
      return acc;
    }, {});
  }, [results]);

  const revealedCount = results.filter((act) => act.revealed).length;

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse rounded-[1.8rem] bg-white/5" />
        <div className="grid gap-3 xl:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.8rem] bg-white/5" />
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
      <StageSwitch roomSlug={roomSlug} currentStage={stageKey} section="live" />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaDanger">{copy.live.projectorMode}</p>
          <h2 className="display-copy mt-2 text-3xl font-black md:text-5xl">{copy.live.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-arenaMuted md:text-base">{copy.live.description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.live.revealed}</p>
            <p className="display-copy mt-2 text-4xl font-black">{revealedCount}/{results.length}</p>
          </div>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.common.room}</p>
            <p className="mt-2 text-lg font-semibold text-white">{room?.name || roomSlug}</p>
          </div>
          <div className="show-card p-4">
            <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{copy.live.display}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-white">
              <MonitorPlay size={16} />
              {copy.live.displayReady}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {results.length === 0 ? (
          <div className="show-card p-5 text-sm text-arenaMuted xl:col-span-2">
            {emptyMessage}
          </div>
        ) : null}
        {results.map((act) => (
          <motion.div
            key={act.code}
            layout
            className={`show-card p-5 transition ${
              act.revealed ? "hover:-translate-y-0.5 hover:bg-white/[0.08]" : "opacity-85"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="show-rank h-20 w-20 shrink-0 text-center">
                <span className="display-copy text-4xl font-black text-arenaText">{act.rank || "--"}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <ActPoster act={act} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                    {getCountryName(act.code, act.country)}
                  </span>
                  {getRunningOrderLabel(act.runningOrder) ? (
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                      {getRunningOrderLabel(act.runningOrder)}
                    </span>
                  ) : null}
                  <MovementPill delta={movement[act.code] ?? null} />
                </div>
                <div className="show-panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="display-copy text-2xl font-black md:text-3xl">{act.artist}</h3>
                    <span className="text-sm text-arenaMuted">{act.song}</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaPulse">
                        {getActContext(act).label}
                      </p>
                      <p className="mt-2 text-sm text-white">{getActContext(act).value}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-arenaMuted">
                      {getRunningOrderLabel(act.runningOrder) ? (
                        <span className="show-chip">
                          <Mic2 size={13} />
                          {getRunningOrderLabel(act.runningOrder)}
                        </span>
                      ) : null}
                      <span className="show-chip">
                        <Radio size={13} className={act.revealed ? "text-arenaDanger" : "text-arenaMuted"} />
                        {act.revealed ? copy.live.positionRevealed : copy.live.waitingReveal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
