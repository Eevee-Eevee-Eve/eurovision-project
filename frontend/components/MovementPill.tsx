'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export function MovementPill({ delta }: { delta: number | null }) {
  const { copy } = useLanguage();

  if (delta == null || delta === 0) {
    return (
      <span className="show-chip px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-arenaMuted">
        <Minus size={12} />
        {copy.movement.steady}
      </span>
    );
  }

  const positive = delta > 0;
  return (
    <span
      className={`show-chip px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] ${
        positive ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-200" : "border-rose-300/20 bg-rose-400/15 text-rose-200"
      }`}
    >
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {positive ? copy.movement.up(delta) : copy.movement.down(Math.abs(delta))}
    </span>
  );
}
