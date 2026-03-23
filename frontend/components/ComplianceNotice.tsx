'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLegalCopy } from "../lib/legal";
import { useLanguage } from "./LanguageProvider";

const STORAGE_KEY = "esc-compliance-notice-dismissed";

export function ComplianceNotice() {
  const { language } = useLanguage();
  const legalCopy = getLegalCopy(language);
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const hiddenOnInteractiveRoutes = Boolean(
    pathname && (
      pathname.startsWith("/admin") ||
      pathname.includes("/vote/") ||
      pathname.includes("/acts/") ||
      pathname.includes("/live/") ||
      pathname.includes("/players/")
    ),
  );

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    setVisible(dismissed !== "1");
  }, []);

  if (!visible || hiddenOnInteractiveRoutes) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-4xl rounded-[1.4rem] border border-white/10 bg-arenaSurface/95 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-arenaMuted">{legalCopy.complianceNotice}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/legal/privacy" className="text-arenaBeam underline-offset-4 hover:underline">{legalCopy.privacyHeadline}</Link>
          <Link href="/legal/cookies" className="text-arenaBeam underline-offset-4 hover:underline">{legalCopy.cookiesHeadline}</Link>
          <button
            type="button"
            className="text-white"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "1");
              setVisible(false);
            }}
          >
            {legalCopy.dismissNotice}
          </button>
        </div>
      </div>
    </div>
  );
}
