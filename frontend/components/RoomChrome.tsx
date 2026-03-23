'use client';

import Link from "next/link";
import { Monitor, NotebookPen, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { getAccountCopy } from "../lib/account-copy";
import type { StageKey } from "../lib/types";
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

            <div>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
