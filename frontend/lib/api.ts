import { io } from "socket.io-client";
import type {
  ActEntry,
  AdminRoomSnapshot,
  AdminSessionPayload,
  AdminUserEntry,
  AccountProfile,
  ActsPayload,
  AuthSessionPayload,
  BoardKey,
  LeaderboardEntry,
  PublicDisplayMode,
  RoomDetails,
  RoomSummary,
  SeasonStatsPayload,
  StageKey,
  StageResultsPayload,
} from "./types";

export function getApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

async function readJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBase()}${path}`, {
    credentials: "include",
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${path} (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBase()}${path}`, {
    credentials: "include",
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Request failed: ${path} (${response.status})`);
  }
  return payload as T;
}

export async function fetchRooms() {
  return readJson<{ defaultRoom: string; rooms: RoomSummary[] }>("/api/rooms");
}

export async function fetchRoom(roomSlug: string) {
  return readJson<RoomDetails>(`/api/room/${roomSlug}`);
}

export async function fetchActs(roomSlug: string, stageKey: StageKey) {
  return readJson<ActsPayload>(
    `/api/acts?room=${roomSlug}&stage=${stageKey}`,
  );
}

export async function fetchStageResults(roomSlug: string, stageKey: StageKey) {
  return readJson<StageResultsPayload>(`/api/results?room=${roomSlug}&stage=${stageKey}`);
}

export async function fetchSeasonStats(roomSlug: string) {
  return readJson<SeasonStatsPayload>(`/api/stats/season?room=${roomSlug}`);
}

export async function fetchLeaderboard(roomSlug: string, boardKey: BoardKey = "overall") {
  const stageQuery = boardKey === "overall" ? "" : `&stage=${boardKey}`;
  return readJson<LeaderboardEntry[]>(`/api/leaderboard?room=${roomSlug}${stageQuery}`);
}

export async function fetchSessionAccount() {
  return readJson<AuthSessionPayload>("/api/auth/session");
}

export async function fetchAdminSession() {
  return readJson<AdminSessionPayload>("/api/admin/session");
}

export async function loginAdminSession(payload: {
  key?: string;
  email?: string;
  password?: string;
}) {
  return sendJson<AdminSessionPayload>("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function logoutAdminSession() {
  return sendJson<{ ok: true }>("/api/admin/logout", {
    method: "POST",
  });
}

export async function fetchAdminRoomState(roomSlug: string) {
  return readJson<AdminRoomSnapshot>(`/api/admin/room-state?room=${roomSlug}`);
}

export async function fetchAdminUsers(roomSlug: string) {
  return readJson<AdminUserEntry[]>(`/api/users?room=${roomSlug}`);
}

export async function updateAdminScoring(roomSlug: string, scoringProfile: string) {
  return sendJson<{ roomSlug: string; scoringProfile: string; scoringProfiles: AdminSessionPayload["scoringProfiles"] }>("/api/admin/scoring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomSlug, scoringProfile }),
  });
}

export async function toggleStageWindow(roomSlug: string, stage: StageKey, open: boolean) {
  return sendJson<{ roomSlug: string; stage: StageKey; open: boolean; predictionWindows: Record<StageKey, boolean> }>("/api/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomSlug, stage, open }),
  });
}

export async function publishStageResults(payload: {
  roomSlug: string;
  stage: StageKey;
  ranking: string[];
  breakdown: Array<{ code: string; jury: number; tele: number; total: number }>;
}) {
  return sendJson<{ ok: true; roomSlug: string; stage: StageKey; updated: number }>("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function resetParticipant(roomSlug: string, accountId: string, stage?: StageKey) {
  return sendJson<{ reset: string; roomSlug: string; stage?: StageKey | null }>(`/api/users/${accountId}/reset?room=${roomSlug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stage ? { stage } : {}),
  });
}

export async function removeParticipant(roomSlug: string, accountId: string) {
  return sendJson<{ removed: string; roomSlug: string }>(`/api/users/${accountId}?room=${roomSlug}`, {
    method: "DELETE",
  });
}

export async function restoreParticipant(roomSlug: string, accountId: string) {
  return sendJson<{ restored: string; roomSlug: string }>(`/api/users/${accountId}/restore?room=${roomSlug}`, {
    method: "POST",
  });
}

export async function resetRoomState(roomSlug: string) {
  return sendJson<{ ok: true; roomSlug: string }>("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomSlug }),
  });
}

export async function fetchCurrentAccount() {
  return readJson<{ account: AccountProfile }>("/api/me");
}

export async function registerAccount(payload: {
  roomSlug?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  emoji: string;
  publicDisplayMode: PublicDisplayMode;
  publicDisplayOptIn: boolean;
  privacyAccepted: boolean;
}) {
  return sendJson<{ account: AccountProfile; roomSlug?: string | null }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function loginAccount(payload: {
  roomSlug?: string;
  email: string;
  password: string;
}) {
  return sendJson<{ account: AccountProfile; roomSlug?: string | null }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function logoutAccount() {
  return sendJson<{ ok: true }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function requestPasswordReset(email: string) {
  return sendJson<{ ok: true; deliveryMode: "preview" | "email"; message?: string; previewResetToken?: string; previewResetUrl?: string }>("/api/auth/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return sendJson<{ ok: true; account: AccountProfile }>("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

export async function changePassword(currentPassword: string, nextPassword: string) {
  return sendJson<{ ok: true }>("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, nextPassword }),
  });
}

export async function updateAccountProfile(payload: {
  firstName: string;
  lastName: string;
  displayName: string;
  emoji: string;
  publicDisplayMode: PublicDisplayMode;
  publicDisplayOptIn: boolean;
}) {
  return sendJson<{ account: AccountProfile }>("/api/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadAccountAvatar(imageDataUrl: string) {
  return sendJson<{ account: AccountProfile }>("/api/account/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  });
}

export async function deleteAccountAvatar() {
  return sendJson<{ account: AccountProfile }>("/api/account/avatar", {
    method: "DELETE",
  });
}

export async function deleteAccount() {
  return sendJson<{ ok: true }>("/api/account", {
    method: "DELETE",
  });
}

export async function joinRoom(roomSlug: string) {
  return sendJson<{ ok: true; roomSlug: string }> (`/api/rooms/${roomSlug}/join`, {
    method: "POST",
  });
}

export async function fetchMyPrediction(roomSlug: string, stageKey: StageKey) {
  return readJson<{ roomSlug: string; stage: StageKey; ranking: string[]; locked: boolean }>(
    `/api/predictions/me?room=${roomSlug}&stage=${stageKey}`,
  );
}

export async function submitMyPrediction(roomSlug: string, stageKey: StageKey, ranking: string[]) {
  return sendJson<{ ok: true; roomSlug: string; stage: StageKey; locked: boolean }>("/api/predictions/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomSlug,
      stage: stageKey,
      ranking,
      lock: true,
    }),
  });
}

export function createRoomSocket(roomSlug: string) {
  return io(getApiBase(), {
    auth: { roomSlug },
    transports: ["websocket", "polling"],
  });
}
