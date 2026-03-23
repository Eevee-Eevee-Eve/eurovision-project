import type { ActEntry, ActNote, NoteTone } from "./types";

export const NOTE_TONES: { key: NoteTone; label: string; hint: string }[] = [
  { key: "favorite", label: "Favorite", hint: "Strong contender" },
  { key: "watch", label: "Watch", hint: "Keep an eye on this act" },
  { key: "vocals", label: "Vocals", hint: "Voice stood out" },
  { key: "skip", label: "Skip", hint: "Not landing for me" },
];

export function createDefaultRanking(acts: ActEntry[]) {
  return acts
    .slice()
    .sort((left, right) => left.runningOrder - right.runningOrder)
    .map((act) => act.code);
}

export function normalizeRanking(acts: ActEntry[], ranking: string[]) {
  const validCodes = new Set(acts.map((act) => act.code));
  const seen = new Set<string>();
  const clean = ranking.filter((code) => {
    if (!validCodes.has(code) || seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  const missing = createDefaultRanking(acts).filter((code) => !seen.has(code));
  return [...clean, ...missing];
}

export function moveCodeToIndex(ranking: string[], code: string, nextIndex: number) {
  const currentIndex = ranking.indexOf(code);
  if (currentIndex === -1) return ranking;

  const boundedIndex = Math.max(0, Math.min(nextIndex, ranking.length - 1));
  const nextRanking = ranking.slice();
  nextRanking.splice(currentIndex, 1);
  nextRanking.splice(boundedIndex, 0, code);
  return nextRanking;
}

export function moveCodeBy(ranking: string[], code: string, delta: number) {
  const currentIndex = ranking.indexOf(code);
  if (currentIndex === -1) return ranking;
  return moveCodeToIndex(ranking, code, currentIndex + delta);
}

export function hasNote(note?: ActNote | null) {
  return Boolean(note && (note.tone || note.text.trim()));
}

export function getNoteSummary(note?: ActNote | null) {
  if (!hasNote(note)) return "No notes yet";
  if (note?.text.trim()) return note.text.trim();
  return NOTE_TONES.find((tone) => tone.key === note?.tone)?.hint || "Noted";
}

export function getToneLabel(tone?: NoteTone | null) {
  return NOTE_TONES.find((entry) => entry.key === tone)?.label || "Notes";
}
