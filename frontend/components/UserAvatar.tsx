'use client';

import type { AvatarTheme } from "../lib/types";
import { resolveMediaUrl } from "../lib/media";

export function UserAvatar({
  name,
  avatarUrl,
  avatarTheme,
  className = "h-12 w-12",
  textClass = "text-base",
}: {
  name: string;
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
    </div>
  );
}
