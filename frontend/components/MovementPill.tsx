'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export function MovementPill({ delta, compact = false }: { delta: number | null; compact?: boolean }) {
  const { copy } = useLanguage();
  const baseClass = compact
    ? "px-1.5 py-0.5 text-[9px] tracking-[0.16em]"
    : "px-3 py-1.5 text-[10px] tracking-[0.28em]";

  if (delta == null || delta === 0) {
    return (
      <span className={`show-chip ${baseClass} uppercase text-arenaMuted`}>
        <Minus size={compact ? 10 : 12} />
        {compact ? "0" : copy.movement.steady}
      </span>
    );
  }

  const positive = delta > 0;
  return (
    <span
      className={`show-chip ${baseClass} uppercase ${
        positive ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-200" : "border-rose-300/20 bg-rose-400/15 text-rose-200"
      }`}
    >
      {positive ? <ArrowUpRight size={compact ? 10 : 12} /> : <ArrowDownRight size={compact ? 10 : 12} />}
      {compact ? `${positive ? "+" : "-"}${Math.abs(delta)}` : positive ? copy.movement.up(delta) : copy.movement.down(Math.abs(delta))}
    </span>
  );
}
