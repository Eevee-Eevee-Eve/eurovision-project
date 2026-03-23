'use client';

import Link from "next/link";
import { STAGE_OPTIONS } from "../lib/rooms";
import type { StageKey } from "../lib/types";
import { useLanguage } from "./LanguageProvider";

export function StageSwitch({
  roomSlug,
  currentStage,
  section,
}: {
  roomSlug: string;
  currentStage: StageKey;
  section: "vote" | "acts" | "live";
}) {
  const { getStageLabel } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2">
      {STAGE_OPTIONS.map((stage) => (
        <Link
          key={stage.key}
          href={`/${roomSlug}/${section}/${stage.key}`}
          className={`rounded-full px-4 py-2 text-sm transition ${
            currentStage === stage.key
              ? "bg-arenaSurfaceMax text-white shadow-glow"
              : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="label-copy flex items-center gap-2 uppercase tracking-[0.22em]">
            <span className="text-arenaPulse">{stage.eyebrow}</span>
            {getStageLabel(stage.key)}
          </span>
        </Link>
      ))}
    </div>
  );
}
