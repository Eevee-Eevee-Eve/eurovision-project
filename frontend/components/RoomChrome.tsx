'use client';

import Link from "next/link";
import { MonitorPlay, NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getAccountCopy } from "../lib/account-copy";
import { ApiError, fetchRoom, unlockRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import type { RoomSummary, StageKey } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

const navItems = [
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
  pageKey: "vote" | "acts" | "live" | "players" | "room";
  children: ReactNode;
}) {
  const { getStageLabel, language } = useLanguage();
  const { account } = useAccount();
  const { isPhone } = useDeviceTier();
  const accountCopy = getAccountCopy(language);
  const isRoomLanding = pageKey === "room";
  const compactVoteShell = isPhone && pageKey === "vote";
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

  const unlockCopy = language === "ru"
    ? {
        loading: "Проверяю доступ к комнате...",
        missingTitle: "Комната не найдена",
        missingText: "Эта комната уже исчезла или ссылка неверная.",
        lockedTitle: "Комната закрыта паролем",
        lockedText:
          "Сначала открой комнату паролем, а потом уже переходи к голосованию и результатам.",
        passwordLabel: "Пароль комнаты",
        passwordPlaceholder: "Введите пароль",
        open: "Открыть комнату",
        backHome: "На главную",
        roomInfo: "Комната",
        accountInfo: "Аккаунт",
        stageLabel: "Текущий этап",
        temporary: "Временная",
        privateRoom: "С паролем",
        guest: "Гость",
        accountHint: "Войти можно позже, прямо перед отправкой бюллетеня.",
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
        accountInfo: "Account",
        stageLabel: "Current stage",
        temporary: "Temporary",
        privateRoom: "Password",
        guest: "Guest",
        accountHint: "You can sign in later, right before submitting a ballot.",
      };

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-20 pt-4 text-arenaText md:px-8 md:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel ghost-grid rounded-shell border border-white/10 p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08]"
              >
                <span className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                  {language === "ru" ? "Евровидение у Морозовых 2026" : "Morozov Eurovision 2026"}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Link
                  href="/account"
                  className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
                  aria-label={account ? accountCopy.navAccount : accountCopy.auth.signIn}
                  title={account ? accountCopy.navAccount : accountCopy.auth.signIn}
                >
                  {account ? (
                    <UserAvatar
                      name={account.publicName}
                      emoji={account.emoji}
                      avatarUrl={account.avatarUrl}
                      avatarTheme={account.avatarTheme}
                      className="h-full w-full"
                      textClass="text-[0.9rem]"
                    />
                  ) : (
                    <span className="label-copy text-[10px] uppercase tracking-[0.24em] text-white/80">
                      {language === "ru" ? "Войти" : "Sign in"}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {!checkingAccess && !roomMissing && roomSummary && !isRoomLanding && !compactVoteShell ? (
              <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="show-panel p-4">
                  <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaBeam">
                    {unlockCopy.roomInfo}
                  </p>
                  <h1 className={`display-copy mt-2 font-black text-white ${isPhone ? "text-xl" : "text-2xl md:text-3xl"}`}>
                    {roomSummary.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="show-chip text-[11px] uppercase tracking-[0.2em] text-arenaBeam">
                      {unlockCopy.stageLabel}: {getStageLabel(activeStage)}
                    </span>
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

              </div>
            ) : null}

            {!isRoomLanding && !compactVoteShell ? (
              <div className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const href = `/${roomSlug}/${item.key}/${activeStage}`;
                  const isActive = pageKey === item.key;

                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        isActive
                          ? "bg-arenaSurfaceMax text-white shadow-glow"
                          : "bg-white/[0.04] text-arenaMuted hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="label-copy uppercase tracking-[0.18em]">
                        {language === "ru" ? item.labelRu : item.labelEn}
                      </span>
                    </Link>
                  );
                })}
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
                    <Link
                      href="/"
                      className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm"
                    >
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
                      <Link
                        href="/"
                        className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm"
                      >
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
