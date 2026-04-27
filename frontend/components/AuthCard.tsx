'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loginAccount, registerAccount, requestPasswordReset, resetPassword } from "../lib/api";
import { getAccountCopy } from "../lib/account-copy";
import { getLegalConfig, getLegalCopy } from "../lib/legal";
import type { PublicDisplayMode } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { useLanguage } from "./LanguageProvider";

type AuthMode = "register" | "login" | "requestReset" | "applyReset";

export function AuthCard({
  roomSlug,
  nextHref,
  forcedMode,
  initialMode,
  resetToken,
  onAuthenticated,
}: {
  roomSlug?: string;
  nextHref?: string | null;
  forcedMode?: AuthMode;
  initialMode?: Extract<AuthMode, "register" | "login">;
  resetToken?: string | null;
  onAuthenticated?: () => void;
}) {
  const { language } = useLanguage();
  const accountCopy = getAccountCopy(language);
  const legalCopy = getLegalCopy(language);
  const legalConfig = getLegalConfig(language);
  const { passwordResetMode, setAccount } = useAccount();
  const [mode, setMode] = useState<AuthMode>(
    forcedMode || (resetToken ? "applyReset" : initialMode || "register"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [publicDisplayMode, setPublicDisplayMode] = useState<PublicDisplayMode>("full_name");
  const [publicDisplayOptIn, setPublicDisplayOptIn] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [resetPreview, setResetPreview] = useState<string | null>(null);
  const resetDisabledText = language === "ru"
    ? "На этом деплое восстановление пароля по почте пока не настроено. Перед публичным запуском подключи почтовый провайдер."
    : "Password recovery email is not configured on this deployment yet. Connect a mail provider before public launch.";

  useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode);
    }
  }, [forcedMode]);

  useEffect(() => {
    if (!forcedMode && !resetToken && initialMode) {
      setMode(initialMode);
    }
  }, [forcedMode, initialMode, resetToken]);

  useEffect(() => {
    if (resetToken) {
      setMode("applyReset");
    }
  }, [resetToken]);

  const modeCopy = useMemo(() => {
    if (mode === "register") {
      return {
        title: accountCopy.auth.createTitle,
        text: accountCopy.auth.createText,
      };
    }
    if (mode === "login") {
      return {
        title: accountCopy.auth.loginTitle,
        text: accountCopy.auth.loginText,
      };
    }
    return mode === "requestReset"
      ? {
          title: accountCopy.auth.resetTitle,
          text: passwordResetMode === "disabled" ? resetDisabledText : accountCopy.auth.resetText,
        }
      : {
          title: accountCopy.auth.resetTitle,
          text: accountCopy.auth.passwordRule,
        };
  }, [accountCopy, mode, passwordResetMode, resetDisabledText]);

  async function handleSubmit() {
    setPending(true);
    setError("");
    setStatusText("");

    try {
      if (mode === "register") {
        const payload = await registerAccount({
          roomSlug,
          email,
          password,
          firstName,
          lastName,
          displayName,
          emoji: "",
          publicDisplayMode,
          publicDisplayOptIn,
          privacyAccepted,
        });
        setAccount(payload.account);
        setStatusText(accountCopy.auth.loggedInAs);
        onAuthenticated?.();
        return;
      }

      if (mode === "login") {
        const payload = await loginAccount({ roomSlug, email, password });
        setAccount(payload.account);
        setStatusText(accountCopy.auth.loggedInAs);
        onAuthenticated?.();
        return;
      }

      if (mode === "requestReset") {
        if (passwordResetMode === "disabled") {
          throw new Error(resetDisabledText);
        }
        const payload = await requestPasswordReset(email);
        setResetPreview(payload.previewResetUrl || payload.previewResetToken || null);
        setStatusText(payload.message || accountCopy.auth.previewReset);
        return;
      }

      const payload = await resetPassword(resetToken || "", nextPassword);
      setAccount(payload.account);
      setStatusText(accountCopy.auth.loggedInAs);
      onAuthenticated?.();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Auth request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="show-card p-5 md:p-6">
      <div className="grid gap-5">
        {!forcedMode && mode !== "requestReset" && mode !== "applyReset" ? (
          <div className="inline-flex w-full max-w-md rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
                mode === "login" ? "bg-white text-arenaBg shadow-pulse" : "text-arenaMuted hover:text-white"
              }`}
            >
              {accountCopy.auth.signIn}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
                mode === "register" ? "bg-white text-arenaBg shadow-pulse" : "text-arenaMuted hover:text-white"
              }`}
            >
              {accountCopy.auth.createAccount}
            </button>
          </div>
        ) : null}

        <div className="max-w-2xl">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{accountCopy.navAccount}</p>
          <h3 className="display-copy mt-2 text-2xl font-black md:text-4xl">{modeCopy.title}</h3>
          <p className="mt-3 text-sm text-arenaMuted">{modeCopy.text}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <input
            className="arena-input"
            placeholder={accountCopy.auth.email}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {mode !== "requestReset" ? (
            <input
              className="arena-input"
              placeholder={mode === "applyReset" ? accountCopy.auth.newPassword : accountCopy.auth.password}
              type="password"
              value={mode === "applyReset" ? nextPassword : password}
              onChange={(event) => (mode === "applyReset" ? setNextPassword(event.target.value) : setPassword(event.target.value))}
            />
          ) : null}

          {mode === "register" ? (
            <>
              <input
                className="arena-input"
                placeholder={accountCopy.auth.firstName}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <input
                className="arena-input"
                placeholder={accountCopy.auth.lastName}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
              <div className="lg:col-span-2">
                <input
                  className="arena-input"
                  placeholder={accountCopy.auth.displayName}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <p className="mt-2 text-xs text-arenaMuted">{accountCopy.auth.displayNameHint}</p>
              </div>
              <div className="show-panel p-4">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaMuted">{accountCopy.auth.displayName}</p>
                <select
                  className="arena-input mt-3"
                  value={publicDisplayMode}
                  onChange={(event) => setPublicDisplayMode(event.target.value as PublicDisplayMode)}
                >
                  {Object.entries(accountCopy.publicDisplayModes).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <label className="mt-4 flex items-start gap-3 text-sm text-arenaMuted">
                  <input
                    type="checkbox"
                    checked={publicDisplayOptIn}
                    onChange={(event) => setPublicDisplayOptIn(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/15 bg-transparent"
                  />
                  <span>{accountCopy.auth.publicDisplayOptIn}</span>
                </label>
                <p className="mt-3 text-xs text-arenaMuted">{legalCopy.accountConsentPublic}</p>
              </div>
              <label className="lg:col-span-2 flex items-start gap-3 text-sm text-arenaMuted">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/15 bg-transparent"
                />
                <span>
                  {accountCopy.auth.privacyAccepted}{" "}
                  <Link href="/legal/privacy" className="text-arenaBeam underline-offset-4 hover:underline">
                    {legalCopy.privacyHeadline}
                  </Link>{" "}
                  /{" "}
                  <Link href="/legal/cookies" className="text-arenaBeam underline-offset-4 hover:underline">
                    {legalCopy.cookiesHeadline}
                  </Link>
                </span>
              </label>
              <div className="show-panel lg:col-span-2 p-4 text-sm text-arenaMuted">
                <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{legalCopy.accountConsentTitle}</p>
                <div className="mt-3 grid gap-2">
                  <p>{legalCopy.accountConsentText}</p>
                  <p>{legalCopy.accountConsentPrivacy}</p>
                  <p>{legalCopy.accountConsentStorage}</p>
                  <p>
                    {legalCopy.operatorLabel}: <span className="text-white">{legalConfig.operatorName}</span>
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {mode === "requestReset" && resetPreview ? (
            <div className="show-panel lg:col-span-2 p-4 text-sm text-arenaMuted">
              <p className="label-copy text-[11px] uppercase tracking-[0.24em] text-arenaPulse">{accountCopy.auth.previewReset}</p>
              <p className="mt-2 break-all text-white">{resetPreview}</p>
            </div>
          ) : null}
        </div>

        {error ? <div className="rounded-[1.4rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        {statusText ? <div className="rounded-[1.4rem] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{statusText}</div> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="arena-button-primary h-12 px-6 text-sm"
          >
            {pending
              ? "..."
              : mode === "register"
                ? accountCopy.auth.createAccount
                : mode === "login"
                  ? accountCopy.auth.signIn
                  : mode === "requestReset"
                    ? accountCopy.auth.requestReset
                    : accountCopy.auth.applyReset}
          </button>

          {!forcedMode && mode === "requestReset" ? (
            <>
              <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => setMode("login")}>
                {accountCopy.auth.switchToLogin}
              </button>
              <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => setMode("register")}>
                {accountCopy.auth.switchToCreate}
              </button>
            </>
          ) : null}
          {!forcedMode && passwordResetMode !== "disabled" && mode !== "requestReset" ? (
            <button type="button" className="arena-button-secondary px-5 py-3 text-sm" onClick={() => setMode("requestReset")}>
              {accountCopy.auth.switchToReset}
            </button>
          ) : null}
          {nextHref ? (
            <Link href={nextHref} className="arena-button-secondary inline-flex items-center px-5 py-3 text-sm">
              {accountCopy.auth.manageAccount}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
