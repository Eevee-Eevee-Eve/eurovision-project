'use client';

import type { ActEntry } from "../lib/types";
import { resolveMediaUrl } from "../lib/media";
import { useLanguage } from "./LanguageProvider";

type ActPosterMode = "compact" | "card" | "hero";

export function ActPoster({
  act,
  compact = false,
  mode,
  contentDensity = "default",
}: {
  act: ActEntry;
  compact?: boolean;
  mode?: ActPosterMode;
  contentDensity?: "default" | "compact";
}) {
  const { getCountryName } = useLanguage();
  const resolvedMode = mode || (compact ? "compact" : "card");
  const isCompact = resolvedMode === "compact";
  const isHero = resolvedMode === "hero";
  const isCard = resolvedMode === "card";
  const isDense = contentDensity === "compact";
  const frameClass = isCompact
    ? "h-14 w-14 rounded-[1.2rem]"
    : isHero
      ? "aspect-[1.26/1] w-full rounded-[2rem]"
      : "h-28 w-24 rounded-[1.6rem]";
  const initialsClass = isCompact ? "text-base" : isHero ? "text-6xl md:text-7xl" : "text-[2rem]";
  const badgeClass = isCompact ? "px-2 py-1 text-[9px]" : isHero ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]";
  const flagSize = isCompact ? "h-6 w-6" : isHero ? "h-12 w-12" : "h-9 w-9";
  const showRunningOrder = typeof act.runningOrder === "number";
  const runningBadge = showRunningOrder ? `#${act.runningOrder}` : null;
  const resolvedPhotoUrl = resolveMediaUrl(act.photoUrl);
  const resolvedFlagUrl = resolveMediaUrl(act.flagUrl);
  const hasPhoto = Boolean(resolvedPhotoUrl);
  const countryName = getCountryName(act.code, act.country);

  return (
    <div
      className={`${frameClass} relative isolate shrink-0 overflow-hidden p-[1px] shadow-glow`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${act.portrait.primary}, ${act.portrait.secondary})`,
      }}
    >
      <div
        className={`relative h-full w-full overflow-hidden bg-arenaSurface ${
          isCompact ? "rounded-[1.15rem] p-2.5" : isHero ? "rounded-[1.95rem] p-4 md:p-5" : "rounded-[1.55rem] p-3"
        }`}
      >
        {hasPhoto ? (
          <img
            src={resolvedPhotoUrl || undefined}
            alt={`${act.artist} portrait`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div
          className={`absolute inset-0 ${hasPhoto ? "opacity-100" : "opacity-90"}`}
          style={{
            backgroundImage: [
              `radial-gradient(circle at 14% 18%, ${act.portrait.primary}${hasPhoto ? "1c" : "66"}, transparent 28%)`,
              `radial-gradient(circle at 82% 20%, ${act.portrait.secondary}${hasPhoto ? "24" : "7a"}, transparent 24%)`,
              `linear-gradient(140deg, ${act.portrait.primary}${hasPhoto ? "0c" : "22"}, transparent 45%)`,
              hasPhoto
                ? "linear-gradient(0deg, rgba(8, 10, 22, 0.1), rgba(8, 10, 22, 0.38))"
                : "linear-gradient(0deg, rgba(8, 10, 22, 0.12), rgba(8, 10, 22, 0.88))",
            ].join(", "),
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-20" />
        {!isCompact ? (
          <div className="absolute inset-x-6 top-0 h-20 rounded-b-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)] blur-2xl" />
        ) : null}
        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(8,10,22,0.42))]" />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            {isHero ? (
              <div className="flex min-w-0 items-center gap-2">
                <div className={`${flagSize} shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_0_18px_rgba(0,0,0,0.2)]`}>
                  <img
                    src={resolvedFlagUrl || undefined}
                    alt={countryName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className={`inline-flex min-w-0 max-w-[16rem] rounded-full border border-white/10 bg-black/15 text-arenaText ${badgeClass}`}>
                  <span className="truncate">{countryName}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!isCompact ? (
                  <div className={`${flagSize} overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_0_18px_rgba(0,0,0,0.2)]`}>
                    <img
                      src={resolvedFlagUrl || undefined}
                      alt={countryName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isCompact && runningBadge ? (
                <span className={`inline-flex rounded-full border border-white/10 bg-black/15 text-arenaText ${badgeClass}`}>
                  {runningBadge}
                </span>
              ) : isCompact ? (
                <div className={`${flagSize} overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_0_18px_rgba(0,0,0,0.2)]`}>
                  <img
                    src={resolvedFlagUrl || undefined}
                    alt={countryName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative">
            {!isCompact && !hasPhoto ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="display-copy text-[5rem] font-black tracking-[-0.12em] text-white/[0.05] md:text-[7rem]">
                  {act.portrait.initials}
                </span>
              </div>
            ) : null}
            {!hasPhoto ? (
              <div className={`display-copy relative font-black tracking-[-0.08em] text-arenaText ${initialsClass}`}>
                {act.portrait.initials}
              </div>
            ) : null}
          </div>

          {!isCompact ? (
            <div className="space-y-2">
              <div
                className={`rounded-[1.1rem] border border-white/10 bg-black/15 px-3 py-2 backdrop-blur-sm ${
                  isHero
                    ? isDense
                      ? "h-[5.1rem] md:h-[5.5rem]"
                      : "h-[5.9rem] md:h-[6.4rem]"
                    : isCard
                      ? "h-[4.25rem]"
                      : ""
                }`}
              >
                <p
                  className={`overflow-hidden font-semibold leading-[0.95] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                    isHero ? (isDense ? "text-[1.9rem] md:text-[2.15rem]" : "text-2xl md:text-[2rem]") : "text-sm"
                  }`}
                >
                  {act.artist}
                </p>
                <p
                  className={`mt-2 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] text-arenaMuted ${
                    isHero ? (isDense ? "text-sm" : "text-base") : "text-xs"
                  }`}
                >
                  {act.song}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
