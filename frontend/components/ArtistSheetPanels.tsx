import { PlayCircle } from "lucide-react";
import { resolveMediaUrl } from "../lib/media";
import type { ActEntry } from "../lib/types";

export function ArtistCountryBadge({
  countryName,
  flagUrl,
  compact = false,
  className = "",
}: {
  countryName: string;
  flagUrl: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] font-medium text-white/92 ${
        compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } ${className}`}
    >
      <span
        className={`shrink-0 overflow-hidden rounded-[0.45rem] border border-white/10 bg-white/10 ${
          compact ? "h-4 w-4" : "h-5 w-5"
        }`}
      >
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

export function ArtistVideoPanel({
  href,
  title,
  hint,
}: {
  href: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="show-panel p-3.5 md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 line-clamp-1 text-[13px] text-arenaMuted md:text-sm">{hint}</p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="arena-button-secondary inline-flex h-10 shrink-0 items-center justify-center gap-2 px-4 text-sm md:h-11"
        >
          <PlayCircle size={16} />
          {title}
        </a>
      </div>
    </div>
  );
}

export function ArtistAboutPanel({
  act,
  title,
  facts,
  fallbackBlurb,
}: {
  act: ActEntry;
  title: string;
  facts: string[];
  fallbackBlurb: string;
}) {
  const resolvedPhotoUrl = resolveMediaUrl(act.photoUrl);
  const aboutRows = (facts.length ? facts : [fallbackBlurb]).map((row) =>
    row
      .replace(/\s*[—–]\s*/g, " - ")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );

  return (
    <section className="show-panel overflow-hidden p-0">
      <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div className="relative aspect-[1.24/1] min-h-[14rem] overflow-hidden border-b border-white/8 bg-arenaSurface md:aspect-auto md:min-h-full md:border-b-0 md:border-r">
          {resolvedPhotoUrl ? (
            <img
              src={resolvedPhotoUrl || undefined}
              alt={act.artist}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}

          <div
            className={`absolute inset-0 ${resolvedPhotoUrl ? "opacity-100" : "opacity-95"}`}
            style={{
              backgroundImage: [
                `radial-gradient(circle at 16% 18%, ${act.portrait.primary}${resolvedPhotoUrl ? "22" : "70"}, transparent 28%)`,
                `radial-gradient(circle at 82% 20%, ${act.portrait.secondary}${resolvedPhotoUrl ? "28" : "78"}, transparent 26%)`,
                `linear-gradient(180deg, rgba(8, 10, 22, 0.08), rgba(8, 10, 22, 0.52))`,
                `linear-gradient(135deg, ${act.portrait.primary}${resolvedPhotoUrl ? "08" : "20"}, ${act.portrait.secondary}${resolvedPhotoUrl ? "10" : "26"})`,
              ].join(", "),
            }}
          />

          {!resolvedPhotoUrl ? (
            <div className="relative flex h-full items-center justify-center p-6">
              <span className="display-copy text-[4.5rem] font-black tracking-[-0.1em] text-white/12 md:text-[5.6rem]">
                {act.portrait.initials}
              </span>
            </div>
          ) : null}
        </div>

        <div className="p-4 md:p-5">
          <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{title}</p>
          <div className="mt-4 grid gap-3">
            {aboutRows.map((fact) => (
              <p key={`${act.code}-${fact}`} className="text-sm leading-7 text-arenaMuted">
                {fact}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
