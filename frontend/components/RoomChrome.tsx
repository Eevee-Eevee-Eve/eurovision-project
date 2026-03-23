'use client';

import Link from "next/link";
import { House, Monitor, NotebookPen, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { getAccountCopy } from "../lib/account-copy";
import type { StageKey } from "../lib/types";
import { useAccount } from "./AccountProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

const navItems = [
  { key: "room", labelKey: "room", icon: House },
  { key: "vote", labelKey: "vote", icon: NotebookPen },
  { key: "acts", labelKey: "acts", icon: Users },
  { key: "live", labelKey: "live", icon: Trophy },
  { key: "players", labelKey: "players", icon: Monitor },
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
  const { copy, getStageLabel, language } = useLanguage();
  const { account } = useAccount();
  const accountCopy = getAccountCopy(language);
  const pageCopy = copy.pages[pageKey];

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass-panel ghost-grid rounded-shell border border-white/10 p-4 md:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Link
                  href="/"
                  className="label-copy inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-arenaMuted transition hover:bg-white/10 hover:text-white"
                >
                  {copy.nav.portal}
                </Link>
                <p className="label-copy mt-4 text-xs uppercase tracking-[0.35em] text-arenaPulse">{pageCopy.kicker}</p>
                <h1 className="display-copy mt-3 text-4xl font-black tracking-tight md:text-6xl">{pageCopy.title}</h1>
                {pageCopy.description ? <p className="mt-3 max-w-2xl text-sm text-arenaMuted md:text-base">{pageCopy.description}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
                {stageKey ? (
                  <div className="label-copy rounded-full bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.22em] text-arenaText shadow-pulse">
                    {getStageLabel(stageKey)}
                  </div>
                ) : null}
                <LanguageSwitcher />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const href = item.key === "room"
                  ? `/${roomSlug}`
                  : item.key === "players"
                    ? `/${roomSlug}/players/overall`
                    : `/${roomSlug}/${item.key}/${stageKey || "semi1"}`;

                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`rounded-[1.6rem] px-4 py-3 transition ${
                      pageKey === item.key
                        ? "bg-arenaSurfaceHi text-white shadow-glow"
                        : "bg-white/5 text-arenaMuted hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="label-copy flex items-center gap-3 text-sm uppercase tracking-[0.18em]">
                      <Icon size={18} />
                      {copy.nav[item.labelKey]}
                    </span>
                  </Link>
                );
              })}
            </div>

            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
