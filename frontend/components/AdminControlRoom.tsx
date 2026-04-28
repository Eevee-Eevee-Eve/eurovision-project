'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Clock3, KeyRound, Lock, LogOut, MonitorPlay, RefreshCw, RotateCcw, Settings2, ShieldCheck, Trophy, Unlock, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createRoomSocket,
  fetchActs,
  fetchAdminRoomState,
  grantParticipantSubmissionOverride,
  fetchAdminSession,
  fetchAdminUsers,
  fetchStageResults,
  loginAdminSession,
  logoutAdminSession,
  publishStageResults,
  removeParticipant,
  revokeParticipantSubmissionOverride,
  resetParticipant,
  resetRoomState,
  restoreParticipant,
  startStageCountdown,
  stopStageCountdown,
  toggleStageWindow,
  updateAdminShowState,
  updateAdminScoring,
} from "../lib/api";
import { STAGE_OPTIONS } from "../lib/rooms";
import type { ActEntry, AdminRoomSnapshot, AdminSessionPayload, AdminUserEntry, RoomSummary, ShowHighlightMode, StageKey } from "../lib/types";
import { ActPoster } from "./ActPoster";
import { BrandLogo } from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

type EditableResultRow = ActEntry & {
  place: string;
  jury: string;
  tele: string;
  total: string;
};

type DraftMemory = Record<string, { place: string; jury: string; tele: string; total: string }>;

function isStageKey(value: string | null): value is StageKey {
  return value === "semi1" || value === "semi2" || value === "final";
}

function toNumericString(value: string) {
  return value.replace(/[^\d]/g, "");
}

function rowToNumber(value: string) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSemiStageValue(stageKey: StageKey) {
  return stageKey === "semi1" || stageKey === "semi2";
}

function hasPlacement(row: { place: string }) {
  return row.place !== "";
}

function hasScoreData(row: { jury: string; tele: string; total: string }) {
  return row.jury !== "" || row.tele !== "" || row.total !== "";
}

function hasRowData(row: { place: string; jury: string; tele: string; total: string }) {
  return hasPlacement(row) || hasScoreData(row);
}

