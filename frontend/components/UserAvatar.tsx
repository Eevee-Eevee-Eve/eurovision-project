'use client';

import type { AvatarTheme } from "../lib/types";
import { resolveMediaUrl } from "../lib/media";

export function UserAvatar({
  name,
  emoji,
  avatarUrl,
  avatarTheme,
  className = "h-12 w-12",
  textClass = "text-base",
}: {
  name: string;
  emoji?: string;
  avatarUrl?: string | null;
  avatarTheme?: AvatarTheme | null;
  className?: string;
  textClass?: string;
}) {
  const theme = avatarTheme || {
    primary: "#ff6ca8",
    secondary: "#7f5cff",
    initials: (name || "NA").slice(0, 2).toUpperCase(),
  };
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  return (
    <div
      className={`show-avatar relative overflow-hidden rounded-full ${className}`}
      style={{
        backgroundImage: resolvedAvatarUrl
          ? undefined
          : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
      }}
    >
      {resolvedAvatarUrl ? (
        <img
          src={resolvedAvatarUrl}
          alt={`${name} avatar`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={`display-copy font-black tracking-[-0.08em] text-white ${textClass}`}>
          {theme.initials}
        </span>
      )}
      {emoji ? (
        <span className="absolute -bottom-1 -right-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/15 bg-arenaSurfaceHi px-1.5 text-[10px] font-semibold text-white shadow-glow">
          {emoji}
        </span>
      ) : null}
    </div>
  );
}
