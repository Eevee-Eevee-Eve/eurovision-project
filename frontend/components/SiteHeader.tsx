'use client';

import Link from "next/link";
import { BarChart3, Home, Menu, Play, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "./AccountProvider";
import { BrandLogo } from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";
import { UserAvatar } from "./UserAvatar";

const navItems = [
  { href: "/", labelRu: "Комнаты", labelEn: "Rooms", icon: Home },
  { href: "/stats", labelRu: "Статистика", labelEn: "Stats", icon: BarChart3 },
  { href: "/account", labelRu: "Профиль", labelEn: "Profile", icon: UserRound },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastRoom, setLastRoom] = useState<{ slug: string; name: string; stage: string } | null>(null);
  const { account } = useAccount();
  const { getDisplayName, language } = useLanguage();

  useEffect(() => {
    const slug = window.localStorage.getItem("last_room_slug");
    if (!slug) return;
    setLastRoom({
      slug,
      name: window.localStorage.getItem("last_room_name") || slug,
      stage: window.localStorage.getItem("last_room_stage") || "semi1",
    });
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandLogo variant="compact" />

        <nav className="site-nav-desktop" aria-label={language === "ru" ? "Навигация" : "Navigation"}>
          {lastRoom ? (
            <Link href={`/${lastRoom.slug}/vote/${lastRoom.stage}`} className="site-nav-link site-nav-link-return" title={lastRoom.name}>
              <Play size={15} />
              <span>{language === "ru" ? "Последняя" : "Last room"}</span>
            </Link>
          ) : null}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href} className={`site-nav-link ${active ? "site-nav-link-active" : ""}`}>
                <Icon size={15} />
                <span>{language === "ru" ? item.labelRu : item.labelEn}</span>
              </Link>
            );
          })}
        </nav>

        <div className="site-header-actions">
          <div className="site-language-inline">
            <LanguageSwitcher />
          </div>
          <Link
            href="/account"
            className="site-account-button"
            aria-label={language === "ru" ? "Профиль" : "Profile"}
            title={language === "ru" ? "Профиль" : "Profile"}
          >
            {account ? (
              <UserAvatar
                name={getDisplayName(account.publicName)}
                avatarUrl={account.avatarUrl}
                avatarTheme={account.avatarTheme}
                className="h-full w-full"
                textClass="text-[0.9rem]"
              />
            ) : (
              <UserRound size={18} />
            )}
          </Link>
          <button
            type="button"
            className="site-menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? (language === "ru" ? "Закрыть меню" : "Close menu") : (language === "ru" ? "Открыть меню" : "Open menu")}
            aria-expanded={open}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="site-mobile-menu">
          <div className="site-mobile-language">
            <LanguageSwitcher />
          </div>
          {lastRoom ? (
            <Link
              href={`/${lastRoom.slug}/vote/${lastRoom.stage}`}
              onClick={() => setOpen(false)}
              className="site-mobile-link site-mobile-link-return"
              title={lastRoom.name}
            >
              <Play size={17} />
              <span>{language === "ru" ? "Последняя комната" : "Last room"}</span>
            </Link>
          ) : null}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`site-mobile-link ${active ? "site-mobile-link-active" : ""}`}
              >
                <Icon size={17} />
                <span>{language === "ru" ? item.labelRu : item.labelEn}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