function sortResultRows(rows: EditableResultRow[], stageKey: StageKey) {
  const semiStage = isSemiStageValue(stageKey);
  return [...rows].sort((left, right) => {
    const leftHas = hasRowData(left);
    const rightHas = hasRowData(right);
    if (leftHas !== rightHas) {
      return leftHas ? -1 : 1;
    }

    if (semiStage) {
      const leftHasPlace = hasPlacement(left);
      const rightHasPlace = hasPlacement(right);
      if (leftHasPlace !== rightHasPlace) {
        return leftHasPlace ? -1 : 1;
      }
      if (leftHasPlace && rightHasPlace) {
        const leftPlace = rowToNumber(left.place);
        const rightPlace = rowToNumber(right.place);
        if (leftPlace !== rightPlace) {
          return leftPlace - rightPlace;
        }
      }
    }

    const totalDiff = rowToNumber(right.total) - rowToNumber(left.total);
    if (totalDiff) return totalDiff;
    const juryDiff = rowToNumber(right.jury) - rowToNumber(left.jury);
    if (juryDiff) return juryDiff;
    const teleDiff = rowToNumber(right.tele) - rowToNumber(left.tele);
    if (teleDiff) return teleDiff;

    const leftOrder = left.runningOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.runningOrder ?? Number.MAX_SAFE_INTEGER;
    if (!leftHas && !rightHas && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.country.localeCompare(right.country, "ru");
  });
}

function draftStorageKey(roomSlug: string, stageKey: StageKey) {
  return `admin_results_${roomSlug}_${stageKey}`;
}

function readDraft(roomSlug: string, stageKey: StageKey): DraftMemory | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(draftStorageKey(roomSlug, stageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftMemory;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function clearDraft(roomSlug: string, stageKey: StageKey) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(draftStorageKey(roomSlug, stageKey));
  }
}

function writeDraft(roomSlug: string, stageKey: StageKey, rows: EditableResultRow[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = rows.reduce<DraftMemory>((acc, row) => {
    acc[row.code] = {
      place: row.place,
      jury: row.jury,
      tele: row.tele,
      total: row.total,
    };
    return acc;
  }, {});

  window.localStorage.setItem(draftStorageKey(roomSlug, stageKey), JSON.stringify(payload));
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildEditableRows(acts: ActEntry[], publishedRows: ActEntry[], roomSlug: string, stageKey: StageKey, preferPublished = false) {
  const publishedMap = publishedRows.reduce<Record<string, { place: string; jury: string; tele: string; total: string }>>((acc, row) => {
    acc[row.code] = {
      place: row.rank == null ? "" : String(row.rank),
      jury: row.juryPoints == null ? "" : String(row.juryPoints),
      tele: row.telePoints == null ? "" : String(row.telePoints),
      total: row.totalPoints == null ? "" : String(row.totalPoints),
    };
    return acc;
  }, {});
  const draft = preferPublished ? null : readDraft(roomSlug, stageKey);

  const rows = acts.map((act) => {
    const memory = draft?.[act.code] || publishedMap[act.code] || { place: "", jury: "", tele: "", total: "" };
    return {
      ...act,
      place: memory.place || "",
      jury: memory.jury,
      tele: memory.tele,
      total: memory.total,
    };
  });

  return sortResultRows(rows, stageKey);
}

export function AdminControlRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, getDisplayName, getRoomName, getStageLabel } = useLanguage();
  const [booting, setBooting] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [scoringProfiles, setScoringProfiles] = useState<AdminSessionPayload["scoringProfiles"]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedStage, setSelectedStage] = useState<StageKey>("semi1");
  const [snapshot, setSnapshot] = useState<AdminRoomSnapshot | null>(null);
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [rows, setRows] = useState<EditableResultRow[]>([]);
  const [adminKey, setAdminKey] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showStatusDraft, setShowStatusDraft] = useState("");
  const [showCurrentActCode, setShowCurrentActCode] = useState("");
  const [showHighlightMode, setShowHighlightMode] = useState<ShowHighlightMode | "">("");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [countdownConfirmOpen, setCountdownConfirmOpen] = useState(false);
  const [countdownChecks, setCountdownChecks] = useState({
    scope: false,
    deadline: false,
    manualRescue: false,
  });
  const [timeNow, setTimeNow] = useState(Date.now());

  const copy = useMemo(() => (
    language === "ru"
      ? {
          kicker: "Host Control Room",
          title: "Пульт Евровидения у Морозовых 2026",
          description: "Управляй окнами голосования по этапам, публикуй результаты, следи за игроками и держи сезон под контролем из одной панели.",
          loginTitle: "Админ-сессия",
          loginText: "Введи admin key, чтобы открыть control room. После входа сессия хранится в защищённой cookie браузера.",
          loginButton: "Открыть control room",
          keyPlaceholder: "Admin key",
          roomsLabel: "Комната",
          stageLabel: "Этап",
          scoringLabel: "Профиль очков",
          refreshButton: "Обновить",
          logoutButton: "Выйти",
          openStage: "Открыть этап",
          closeStage: "Закрыть этап",
          countdownTitle: "Обратный отсчёт",
          countdownStart: "Запустить 5 минут",
          countdownStop: "Остановить отсчёт",
          countdownActive: "До автозакрытия",
          countdownIdle: "Отсчёт пока не запущен",
          countdownText: "После нуля этап закроется автоматически для всех комнат.",
          countdownConfirmTitle: "Запустить обратный отсчёт?",
          countdownCheckScope: "Понимаю, что отсчёт пойдёт для всех комнат.",
          countdownCheckDeadline: "Понимаю, что в ноль этап закроется автоматически.",
          countdownCheckManual: "Понимаю, что опоздавшим потом нужен личный допуск.",
          countdownConfirmAction: "Запустить отсчёт",
          publishButton: "Опубликовать итоги",
          loadPublished: "Загрузить опубликованное",
          stageWindowOpen: "Окно голосования открыто",
          stageWindowClosed: "Окно голосования закрыто",
          roomStats: "Статус комнаты",
          participants: "Участники",
          removed: "Удалены",
          submitted: "Отправили",
          locked: "Зафиксировано",
          revealed: "Открыто результатов",
          lineup: "Лайнап",
          resultsDesk: "Пульт итогов",
          resultsDeskText: "Рейтинг сортируется по total, затем jury, затем tele. Для пустых строк сохраняется порядок выступления.",
          semiResultsDeskText: "Для полуфинала лучше ввести официальные места целиком. Очки жюри и телезрителей можно добавить позже, когда появится полная разбивка.",
          juryLabel: "Jury",
          teleLabel: "Tele",
          totalLabel: "Total",
          placeLabel: "Место",
          placeMissing: "Место пока не задано",
          semiPlaceRequired: "Для публикации полуфинала задай официальные места всем странам этого этапа.",
          semiPlaceUnique: "Места полуфинала должны быть уникальными и заполненными без пропусков.",
          qualifiedLabel: "Проходит в финал",
          outLabel: "Вне проходной зоны",
          noData: "Пока без данных",
          participantDesk: "Участники комнаты",
          participantDeskText: "Для каждого игрока можно отдельно сбросить текущий этап, очистить все этапы или временно убрать доступ к комнате.",
          resetStage: "Сбросить этап",
          resetAll: "Сбросить всё",
          grantLatePass: "Дать ещё 5 минут",
          extendLatePass: "Продлить ещё на 5 минут",
          revokeLatePass: "Снять допуск",
          latePassActive: "Личный допуск",
          removeUser: "Убрать из комнаты",
          restoreUser: "Вернуть доступ",
          removedState: "Удалён",
          activeState: "Активен",
          hardReset: "Полный сброс комнаты",
          hardResetText: "Очищает все бюллетени, опубликованные итоги и статусы этапов в выбранной комнате.",
          resetRoomButton: "Сбросить комнату",
          projector: "Проектор",
          playersBoard: "Таблица игроков",
          seasonStats: "Сезонная статистика",
          roomHub: "Хаб комнаты",
          authFailed: "Не удалось открыть admin-сессию.",
          reloadFailed: "Не удалось обновить данные комнаты.",
          publishedOk: "Итоги этапа опубликованы.",
          stageOpenOk: "Этап открыт для всех комнат.",
          stageCloseOk: "Этап закрыт для всех комнат.",
          countdownStartedOk: "Обратный отсчёт запущен для всех комнат.",
          countdownStoppedOk: "Обратный отсчёт остановлен.",
          scoringSaved: "Профиль начисления очков обновлён.",
          participantReset: (stage: StageKey | null) => stage ? `Ответы участника сброшены для ${getStageLabel(stage)}.` : "Ответы участника сброшены для всех этапов.",
          participantLatePassGranted: "Личный допуск открыт ещё на 5 минут.",
          participantLatePassRevoked: "Личный допуск снят.",
          participantRemoved: "Участник убран из комнаты.",
          participantRestored: "Доступ участника восстановлен.",
          roomResetDone: "Комната полностью сброшена.",
          confirmRoomReset: "Полностью очистить бюллетени, результаты и статусы этой комнаты?",
          socketLive: "Live sync активен",
          socketIdle: "Live sync через refresh",
        }
      : {
          kicker: "Host Control Room",
          title: "Morozov Eurovision 2026 Admin",
          description: "Manage stage-specific voting windows, publish results, monitor players, and keep the season under control from one dashboard.",
          loginTitle: "Admin session",
          loginText: "Enter the admin key to unlock the control room. After login, the session is stored in a secure browser cookie.",
          loginButton: "Open control room",
          keyPlaceholder: "Admin key",
          roomsLabel: "Room",
          stageLabel: "Stage",
          scoringLabel: "Scoring profile",
          refreshButton: "Refresh",
          logoutButton: "Log out",
          openStage: "Open stage",
          closeStage: "Close stage",
          countdownTitle: "Countdown",
          countdownStart: "Start 5-minute countdown",
          countdownStop: "Stop countdown",
          countdownActive: "Auto-close in",
          countdownIdle: "Countdown is not running yet",
          countdownText: "At zero the stage closes automatically for every room.",
          countdownConfirmTitle: "Start the closing countdown?",
          countdownCheckScope: "I understand the countdown will run for all rooms.",
          countdownCheckDeadline: "I understand the stage will auto-close at zero.",
          countdownCheckManual: "I understand late people will need a personal override afterwards.",
          countdownConfirmAction: "Start countdown",
          publishButton: "Publish results",
          loadPublished: "Load published",
          stageWindowOpen: "Voting window is open",
          stageWindowClosed: "Voting window is closed",
          roomStats: "Room status",
          participants: "Participants",
          removed: "Removed",
          submitted: "Submitted",
          locked: "Locked",
          revealed: "Revealed results",
          lineup: "Lineup",
          resultsDesk: "Results desk",
          resultsDeskText: "Ranking is sorted by total, then jury, then tele. Empty rows fall back to running order.",
          semiResultsDeskText: "For semi-finals, enter the official places first. Jury and televote splits can be added later when the full breakdown is available.",
          juryLabel: "Jury",
          teleLabel: "Tele",
          totalLabel: "Total",
          placeLabel: "Place",
          placeMissing: "Place is not set yet",
          semiPlaceRequired: "To publish a semi-final, set official places for every act in this stage.",
          semiPlaceUnique: "Semi-final places must be unique and filled without gaps.",
          qualifiedLabel: "Qualifies for the final",
          outLabel: "Outside the qualification zone",
          noData: "No points yet",
          participantDesk: "Room participants",
          participantDeskText: "For each player you can reset the current stage, clear all stages, or temporarily remove room access.",
          resetStage: "Reset stage",
          resetAll: "Reset all",
          grantLatePass: "Give 5 more minutes",
          extendLatePass: "Extend by 5 minutes",
          revokeLatePass: "Revoke access",
          latePassActive: "Personal access",
          removeUser: "Remove from room",
          restoreUser: "Restore access",
          removedState: "Removed",
          activeState: "Active",
          hardReset: "Full room reset",
          hardResetText: "Clears all ballots, published results, and stage statuses for the selected room.",
          resetRoomButton: "Reset room",
          projector: "Projector",
          playersBoard: "Players board",
          seasonStats: "Season stats",
          roomHub: "Room hub",
          authFailed: "Unable to open the admin session.",
          reloadFailed: "Unable to refresh room data.",
          publishedOk: "Stage results published.",
          stageOpenOk: "Stage opened for all rooms.",
          stageCloseOk: "Stage closed for all rooms.",
          countdownStartedOk: "Countdown started for all rooms.",
          countdownStoppedOk: "Countdown stopped.",
          scoringSaved: "Scoring profile updated.",
          participantReset: (stage: StageKey | null) => stage ? `Participant answers were reset for ${getStageLabel(stage)}.` : "Participant answers were reset for all stages.",
          participantLatePassGranted: "Personal submission access granted for 5 more minutes.",
          participantLatePassRevoked: "Personal submission access revoked.",
          participantRemoved: "Participant removed from the room.",
          participantRestored: "Participant access restored.",
          roomResetDone: "Room has been fully reset.",
          confirmRoomReset: "Clear ballots, published results, and stage states for this room?",
          socketLive: "Live sync active",
          socketIdle: "Live sync through refresh",
        }
  ), [getStageLabel, language]);

  const selectedRoomMeta = rooms.find((room) => room.slug === selectedRoom) || null;
  const selectedStageOverview = snapshot?.stageOverview[selectedStage];
  const selectedStageCountdown = snapshot?.submissionCountdowns?.[selectedStage] || null;
  const isSemiStage = isSemiStageValue(selectedStage);
  const qualificationCutoff = selectedStageOverview?.qualificationCutoff ?? null;
  const rankedRows = useMemo(() => sortResultRows(rows, selectedStage), [rows, selectedStage]);
  const activeRanking = useMemo(() => {
    return rankedRows.filter((row) => hasRowData(row)).reduce<Record<string, number>>((acc, row, index) => {
      const explicitPlace = isSemiStage && hasPlacement(row) ? rowToNumber(row.place) : index + 1;
      if (explicitPlace > 0) {
        acc[row.code] = explicitPlace;
      }
      return acc;
    }, {});
  }, [isSemiStage, rankedRows]);
  const resultsDeskText = isSemiStage ? copy.semiResultsDeskText : copy.resultsDeskText;
  const countdownRemainingMs = selectedStageCountdown
    ? Math.max(0, new Date(selectedStageCountdown.endsAt).getTime() - timeNow)
    : 0;
  const countdownLabel = selectedStageCountdown ? formatCountdown(countdownRemainingMs) : null;
  const countdownChecksReady = countdownChecks.scope && countdownChecks.deadline && countdownChecks.manualRescue;
  const showCopy = useMemo(() => (
    language === "ru"
      ? {
          desk: "Эфирный сценарий",
          deskText: "Здесь выбирается, что именно должно выделяться на большом экране во время шоу.",
          statusLabel: "Статус в эфире",
          currentActLabel: "Текущий артист",
          highlightLabel: "Режим подсветки",
          saved: "Эфирный сценарий обновлён.",
          saveButton: "Обновить эфир",
          none: "Без акцента",
          stage: "Акцент на этапе",
          currentAct: "Акцент на текущем артисте",
          results: "Акцент на итогах",
          players: "Акцент на таблице друзей",
        }
      : {
          desk: "Show screen state",
          deskText: "Choose what the projector should emphasize right now during the show.",
          statusLabel: "On-air status",
          currentActLabel: "Current act",
          highlightLabel: "Highlight mode",
          saved: "Show screen state updated.",
          saveButton: "Update show",
          none: "No highlight",
          stage: "Highlight the stage",
          currentAct: "Highlight the current act",
          results: "Highlight results",
          players: "Highlight players",
        }
  ), [language]);
  const showHighlightOptions = useMemo<Array<{ value: ShowHighlightMode | ""; label: string }>>(() => [
    { value: "", label: showCopy.none },
    { value: "stage", label: showCopy.stage },
    { value: "current_act", label: showCopy.currentAct },
    { value: "results", label: showCopy.results },
    { value: "players", label: showCopy.players },
  ], [showCopy]);

  useEffect(() => {
    if (!selectedStageCountdown) {
      return;
    }
    setTimeNow(Date.now());
    const interval = window.setInterval(() => {
      setTimeNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [selectedStageCountdown]);

  const loadPanelData = useCallback(async (preferPublished = false) => {
    if (!authenticated || !selectedRoom) {
      return;
    }

    setLoadingPanel(true);
    setError("");
    try {
      const [snapshotPayload, usersPayload, actsPayload, resultsPayload] = await Promise.all([
        fetchAdminRoomState(selectedRoom),
        fetchAdminUsers(selectedRoom),
        fetchActs(selectedRoom, selectedStage),
        fetchStageResults(selectedRoom, selectedStage),
      ]);
      setSnapshot(snapshotPayload);
      setUsers(usersPayload);
      setRows(buildEditableRows(actsPayload.acts, resultsPayload.results, selectedRoom, selectedStage, preferPublished));
      setScoringProfiles(snapshotPayload.scoringProfiles);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : copy.reloadFailed);
    } finally {
      setLoadingPanel(false);
    }
  }, [authenticated, copy.reloadFailed, selectedRoom, selectedStage]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const payload = await fetchAdminSession();
        if (!active) return;
        setAuthenticated(payload.authenticated);
        setRooms(payload.rooms);
        setScoringProfiles(payload.scoringProfiles);

        const roomFromQuery = searchParams.get("room");
        const roomFromStorage = typeof window !== "undefined" ? window.localStorage.getItem("admin_room_slug") : null;
        const stageFromQuery = searchParams.get("stage");
        const stageFromStorage = typeof window !== "undefined" ? window.localStorage.getItem("admin_stage_key") : null;

        const nextRoom = payload.rooms.some((room) => room.slug === roomFromQuery)
          ? roomFromQuery || ""
          : payload.rooms.some((room) => room.slug === roomFromStorage)
            ? roomFromStorage || ""
            : payload.rooms[0]?.slug || "";
        const nextStage = isStageKey(stageFromQuery)
          ? stageFromQuery
          : isStageKey(stageFromStorage)
            ? stageFromStorage
            : "semi1";

        setSelectedRoom(nextRoom);
        setSelectedStage(nextStage);
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : copy.authFailed);
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [copy.authFailed, searchParams]);

  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin_room_slug", selectedRoom);
      window.localStorage.setItem("admin_stage_key", selectedStage);
    }

    const next = new URLSearchParams(searchParams.toString());
    next.set("room", selectedRoom);
    next.set("stage", selectedStage);
    router.replace(`/admin?${next.toString()}`, { scroll: false });
  }, [router, searchParams, selectedRoom, selectedStage]);

  useEffect(() => {
    setCountdownConfirmOpen(false);
    setCountdownChecks({ scope: false, deadline: false, manualRescue: false });
  }, [selectedRoom, selectedStage]);

  useEffect(() => {
    void loadPanelData();
  }, [loadPanelData]);

  useEffect(() => {
    if (!snapshot?.showState) {
      setShowStatusDraft("");
      setShowCurrentActCode("");
      setShowHighlightMode("");
      return;
    }

    if (snapshot.showState.stageKey !== selectedStage) {
      setShowStatusDraft("");
      setShowCurrentActCode("");
      setShowHighlightMode("");
      return;
    }

    setShowStatusDraft(snapshot.showState.statusText || "");
    setShowCurrentActCode(snapshot.showState.currentActCode || "");
    setShowHighlightMode(snapshot.showState.highlightMode || "");
  }, [selectedStage, snapshot]);

  useEffect(() => {
    if (!authenticated || !selectedRoom) {
      return;
    }

    const socket = createRoomSocket(selectedRoom);
    const refresh = () => {
      void loadPanelData();
    };

    socket.on("toggle", refresh);
    socket.on("resultsUpdate", refresh);
    socket.on("leaderboardUpdate", refresh);

    return () => {
      socket.close();
    };
  }, [authenticated, loadPanelData, selectedRoom]);

  function setRowValue(code: string, field: "place" | "jury" | "tele" | "total", value: string) {
    const sanitized = toNumericString(value);
    setRows((current) => {
      const next = current.map((row) => {
        if (row.code !== code) return row;

        if (field === "place") {
          return {
            ...row,
            place: sanitized,
          };
        }

        if (field === "total") {
          return {
            ...row,
            total: sanitized,
          };
        }

        const nextJury = field === "jury" ? sanitized : row.jury;
        const nextTele = field === "tele" ? sanitized : row.tele;
        const nextTotal = nextJury === "" && nextTele === ""
          ? ""
          : String(rowToNumber(nextJury) + rowToNumber(nextTele));

        return {
          ...row,
          jury: nextJury,
          tele: nextTele,
          total: nextTotal,
        };
      });

      const sorted = sortResultRows(next, selectedStage);
      if (selectedRoom) {
        writeDraft(selectedRoom, selectedStage, sorted);
      }
      return sorted;
    });
  }

  async function handleAdminLogin() {
    const key = adminKey.trim();
    const email = adminEmail.trim();
    const password = adminPassword;
    if (!key && !(email && password)) {
      setError(language === 'ru' ? 'Введи admin key или admin email/password.' : 'Enter an admin key or admin email/password.');
      return;
    }

    setPendingAction("admin-login");
    setError("");
    setStatusText("");
    try {
      const payload = await loginAdminSession({
        key: key || undefined,
        email: email || undefined,
        password: password || undefined,
      });
      setAuthenticated(true);
      setRooms(payload.rooms);
      setScoringProfiles(payload.scoringProfiles);
      setSelectedRoom((current) => current || payload.rooms[0]?.slug || "");
      setAdminKey("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (loginError) {
      console.error(loginError);
      setError(loginError instanceof Error ? loginError.message : copy.authFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLogout() {
    setPendingAction("admin-logout");
    try {
      await logoutAdminSession();
      setAuthenticated(false);
      setSnapshot(null);
      setUsers([]);
      setRows([]);
      setStatusText("");
      setError("");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStageToggle(open: boolean) {
    if (!selectedRoom) return;

    setPendingAction(open ? "stage-open" : "stage-close");
    setError("");
    setStatusText("");
    try {
      const payload = await toggleStageWindow(selectedRoom, selectedStage, open);
      setSnapshot((current) => current ? {
        ...current,
        predictionWindows: payload.predictionWindows,
      } : current);
      setStatusText(open ? copy.stageOpenOk : copy.stageCloseOk);
    } catch (toggleError) {
      console.error(toggleError);
      setError(toggleError instanceof Error ? toggleError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStartCountdown() {
    setPendingAction("countdown-start");
    setError("");
    setStatusText("");
    try {
      const payload = await startStageCountdown(selectedStage, 5);
      setSnapshot((current) => current ? {
        ...current,
        predictionWindows: payload.predictionWindows,
        submissionCountdowns: payload.submissionCountdowns,
      } : current);
      setCountdownConfirmOpen(false);
      setCountdownChecks({ scope: false, deadline: false, manualRescue: false });
      setStatusText(copy.countdownStartedOk);
    } catch (countdownError) {
      console.error(countdownError);
      setError(countdownError instanceof Error ? countdownError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStopCountdown() {
    setPendingAction("countdown-stop");
    setError("");
    setStatusText("");
    try {
      const payload = await stopStageCountdown(selectedStage);
      setSnapshot((current) => current ? {
        ...current,
        predictionWindows: payload.predictionWindows,
        submissionCountdowns: payload.submissionCountdowns,
      } : current);
      setCountdownConfirmOpen(false);
      setCountdownChecks({ scope: false, deadline: false, manualRescue: false });
      setStatusText(copy.countdownStoppedOk);
    } catch (countdownError) {
      console.error(countdownError);
      setError(countdownError instanceof Error ? countdownError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleScoringProfileChange(nextProfile: string) {
    if (!selectedRoom) return;

    setPendingAction("scoring-profile");
    setError("");
    setStatusText("");
    try {
      const payload = await updateAdminScoring(selectedRoom, nextProfile);
      setSnapshot((current) => current ? {
        ...current,
        scoringProfile: payload.scoringProfile,
        scoringProfiles: payload.scoringProfiles,
      } : current);
      setScoringProfiles(payload.scoringProfiles);
      setStatusText(copy.scoringSaved);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleShowStateSave() {
    if (!selectedRoom) return;

    setPendingAction("show-state");
    setError("");
    setStatusText("");
    try {
      const payload = await updateAdminShowState({
        roomSlug: selectedRoom,
        stageKey: selectedStage,
        currentActCode: showCurrentActCode || null,
        statusText: showStatusDraft.trim() || null,
        highlightMode: showHighlightMode || null,
      });

      setSnapshot((current) => current ? {
        ...current,
        showState: payload.showState,
      } : current);
      setStatusText(showCopy.saved);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePublishResults() {
    if (!selectedRoom) return;

    const activeRows = rankedRows.filter((row) => hasRowData(row));
    if (!activeRows.length) {
      setError(copy.noData);
      return;
    }

    if (isSemiStage) {
      const placedRows = activeRows.filter((row) => hasPlacement(row));
      if (placedRows.length > 0 && placedRows.length !== rows.length) {
        setError(copy.semiPlaceRequired);
        return;
      }

      if (placedRows.length === rows.length) {
        const placeNumbers = placedRows.map((row) => rowToNumber(row.place));
        const hasInvalidPlace = placeNumbers.some((value) => value <= 0);
        const uniquePlaces = new Set(placeNumbers);
        if (hasInvalidPlace || uniquePlaces.size !== rows.length) {
          setError(copy.semiPlaceUnique);
          return;
        }
      }
    }

    const rowsToPublish = isSemiStage && activeRows.every((row) => hasPlacement(row))
      ? [...activeRows].sort((left, right) => rowToNumber(left.place) - rowToNumber(right.place))
      : activeRows;

    setPendingAction("publish-results");
    setError("");
    setStatusText("");
    try {
      await publishStageResults({
        roomSlug: selectedRoom,
        stage: selectedStage,
        ranking: rowsToPublish.map((row) => row.code),
        breakdown: rowsToPublish
          .filter((row) => hasScoreData(row))
          .map((row) => ({
            code: row.code,
            jury: rowToNumber(row.jury),
            tele: rowToNumber(row.tele),
            total: row.total ? rowToNumber(row.total) : rowToNumber(row.jury) + rowToNumber(row.tele),
          })),
      });
      clearDraft(selectedRoom, selectedStage);
      setStatusText(copy.publishedOk);
      await loadPanelData(true);
    } catch (publishError) {
      console.error(publishError);
      setError(publishError instanceof Error ? publishError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLoadPublished() {
    if (!selectedRoom) return;
    clearDraft(selectedRoom, selectedStage);
    setStatusText("");
    setError("");
    await loadPanelData(true);
  }

  async function handleParticipantAction(actionKey: string, runner: () => Promise<unknown>, nextStatus: string) {
    setPendingAction(actionKey);
    setError("");
    setStatusText("");
    try {
      await runner();
      await loadPanelData();
      setStatusText(nextStatus);
    } catch (actionError) {
      console.error(actionError);
      setError(actionError instanceof Error ? actionError.message : copy.reloadFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleParticipantLatePass(userId: string, revoke = false) {
    if (!selectedRoom) return;
    const actionKey = revoke ? `late-pass-revoke-${userId}` : `late-pass-grant-${userId}`;
    const runner = revoke
      ? () => revokeParticipantSubmissionOverride(selectedRoom, userId, selectedStage)
      : () => grantParticipantSubmissionOverride(selectedRoom, userId, selectedStage, 5);
    await handleParticipantAction(
      actionKey,
      runner,
      revoke ? copy.participantLatePassRevoked : copy.participantLatePassGranted,
    );
  }

  async function handleRoomReset() {
    if (!selectedRoom) return;
    if (!window.confirm(copy.confirmRoomReset)) {
      return;
    }

    await handleParticipantAction("room-reset", () => resetRoomState(selectedRoom), copy.roomResetDone);
    clearDraft(selectedRoom, selectedStage);
  }

  if (booting) {
    return <div className="show-card p-6 text-sm text-arenaMuted">Загружаю пульт...</div>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-4 text-arenaText md:px-8">
        <div className="mx-auto grid max-w-[96rem] gap-5">
          <section className="show-card p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <BrandLogo variant="header" />
                <p className="label-copy mt-5 text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
                <h1 className="display-copy mt-3 text-4xl font-black md:text-6xl">{copy.title}</h1>
                <p className="mt-4 max-w-3xl text-sm text-arenaMuted md:text-base">{copy.description}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </section>

          {error ? <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          <section className="show-card p-6 md:p-8">
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">{copy.loginTitle}</p>
                <h2 className="display-copy mt-3 text-3xl font-black">{copy.loginButton}</h2>
                <p className="mt-4 text-sm text-arenaMuted">{copy.loginText}</p>
              </div>
              <div className="show-panel p-5">
                <div className="grid gap-3">
                  <input
                    className="arena-input"
                    type="password"
                    value={adminKey}
                    placeholder={copy.keyPlaceholder}
                    onChange={(event) => setAdminKey(event.target.value)}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="arena-input"
                      type="email"
                      value={adminEmail}
                      placeholder={language === "ru" ? "Админ email" : "Admin email"}
                      onChange={(event) => setAdminEmail(event.target.value)}
                    />
                    <input
                      className="arena-input"
                      type="password"
                      value={adminPassword}
                      placeholder={language === "ru" ? "Админ пароль" : "Admin password"}
                      onChange={(event) => setAdminPassword(event.target.value)}
                    />
                  </div>
                  <p className="text-xs text-arenaMuted">
                    {language === "ru"
                      ? "Можно войти либо по admin key, либо по отдельным admin email/password из env."
                      : "Use either the admin key or a dedicated admin email/password from env."}
                  </p>
                  <button
                    type="button"
                    className="arena-button-primary h-12 px-6 text-sm"
                    disabled={pendingAction === "admin-login"}
                    onClick={handleAdminLogin}
                  >
                    <KeyRound size={16} />
                    {copy.loginButton}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-5">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-5 md:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <BrandLogo variant="header" />
                <p className="label-copy mt-5 text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.kicker}</p>
                <h1 className="display-copy mt-3 text-4xl font-black md:text-6xl">{copy.title}</h1>
                <p className="mt-4 max-w-3xl text-sm text-arenaMuted md:text-base">{copy.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                  <Activity size={14} />
                  {selectedRoom ? copy.socketLive : copy.socketIdle}
                </span>
                <LanguageSwitcher />
                <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={handleLogout}>
                  <LogOut size={16} />
                  {copy.logoutButton}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="show-panel p-4 xl:col-span-2">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{copy.roomsLabel}</p>
                <select className="arena-input mt-3" value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)}>
                  {rooms.map((room) => (
                    <option key={room.slug} value={room.slug}>{getRoomName(room.slug, room.name)}</option>
                  ))}
                </select>
              </label>

              <div className="show-panel p-4 xl:col-span-2">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{copy.stageLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STAGE_OPTIONS.map((stage) => (
                    <button
                      key={stage.key}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        selectedStage === stage.key
                          ? "bg-arenaSurfaceMax text-white shadow-glow"
                          : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => setSelectedStage(stage.key)}
                    >
                      <span className="label-copy uppercase tracking-[0.22em]">{getStageLabel(stage.key)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="show-panel p-4 xl:col-span-2">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{copy.scoringLabel}</p>
                <select
                  className="arena-input mt-3"
                  value={snapshot?.scoringProfile || scoringProfiles[0]?.key || ""}
                  onChange={(event) => void handleScoringProfileChange(event.target.value)}
                >
                  {scoringProfiles.map((profile) => (
                    <option key={profile.key} value={profile.key}>{profile.label}</option>
                  ))}
                </select>
                <p className="mt-3 text-xs text-arenaMuted">
                  {scoringProfiles.find((profile) => profile.key === (snapshot?.scoringProfile || scoringProfiles[0]?.key))?.description}
                </p>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/${selectedRoom || rooms[0]?.slug || ""}`} className="arena-button-secondary inline-flex items-center px-5 py-3 text-sm">
                <ShieldCheck size={16} />
                {copy.roomHub}
              </Link>
              <Link href={`/${selectedRoom || rooms[0]?.slug || ""}/live/${selectedStage}`} className="arena-button-secondary inline-flex items-center px-5 py-3 text-sm">
                <MonitorPlay size={16} />
                {copy.projector}
              </Link>
              <Link href={`/${selectedRoom || rooms[0]?.slug || ""}/players/overall`} className="arena-button-secondary inline-flex items-center px-5 py-3 text-sm">
                <Users size={16} />
                {copy.playersBoard}
              </Link>
              <Link href={`/${selectedRoom || rooms[0]?.slug || ""}/stats`} className="arena-button-secondary inline-flex items-center px-5 py-3 text-sm">
                <Trophy size={16} />
                {copy.seasonStats}
              </Link>
              <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => void loadPanelData()}>
                <RefreshCw size={16} />
                {copy.refreshButton}
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        {statusText ? <div className="rounded-[1.4rem] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{statusText}</div> : null}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <div className="show-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.roomStats}</p>
                  <h2 className="display-copy mt-3 text-3xl font-black">{selectedRoomMeta?.name || selectedRoom}</h2>
                  <p className="mt-3 text-sm text-arenaMuted">
                    {snapshot?.predictionWindows[selectedStage] ? copy.stageWindowOpen : copy.stageWindowClosed}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="arena-button-primary h-12 px-5 text-sm" onClick={() => void handleStageToggle(true)}>
                    <Lock size={16} />
                    {copy.openStage}
                  </button>
                  <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => void handleStageToggle(false)}>
                    <Lock size={16} />
                    {copy.closeStage}
                  </button>
                </div>
              </div>

              <div className="mt-5 show-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaBeam">{copy.countdownTitle}</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {countdownLabel ? `${copy.countdownActive} ${countdownLabel}` : copy.countdownIdle}
                    </p>
                    <p className="mt-2 text-sm text-arenaMuted">{copy.countdownText}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStageCountdown ? (
                      <button
                        type="button"
                        className="arena-button-secondary px-4 py-3 text-sm"
                        disabled={Boolean(pendingAction)}
                        onClick={() => void handleStopCountdown()}
                      >
                        <Clock3 size={16} />
                        {copy.countdownStop}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="arena-button-primary h-12 px-4 text-sm"
                        disabled={Boolean(pendingAction) || !snapshot?.predictionWindows[selectedStage]}
                        onClick={() => setCountdownConfirmOpen((current) => !current)}
                      >
                        <Clock3 size={16} />
                        {copy.countdownStart}
                      </button>
                    )}
                  </div>
                </div>

                {countdownConfirmOpen && !selectedStageCountdown ? (
                  <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-semibold text-white">{copy.countdownConfirmTitle}</p>
                    <div className="mt-4 grid gap-2.5">
                      {[
                        { key: "scope", label: copy.countdownCheckScope },
                        { key: "deadline", label: copy.countdownCheckDeadline },
                        { key: "manualRescue", label: copy.countdownCheckManual },
                      ].map((item) => (
                        <label key={item.key} className="flex items-start gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-arenaText">
                          <input
                            type="checkbox"
                            checked={countdownChecks[item.key as keyof typeof countdownChecks]}
                            onChange={() => setCountdownChecks((current) => ({
                              ...current,
                              [item.key]: !current[item.key as keyof typeof current],
                            }))}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#81ecff]"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="arena-button-primary h-11 px-4 text-sm"
                        disabled={!countdownChecksReady || pendingAction === "countdown-start"}
                        onClick={() => void handleStartCountdown()}
                      >
                        <Clock3 size={16} />
                        {copy.countdownConfirmAction}
                      </button>
                      <button
                        type="button"
                        className="arena-button-secondary px-4 py-3 text-sm"
                        onClick={() => {
                          setCountdownConfirmOpen(false);
                          setCountdownChecks({ scope: false, deadline: false, manualRescue: false });
                        }}
                      >
                        {language === "ru" ? "Отмена" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: copy.participants, value: snapshot?.participants.activeCount ?? 0 },
                  { label: copy.removed, value: snapshot?.participants.removedCount ?? 0 },
                  { label: copy.submitted, value: selectedStageOverview?.submittedCount ?? 0 },
                  { label: copy.locked, value: selectedStageOverview?.lockedCount ?? 0 },
                  { label: copy.revealed, value: selectedStageOverview?.revealedCount ?? 0 },
                  { label: copy.lineup, value: `${selectedStageOverview?.currentEntries ?? 0}/${selectedStageOverview?.expectedEntries ?? 0}` },
                ].map((item) => (
                  <div key={item.label} className="show-panel p-4">
                    <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{item.label}</p>
                    <p className="display-copy mt-3 text-4xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="show-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{showCopy.desk}</p>
                  <h2 className="display-copy mt-3 text-3xl font-black">{getStageLabel(selectedStage)}</h2>
                  <p className="mt-3 text-sm text-arenaMuted">{showCopy.deskText}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                    {snapshot?.showState?.stageKey === selectedStage ? getStageLabel(snapshot.showState.stageKey) : getStageLabel(selectedStage)}
                  </span>
                  {snapshot?.showState?.statusText ? (
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-white">
                      {snapshot.showState.statusText}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                <label className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{showCopy.statusLabel}</p>
                  <input
                    className="arena-input mt-3"
                    value={showStatusDraft}
                    placeholder={language === "ru" ? "Например: Голосование открыто" : "For example: Voting is open"}
                    onChange={(event) => setShowStatusDraft(event.target.value)}
                  />
                </label>

                <label className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{showCopy.currentActLabel}</p>
                  <select
                    className="arena-input mt-3"
                    value={showCurrentActCode}
                    onChange={(event) => setShowCurrentActCode(event.target.value)}
                  >
                    <option value="">{language === "ru" ? "Без выбора" : "No act selected"}</option>
                    {rows.map((row) => (
                      <option key={`show-${row.code}`} value={row.code}>
                        {row.country} - {row.artist}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{showCopy.highlightLabel}</p>
                  <select
                    className="arena-input mt-3"
                    value={showHighlightMode}
                    onChange={(event) => setShowHighlightMode((event.target.value || "") as ShowHighlightMode | "")}
                  >
                    {showHighlightOptions.map((option) => (
                      <option key={`highlight-${option.value || "none"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    className="arena-button-primary h-12 w-full px-5 text-sm"
                    disabled={pendingAction === "show-state"}
                    onClick={() => void handleShowStateSave()}
                  >
                    <MonitorPlay size={16} />
                    {showCopy.saveButton}
                  </button>
                </div>
              </div>
            </div>

            <div className="show-card p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.resultsDesk}</p>
                  <h2 className="display-copy mt-3 text-3xl font-black">{getStageLabel(selectedStage)}</h2>
                  <p className="mt-3 text-sm text-arenaMuted">{resultsDeskText}</p>
                  {isSemiStage && qualificationCutoff ? (
                    <div className="mt-3">
                      <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                        {language === "ru" ? `Проходят места 1–${qualificationCutoff}` : `Places 1-${qualificationCutoff} qualify`}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => void handleLoadPublished()}>
                    <RotateCcw size={16} />
                    {copy.loadPublished}
                  </button>
                  <button type="button" className="arena-button-primary h-12 px-5 text-sm" onClick={() => void handlePublishResults()}>
                    <Settings2 size={16} />
                    {copy.publishButton}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {loadingPanel ? (
                  <div className="rounded-[1.6rem] bg-white/5 p-5 text-sm text-arenaMuted">
                    {language === "ru" ? "Загружаю данные этапа..." : "Loading stage data..."}
                  </div>
                ) : rankedRows.map((row) => (
                  <div key={row.code} className="show-panel p-4">
                    <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                      <div className="flex items-center gap-4">
                        <div className="show-rank h-16 w-16 shrink-0">
                          <span className="display-copy text-3xl font-black text-arenaText">{activeRanking[row.code] || "—"}</span>
                        </div>
                        <ActPoster act={row} compact />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">{row.country}</span>
                          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">{row.song}</span>
                          {isSemiStage && hasPlacement(row) && qualificationCutoff ? (
                            <span className={`show-chip text-[11px] uppercase tracking-[0.22em] ${rowToNumber(row.place) <= qualificationCutoff ? "text-emerald-100" : "text-arenaMuted"}`}>
                              {rowToNumber(row.place) <= qualificationCutoff ? copy.qualifiedLabel : copy.outLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-xl font-semibold text-white">{row.artist}</p>
                        <p className="mt-2 text-sm text-arenaMuted">
                          {isSemiStage
                            ? hasPlacement(row)
                              ? `${copy.placeLabel}: #${row.place}`
                              : copy.placeMissing
                            : hasRowData(row)
                              ? `${copy.totalLabel}: ${row.total || "0"}`
                              : copy.noData}
                        </p>
                      </div>

                      <div className={`grid gap-3 ${isSemiStage ? "md:grid-cols-4 lg:w-[28rem]" : "md:grid-cols-3 lg:w-[21rem]"}`}>
                        {isSemiStage ? (
                          <label className="grid gap-2 text-xs text-arenaMuted">
                            <span className="label-copy uppercase tracking-[0.2em]">{copy.placeLabel}</span>
                            <input className="arena-input" inputMode="numeric" value={row.place} onChange={(event) => setRowValue(row.code, "place", event.target.value)} />
                          </label>
                        ) : null}
                        <label className="grid gap-2 text-xs text-arenaMuted">
                          <span className="label-copy uppercase tracking-[0.2em]">{copy.juryLabel}</span>
                          <input className="arena-input" inputMode="numeric" value={row.jury} onChange={(event) => setRowValue(row.code, "jury", event.target.value)} />
                        </label>
                        <label className="grid gap-2 text-xs text-arenaMuted">
                          <span className="label-copy uppercase tracking-[0.2em]">{copy.teleLabel}</span>
                          <input className="arena-input" inputMode="numeric" value={row.tele} onChange={(event) => setRowValue(row.code, "tele", event.target.value)} />
                        </label>
                        <label className="grid gap-2 text-xs text-arenaMuted">
                          <span className="label-copy uppercase tracking-[0.2em]">{copy.totalLabel}</span>
                          <input className="arena-input" inputMode="numeric" value={row.total} onChange={(event) => setRowValue(row.code, "total", event.target.value)} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.participantDesk}</p>
              <h2 className="display-copy mt-3 text-3xl font-black">{selectedRoomMeta?.seasonLabel || selectedRoomMeta?.name}</h2>
              <p className="mt-3 text-sm text-arenaMuted">{copy.participantDeskText}</p>
            </div>

            <div className="grid gap-3">
              {users.map((user) => (
                <div key={user.id} className="show-card p-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      name={getDisplayName(user.name)}
                      avatarUrl={user.avatarUrl}
                      avatarTheme={user.avatarTheme}
                      className="h-14 w-14 shrink-0"
                      textClass="text-base"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`show-chip text-[11px] uppercase tracking-[0.22em] ${user.removed ? "border-rose-300/20 bg-rose-400/15 text-rose-100" : "text-arenaBeam"}`}>
                          {user.removed ? copy.removedState : copy.activeState}
                        </span>
                        {user.submittedStages.map((stage) => (
                          <span key={`${user.id}-${stage}`} className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                            {getStageLabel(stage)}
                          </span>
                        ))}
                        {user.submissionOverrides[selectedStage] ? (
                          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                            <Unlock size={13} />
                            {copy.latePassActive}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-lg font-semibold text-white">{getDisplayName(user.name)}</p>
                      <p className="mt-2 text-sm text-arenaMuted">{user.firstName} {user.lastName}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <button
                      type="button"
                      className="arena-button-secondary px-4 py-3 text-sm"
                      disabled={Boolean(pendingAction)}
                      onClick={() => void handleParticipantAction(`reset-stage-${user.id}`, () => resetParticipant(selectedRoom, user.id, selectedStage), copy.participantReset(selectedStage))}
                    >
                      {copy.resetStage}
                    </button>
                    <button
                      type="button"
                      className="arena-button-secondary px-4 py-3 text-sm"
                      disabled={Boolean(pendingAction)}
                      onClick={() => void handleParticipantAction(`reset-all-${user.id}`, () => resetParticipant(selectedRoom, user.id), copy.participantReset(null))}
                    >
                      {copy.resetAll}
                    </button>
                    {!snapshot?.predictionWindows[selectedStage] ? (
                      user.submissionOverrides[selectedStage] ? (
                        <button
                          type="button"
                          className="arena-button-secondary px-4 py-3 text-sm md:col-span-2"
                          disabled={Boolean(pendingAction)}
                          onClick={() => void handleParticipantLatePass(user.id, true)}
                        >
                          <Unlock size={16} />
                          {copy.revokeLatePass}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="arena-button-primary h-12 px-4 text-sm md:col-span-2"
                          disabled={Boolean(pendingAction)}
                          onClick={() => void handleParticipantLatePass(user.id)}
                        >
                          <Unlock size={16} />
                          {copy.grantLatePass}
                        </button>
                      )
                    ) : null}
                    {user.removed ? (
                      <button
                        type="button"
                        className="arena-button-primary h-12 px-4 text-sm md:col-span-2"
                        disabled={Boolean(pendingAction)}
                        onClick={() => void handleParticipantAction(`restore-${user.id}`, () => restoreParticipant(selectedRoom, user.id), copy.participantRestored)}
                      >
                        {copy.restoreUser}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 md:col-span-2"
                        disabled={Boolean(pendingAction)}
                        onClick={() => void handleParticipantAction(`remove-${user.id}`, () => removeParticipant(selectedRoom, user.id), copy.participantRemoved)}
                      >
                        {copy.removeUser}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{copy.hardReset}</p>
              <p className="mt-3 text-sm text-arenaMuted">{copy.hardResetText}</p>
              <button
                type="button"
                className="mt-5 rounded-full bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25"
                disabled={pendingAction === "room-reset"}
                onClick={() => void handleRoomReset()}
              >
                {copy.resetRoomButton}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
