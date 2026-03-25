'use client';

import Link from "next/link";
import { Monitor, NotebookPen, Trophy, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getAccountCopy } from "../lib/account-copy";
import { ApiError, fetchRoom, unlockRoom } from "../lib/api";
import type { RoomSummary, StageKey } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

const navItems = [
  { key: "vote", labelRu: "Голосование", labelEn: "Vote", icon: NotebookPen },
  { key: "acts", labelRu: "Артисты", labelEn: "Acts", icon: Users },
  { key: "live", labelRu: "Эфир", labelEn: "Live", icon: Trophy },
  { key: "players", labelRu: "Участники", labelEn: "Players", icon: Monitor },
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
  const accountCopy = getAccountCopy(language);
  const isDisplayMode = pageKey === "live" || pageKey === "players";
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

  const unlockCopy = language === "ru"
    ? {
        loading: "Проверяю доступ к комнате...",
        missingTitle: "Комната не найдена",
        missingText: "Эта комната уже исчезла или ссылка неверная.",
        lockedTitle: "Закрытая комната",
        lockedText: "У этой комнаты есть пароль. Введи его один раз, и дальше можно будет спокойно открыть голосование и экран результатов.",
        passwordLabel: "Пароль комнаты",
        passwordPlaceholder: "Введите пароль",
        open: "Открыть комнату",
        backHome: "На главную",
      }
    : {
        loading: "Checking room access...",
        missingTitle: "Room not found",
        missingText: "This room has expired or the link is invalid.",
        lockedTitle: "Private room",
        lockedText: "This room is protected with a password. Enter it once to open voting and results routes.",
        passwordLabel: "Room password",
        passwordPlaceholder: "Enter password",
        open: "Open room",
        backHome: "Back home",
      };

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-20 pt-4 text-arenaText md:px-8 md:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel ghost-grid rounded-shell border border-white/10 p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="label-copy inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-arenaMuted transition hover:bg-white/10 hover:text-white"
                >
                  {language === "ru" ? "Евровидение у Морозовых 2026" : "Morozov Eurovision 2026"}
                </Link>
                <Link
                  href={`/${roomSlug}`}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/[0.08]"
                >
                  {language === "ru" ? "Комната" : "Room"}: {roomSlug}
                </Link>
                {stageKey ? (
                  <span className="label-copy inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
                    {getStageLabel(stageKey)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isDisplayMode ? (
                  <Link
                    href="/account"
                    className="show-chip px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    {account ? (
                      <>
                        <UserAvatar
                          name={account.publicName}
                          emoji={account.emoji}
                          avatarUrl={account.avatarUrl}
                          avatarTheme={account.avatarTheme}
                          className="h-9 w-9"
                          textClass="text-xs"
                        />
                        <span className="max-w-[10rem] truncate">{account.publicName}</span>
                      </>
                    ) : (
                      accountCopy.navAccount
                    )}
                  </Link>
                ) : null}
                <LanguageSwitcher />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const href = item.key === "players"
                  ? `/${roomSlug}/players/overall`
                  : `/${roomSlug}/${item.key}/${stageKey || "semi1"}`;
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

            <div>
              {checkingAccess ? (
                <div className="show-card p-6 text-sm text-arenaMuted">{unlockCopy.loading}</div>
              ) : roomMissing ? (
                <div className="show-card p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{unlockCopy.missingTitle}</p>
                  <p className="mt-4 text-sm leading-7 text-arenaMuted">{unlockCopy.missingText}</p>
                  <div className="mt-5">
                    <Link href="/" className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm">
                      {unlockCopy.backHome}
                    </Link>
                  </div>
                </div>
              ) : needsRoomPassword ? (
                <div className="show-card max-w-2xl p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{unlockCopy.lockedTitle}</p>
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
                    {unlockError ? <div className="rounded-[1.2rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{unlockError}</div> : null}
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
