'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  changePassword,
  deleteAccount,
  deleteAccountAvatar,
  logoutAccount,
  updateAccountProfile,
  uploadAccountAvatar,
} from "../lib/api";
import { getAccountCopy } from "../lib/account-copy";
import { getLegalConfig, getLegalCopy } from "../lib/legal";
import type { PublicDisplayMode } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { AuthCard } from "./AuthCard";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

async function imageFileToSquareDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const offsetX = Math.floor((bitmap.width - side) / 2);
  const offsetY = Math.floor((bitmap.height - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable");
  }

  context.drawImage(bitmap, offsetX, offsetY, side, side, 0, 0, 256, 256);
  return canvas.toDataURL("image/webp", 0.9);
}

function formatTimestamp(timestamp: string | null, language: "ru" | "en") {
  if (!timestamp) {
    return language === "ru" ? "не записано" : "not recorded";
  }

  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function AccountStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const accountCopy = getAccountCopy(language);
  const legalCopy = getLegalCopy(language);
  const legalConfig = getLegalConfig(language);
  const { account, loading, setAccount } = useAccount();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [publicDisplayMode, setPublicDisplayMode] = useState<PublicDisplayMode>("full_name");
  const [publicDisplayOptIn, setPublicDisplayOptIn] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const resetToken = searchParams.get("token");
  const nextHref = searchParams.get("next");
  const forcedMode = useMemo<"applyReset" | undefined>(() => (resetToken ? "applyReset" : undefined), [resetToken]);

  useEffect(() => {
    if (!account) return;
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setDisplayName(account.displayName);
    setEmoji(account.emoji);
    setPublicDisplayMode(account.publicDisplayMode);
    setPublicDisplayOptIn(account.publicDisplayOptIn);
  }, [account]);

  if (loading) {
    return <div className="show-card p-6 text-sm text-arenaMuted">Загружаю аккаунт...</div>;
  }

  if (!account) {
    return (
      <AuthCard
        forcedMode={forcedMode}
        resetToken={resetToken}
        nextHref={nextHref}
        onAuthenticated={() => {
          if (nextHref) {
            router.push(nextHref);
          }
        }}
      />
    );
  }

  async function handleProfileSave() {
    setPending(true);
    setError("");
    setStatusText("");
    try {
      const payload = await updateAccountProfile({
        firstName,
        lastName,
        displayName,
        emoji,
        publicDisplayMode,
        publicDisplayOptIn,
      });
      setAccount(payload.account);
      setStatusText(accountCopy.account.saved);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Profile update failed");
    } finally {
      setPending(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPending(true);
    setError("");
    setStatusText("");
    try {
      const imageDataUrl = await imageFileToSquareDataUrl(file);
      const payload = await uploadAccountAvatar(imageDataUrl);
      setAccount(payload.account);
      setStatusText(accountCopy.account.avatarSaved);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Avatar upload failed");
    } finally {
      setPending(false);
      event.target.value = "";
    }
  }

  async function handleAvatarDelete() {
    setPending(true);
    setError("");
    setStatusText("");
    try {
      const payload = await deleteAccountAvatar();
      setAccount(payload.account);
      setStatusText(accountCopy.account.avatarRemoved);
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Avatar remove failed");
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordChange() {
    setPending(true);
    setError("");
    setStatusText("");
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setStatusText(accountCopy.account.passwordChanged);
    } catch (passwordError) {
      console.error(passwordError);
      setError(passwordError instanceof Error ? passwordError.message : "Password change failed");
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    await logoutAccount();
    setAccount(null);
    router.refresh();
  }

  async function handleDeleteAccount() {
    const confirmationText = language === "ru"
      ? "Удалить аккаунт и все результаты этой учетной записи?"
      : "Delete this account and all results linked to it?";
    if (!window.confirm(confirmationText)) {
      return;
    }

    setPending(true);
    setError("");
    setStatusText("");
    try {
      await deleteAccount();
      setAccount(null);
      setStatusText(accountCopy.account.accountDeleted);
      router.push("/");
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="show-card p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{accountCopy.navAccount}</p>
            <h1 className="display-copy mt-2 text-3xl font-black md:text-5xl">{accountCopy.account.title}</h1>
            <p className="mt-3 max-w-2xl text-sm text-arenaMuted">{accountCopy.account.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <UserAvatar
              name={account.publicName}
              emoji={account.emoji}
              avatarUrl={account.avatarUrl}
              avatarTheme={account.avatarTheme}
              className="h-16 w-16"
              textClass="text-xl"
            />
            <div>
              <p className="text-lg font-semibold text-white">{account.publicName}</p>
              <p className="text-sm text-arenaMuted">{account.email}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {statusText ? <div className="rounded-[1.4rem] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{statusText}</div> : null}

      <section className="show-card p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{accountCopy.account.profileTitle}</p>
            <p className="mt-3 text-sm text-arenaMuted">{accountCopy.account.profileText}</p>
          </div>
          <div className="grid gap-3">
            <input className="arena-input" placeholder={accountCopy.auth.firstName} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            <input className="arena-input" placeholder={accountCopy.auth.lastName} value={lastName} onChange={(event) => setLastName(event.target.value)} />
            <input className="arena-input" placeholder={accountCopy.auth.displayName} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <input className="arena-input" placeholder={accountCopy.auth.emoji} value={emoji} onChange={(event) => setEmoji(event.target.value.slice(0, 4))} />
            <select className="arena-input" value={publicDisplayMode} onChange={(event) => setPublicDisplayMode(event.target.value as PublicDisplayMode)}>
              {Object.entries(accountCopy.publicDisplayModes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <label className="flex items-start gap-3 text-sm text-arenaMuted">
              <input type="checkbox" checked={publicDisplayOptIn} onChange={(event) => setPublicDisplayOptIn(event.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>{accountCopy.auth.publicDisplayOptIn}</span>
            </label>
            <p className="text-xs text-arenaMuted">{legalCopy.accountConsentPublic}</p>
            <button type="button" className="arena-button-primary h-12 px-6 text-sm" disabled={pending} onClick={handleProfileSave}>
              {accountCopy.account.saveProfile}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{accountCopy.account.avatarTitle}</p>
          <p className="mt-3 text-sm text-arenaMuted">{accountCopy.account.avatarText}</p>
          <p className="mt-3 text-xs text-arenaMuted">{legalCopy.accountConsentStorage}</p>
          <div className="mt-5 flex items-center gap-4">
            <UserAvatar
              name={account.publicName}
              emoji={account.emoji}
              avatarUrl={account.avatarUrl}
              avatarTheme={account.avatarTheme}
              className="h-20 w-20"
              textClass="text-2xl"
            />
            <div className="flex flex-wrap gap-3">
              <label className="arena-button-secondary cursor-pointer px-5 py-3 text-sm">
                {accountCopy.account.uploadAvatar}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} />
              </label>
              {account.avatarUrl ? (
                <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={handleAvatarDelete}>
                  {accountCopy.account.removeAvatar}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{accountCopy.account.securityTitle}</p>
          <p className="mt-3 text-sm text-arenaMuted">{accountCopy.account.securityText}</p>
          <div className="mt-5 grid gap-3">
            <input className="arena-input" type="password" placeholder={accountCopy.auth.currentPassword} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <input className="arena-input" type="password" placeholder={accountCopy.auth.newPassword} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
            <button type="button" className="arena-button-primary h-12 px-6 text-sm" disabled={pending} onClick={handlePasswordChange}>
              {accountCopy.account.changePassword}
            </button>
          </div>
        </div>
      </section>

      <section className="show-card p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{legalCopy.accountConsentTitle}</p>
            <p className="mt-3 text-sm text-arenaMuted">{legalCopy.accountConsentText}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/legal/privacy" className="text-arenaBeam underline-offset-4 hover:underline">{accountCopy.account.privacyLink}</Link>
              <Link href="/legal/cookies" className="text-arenaBeam underline-offset-4 hover:underline">{accountCopy.account.cookiesLink}</Link>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaBeam">{legalCopy.operatorLabel}</p>
              <p className="mt-2 text-sm text-white">{legalConfig.operatorName}</p>
            </div>
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaBeam">{legalCopy.contactLabel}</p>
              <p className="mt-2 text-sm text-white">{legalConfig.operatorContact}</p>
            </div>
            <div className="show-panel p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaBeam">{legalCopy.accountConsentTimeline}</p>
              <div className="mt-3 grid gap-2 text-sm text-arenaMuted">
                <p>
                  {legalCopy.privacyHeadline}: <span className="text-white">{formatTimestamp(account.consents.privacyAcceptedAt, language)}</span>
                </p>
                <p>
                  {language === "ru" ? "Публичный профиль" : "Public display"}:{" "}
                  <span className="text-white">{formatTimestamp(account.consents.publicDisplayAcceptedAt, language)}</span>
                </p>
                <p>
                  {legalCopy.retentionLabel}: <span className="text-white">{legalConfig.retentionNotice}</span>
                </p>
                <p>
                  {legalCopy.regionLabel}: <span className="text-white">{legalConfig.dataRegion}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="show-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{accountCopy.account.dangerTitle}</p>
            <p className="mt-3 text-sm text-arenaMuted">{accountCopy.account.dangerText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={handleLogout}>
              {accountCopy.auth.signOut}
            </button>
            <button type="button" className="rounded-full bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25" disabled={pending} onClick={handleDeleteAccount}>
              {accountCopy.account.deleteAccount}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
