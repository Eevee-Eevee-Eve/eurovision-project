import type { BoardKey, RoomSummary, StageKey } from "./types";

export const STAGE_OPTIONS: { key: StageKey; label: string; eyebrow: string }[] = [
  { key: "semi1", label: "Semi-final 1", eyebrow: "SF1" },
  { key: "semi2", label: "Semi-final 2", eyebrow: "SF2" },
  { key: "final", label: "Grand Final", eyebrow: "Final" },
];

export const BOARD_OPTIONS: { key: BoardKey; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "semi1", label: "SF1" },
  { key: "semi2", label: "SF2" },
  { key: "final", label: "Final" },
];

export const FALLBACK_ROOM: RoomSummary = {
  slug: "neon-arena",
  name: "Евровидение у Морозовых 2026",
  tagline: "Евровидение у Морозовых 2026",
  cityLabel: "Общий эфир из разных городов",
  seasonYear: 2026,
  seasonLabel: "Евровидение у Морозовых 2026",
  defaultStage: "semi1",
};

export function getStageLabel(stageKey: StageKey) {
  return STAGE_OPTIONS.find((stage) => stage.key === stageKey)?.label || stageKey;
}

export function getBoardLabel(boardKey: BoardKey) {
  return BOARD_OPTIONS.find((board) => board.key === boardKey)?.label || boardKey;
}

export function isStageKey(value: string): value is StageKey {
  return STAGE_OPTIONS.some((stage) => stage.key === value);
}

export function isBoardKey(value: string): value is BoardKey {
  return BOARD_OPTIONS.some((board) => board.key === value);
}
