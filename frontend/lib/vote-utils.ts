import type { ActEntry, ActNote, NoteTone } from "./types";

export const NOTE_TONES: { key: NoteTone; label: string; hint: string }[] = [
  { key: "favorite", label: "Favorite", hint: "Strong contender" },
  { key: "winner", label: "Winner", hint: "Feels like a winner" },
  { key: "vocals", label: "Vocals", hint: "Voice stood out" },
  { key: "staging", label: "Staging", hint: "Staging stands out" },
  { key: "song", label: "Song", hint: "Song sticks with me" },
  { key: "energy", label: "Energy", hint: "Brings strong energy" },
  { key: "memorable", label: "Memorable", hint: "Hard to forget" },
  { key: "skip", label: "Skip", hint: "Not landing for me" },
];

export function getNoteTags(note?: ActNote | null): NoteTone[] {
  if (!note) return [];

  const tags = new Set<NoteTone>();
  if (Array.isArray(note.tones)) {
    note.tones.forEach((tone) => {
      if (NOTE_TONES.some((entry) => entry.key === tone)) {
        tags.add(tone);
      }
    });
  }

  if (note.tone && NOTE_TONES.some((entry) => entry.key === note.tone)) {
    tags.add(note.tone);
  }

  return Array.from(tags);
}

export function createDefaultRanking(acts: ActEntry[]) {
  return acts
    .slice()
    .sort((left, right) => {
      const leftOrder = left.runningOrder ?? left.seedOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.runningOrder ?? right.seedOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.country.localeCompare(right.country, "en");
    })
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
  return Boolean(note && (getNoteTags(note).length || note.text.trim()));
}

export function getNoteSummary(note?: ActNote | null) {
  if (!hasNote(note)) return "No notes yet";
  if (note?.text.trim()) return note.text.trim();
  const hints = getNoteTags(note)
    .map((tone) => NOTE_TONES.find((entry) => entry.key === tone)?.hint)
    .filter(Boolean);
  return hints.join(", ") || "Noted";
}

export function getToneLabel(tone?: NoteTone | null) {
  return NOTE_TONES.find((entry) => entry.key === tone)?.label || "Notes";
}
