import type { ActNote, StageKey, StoredUser } from "./types";

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

export function loadNotes(roomSlug: string, stageKey: StageKey) {
  if (typeof window === "undefined") return {};
  return safeJsonParse<Record<string, ActNote>>(
    window.localStorage.getItem(notesStorageKey(roomSlug, stageKey)),
    {},
  );
}

export function saveNotes(roomSlug: string, stageKey: StageKey, notes: Record<string, ActNote>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notesStorageKey(roomSlug, stageKey), JSON.stringify(notes));
}
