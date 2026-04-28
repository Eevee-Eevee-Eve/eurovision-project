'use client';

import Link from "next/link";
import { MonitorPlay, NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, fetchRoom, unlockRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import type { RoomSummary, StageKey } from "../lib/types";
import { SiteHeader } from "./SiteHeader";
import { useLanguage } from "./LanguageProvider";

const roomNavItems = [
  { key: "vote", labelRu: "Голосование", labelEn: "Voting", icon: NotebookPen },
  { key: "live", labelRu: "Результаты", labelEn: "Results", icon: MonitorPlay },
] as const;

export function RoomChrome({
  roomSlug,
  stageKey,
  pageKey,
  children,
}: {
  roomSlug: string;
  stageKey?: StageKey;
  pageKey: "vote" | "live" | "players" | "room";
  children: ReactNode;
}) {
  const { getRoomName, getStageLabel, language } = useLanguage();
  const { isPhone } = useDeviceTier();
  const isRoomLanding = pageKey === "room";
  const compactRoomShell = isPhone && (pageKey === "vote" || pageKey === "live" || pageKey === "players");
  const isDisplayShell = pageKey === "live" || pageKey === "players";
  const minimalDisplayShell = isDisplayShell && !isPhone;
  const mergedDesktopShell = !isPhone && pageKey === "vote";
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [needsRoomPassword, setNeedsRoomPassword] = useState(false);
  const [roomSummary, setRoomSummary] = useState<RoomSummary | null>(null);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [roomMissing, setRoomMissing] = useState(false);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      setCheckingAccess(true);
      setNeedsRoomPassword(false);
      setRoomMissing(false);
      setUnlockError("");

      try {
        const room = await fetchRoom(roomSlug);
        if (!active) return;
        setRoomSummary(room);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 403 && error.code === "ROOM_PASSWORD_REQUIRED") {
          setNeedsRoomPassword(true);
          setRoomSummary((error.payload as { room?: RoomSummary })?.room || null);
        } else if (error instanceof ApiError && error.status === 404) {
          setRoomMissing(true);
        } else {
          setUnlockError(error instanceof Error ? error.message : "Unable to open this room.");
        }
      } finally {
        if (active) {
          setCheckingAccess(false);
        }
      }
    };

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [roomSlug]);

  async function handleUnlockRoom() {
    setSubmitting(true);
    setUnlockError("");

    try {
      await unlockRoom(roomSlug, password);
      const room = await fetchRoom(roomSlug);
      setRoomSummary(room);
      setNeedsRoomPassword(false);
      setPassword("");
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : "Unable to unlock room.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeStage = useMemo(
    () => stageKey || roomSummary?.defaultStage || "semi1",
    [roomSummary?.defaultStage, stageKey],
  );

  const showStageMeta = !(pageKey === "players" && !stageKey);

  const mergedVoteCopy = language === "ru"
    ? {
        kicker: "Телефон / голосование",
        title: "Голосование",
        description: "Перетаскивай артистов в свой порядок. Тап по строке открывает карточку с описанием, заметкой и видео.",
      }
    : {
        kicker: "Phone / voting",
        title: "Voting",
        description: "Drag acts into your own order. Tap any row to open the card with details, notes, and video.",
      };

  const unlockCopy = language === "ru"
    ? {
        loading: "Проверяю доступ к комнате...",
        missingTitle: "Комната не найдена",
        missingText: "Эта комната уже исчезла или ссылка неверная.",
        lockedTitle: "Комната закрыта паролем",
        lockedText: "Сначала открой комнату паролем, а потом переходи к голосованию и результатам.",
        passwordLabel: "Пароль комнаты",
        passwordPlaceholder: "Введите пароль",
        open: "Открыть комнату",
        backHome: "На главную",
        roomInfo: "Комната",
        stageLabel: "Текущий этап",
        temporary: "Временная",
        privateRoom: "С паролем",
      }
    : {
        loading: "Checking room access...",
        missingTitle: "Room not found",
        missingText: "This room has expired or the link is invalid.",
        lockedTitle: "Room is password-protected",
        lockedText: "Unlock the room first, then continue into voting or results.",
        passwordLabel: "Room password",
        passwordPlaceholder: "Enter password",
        open: "Open room",
        backHome: "Back home",
        roomInfo: "Room",
        stageLabel: "Current stage",
        temporary: "Temporary",
        privateRoom: "Password",
      };

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-20 pt-4 text-arenaText md:px-8 md:pt-6">
      <div className={`mx-auto grid gap-4 ${isDisplayShell ? "max-w-[96rem] 2xl:max-w-[108rem]" : "max-w-[96rem]"}`}>
        <SiteHeader />

        <div className="glass-panel ghost-grid ghost-grid-room rounded-shell border border-white/10 p-4 md:p-5">
          <div className="flex flex-col gap-4">
            {!isRoomLanding ? (
              <nav className="room-section-nav" aria-label={language === "ru" ? "Навигация комнаты" : "Room navigation"}>
                {roomNavItems.map((item) => {
                  const Icon = item.icon;
                  const href = `/${roomSlug}/${item.key}/${activeStage}`;
                  const isActive = item.key === "live"
                    ? pageKey === "live" || pageKey === "players"
                    : pageKey === item.key;

                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className={`room-section-link ${isActive ? "room-section-link-active" : ""}`}
                    >
                      <Icon size={16} />
                      <span>{language === "ru" ? item.labelRu : item.labelEn}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            {!checkingAccess && !roomMissing && roomSummary && !isRoomLanding && !compactRoomShell && !minimalDisplayShell ? (
              <div className={mergedDesktopShell ? "show-panel room-context-merged p-4 md:p-5" : "grid gap-3"}>
                <div className={mergedDesktopShell ? "min-w-0" : "show-panel p-4"}>
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                    {unlockCopy.roomInfo}
                  </p>
                  <h1 className={`display-copy mt-2 font-black text-white ${isPhone ? "text-xl" : "text-2xl md:text-3xl"}`}>
                    {getRoomName(roomSlug, roomSummary.name)}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {showStageMeta ? (
                      <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaBeam">
                        {unlockCopy.stageLabel}: {getStageLabel(activeStage)}
                      </span>
                    ) : null}
                    {!isPhone ? (
                      <>
                        <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaMuted">
                          {roomSlug}
                        </span>
                        {roomSummary.isTemporary ? (
                          <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaMuted">
                            {unlockCopy.temporary}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                    {roomSummary.passwordRequired ? (
                      <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaMuted">
                        {unlockCopy.privateRoom}
                      </span>
                    ) : null}
                  </div>
                </div>

                {mergedDesktopShell ? (
                  <div className="min-w-0 md:text-right">
                    <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                      {mergedVoteCopy.kicker}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 md:justify-end">
                      <h2 className="display-copy text-[1.65rem] font-black leading-none text-white md:text-4xl">
                        {mergedVoteCopy.title}
                      </h2>
                      <span className="show-chip text-xs text-arenaBeam">{getStageLabel(activeStage)}</span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-arenaMuted md:ml-auto">
                      {mergedVoteCopy.description}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              {checkingAccess ? (
                <div className="show-card p-6 text-sm text-arenaMuted">{unlockCopy.loading}</div>
              ) : roomMissing ? (
                <div className="show-card p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                    {unlockCopy.missingTitle}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-arenaMuted">{unlockCopy.missingText}</p>
                  <div className="mt-5">
                    <Link href="/" className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm">
                      {unlockCopy.backHome}
                    </Link>
                  </div>
                </div>
              ) : needsRoomPassword ? (
                <div className="show-card max-w-2xl p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                    {unlockCopy.lockedTitle}
                  </p>
                  <h2 className="display-copy mt-3 text-3xl font-black text-white">
                    {roomSummary?.name || roomSlug}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-arenaMuted">{unlockCopy.lockedText}</p>
                  <div className="mt-6 grid gap-3">
                    <label className="grid gap-2 text-sm text-arenaMuted">
                      <span>{unlockCopy.passwordLabel}</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={unlockCopy.passwordPlaceholder}
                        className="arena-input"
                      />
                    </label>
                    {unlockError ? (
                      <div className="rounded-[1.2rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                        {unlockError}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleUnlockRoom}
                        disabled={submitting}
                        className="arena-button-primary inline-flex h-12 items-center justify-center px-5 text-sm"
                      >
                        {submitting ? "..." : unlockCopy.open}
                      </button>
                      <Link href="/" className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm">
                        {unlockCopy.backHome}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
