import type { ActNote, StageKey, StoredUser } from "./types";

const ALLOWED_NOTE_TONES = new Set([
  "favorite",
  "winner",
  "vocals",
  "staging",
  "song",
  "energy",
  "memorable",
  "skip",
]);

function safeJsonParse<T>(raw: string | null, fallback: T) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function userStorageKey(roomSlug: string) {
  return `esc-room-user:${roomSlug}`;
}

export function rankingStorageKey(roomSlug: string, stageKey: StageKey) {
  return `esc-room-ranking:${roomSlug}:${stageKey}`;
}

export function rankingPlacedActsKey(roomSlug: string, stageKey: StageKey) {
  return `esc-room-ranking-placed:${roomSlug}:${stageKey}`;
}

export function notesStorageKey(roomSlug: string, stageKey: StageKey) {
  return `esc-room-notes:${roomSlug}:${stageKey}`;
}

export function loadUser(roomSlug: string) {
  if (typeof window === "undefined") return null;
  return safeJsonParse<StoredUser | null>(window.localStorage.getItem(userStorageKey(roomSlug)), null);
}

export function saveUser(roomSlug: string, user: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userStorageKey(roomSlug), JSON.stringify(user));
}

export function loadRanking(roomSlug: string, stageKey: StageKey) {
  if (typeof window === "undefined") return [];
  return safeJsonParse<string[]>(window.localStorage.getItem(rankingStorageKey(roomSlug, stageKey)), []);
}

export function saveRanking(roomSlug: string, stageKey: StageKey, ranking: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rankingStorageKey(roomSlug, stageKey), JSON.stringify(ranking));
}

export function loadPlacedActs(roomSlug: string, stageKey: StageKey) {
  if (typeof window === "undefined") return [];
  return safeJsonParse<string[]>(
    window.localStorage.getItem(rankingPlacedActsKey(roomSlug, stageKey)),
    [],
  ).filter((code): code is string => typeof code === "string" && code.trim().length > 0);
}

export function savePlacedActs(roomSlug: string, stageKey: StageKey, placedActs: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rankingPlacedActsKey(roomSlug, stageKey), JSON.stringify(placedActs));
}

export function clearRanking(roomSlug: string, stageKey: StageKey) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(rankingStorageKey(roomSlug, stageKey));
  window.localStorage.removeItem(rankingPlacedActsKey(roomSlug, stageKey));
}

export function loadNotes(roomSlug: string, stageKey: StageKey) {
  if (typeof window === "undefined") return {};
  const rawNotes = safeJsonParse<Record<string, Partial<ActNote>>>(
    window.localStorage.getItem(notesStorageKey(roomSlug, stageKey)),
    {},
  );

  return Object.entries(rawNotes).reduce<Record<string, ActNote>>((acc, [code, note]) => {
    const tones = Array.isArray(note?.tones)
      ? note.tones.filter((tone): tone is ActNote["tones"][number] => typeof tone === "string" && ALLOWED_NOTE_TONES.has(tone))
      : [];

    if (typeof note?.tone === "string" && ALLOWED_NOTE_TONES.has(note.tone)) {
      tones.push(note.tone);
    }

    acc[code] = {
      tones: Array.from(new Set(tones)),
      text: typeof note?.text === "string" ? note.text : "",
    };

    return acc;
  }, {});
}

export function saveNotes(roomSlug: string, stageKey: StageKey, notes: Record<string, ActNote>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notesStorageKey(roomSlug, stageKey), JSON.stringify(notes));
}
