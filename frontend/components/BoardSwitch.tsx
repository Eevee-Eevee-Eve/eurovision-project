'use client';

import Link from "next/link";
import { BOARD_OPTIONS } from "../lib/rooms";
import type { BoardKey } from "../lib/types";
import { useLanguage } from "./LanguageProvider";

export function BoardSwitch({
  roomSlug,
  currentBoard,
}: {
  roomSlug: string;
  currentBoard: BoardKey;
}) {
  const { getBoardLabel } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2">
      {BOARD_OPTIONS.map((board) => (
        <Link
          key={board.key}
          href={`/${roomSlug}/players/${board.key}`}
          className={`rounded-full px-4 py-2 text-sm transition ${
            currentBoard === board.key
              ? "bg-arenaSurfaceMax text-white shadow-glow"
              : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="label-copy uppercase tracking-[0.22em]">{getBoardLabel(board.key)}</span>
        </Link>
      ))}
    </div>
  );
}
