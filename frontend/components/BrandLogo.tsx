'use client';

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type BrandLogoVariant = "compact" | "header" | "hero";

const variantClass: Record<BrandLogoVariant, string> = {
  compact: "h-9 max-w-[10.5rem] sm:h-10 sm:max-w-[12.5rem] md:h-11 md:max-w-[15rem]",
  header: "h-10 max-w-[12.5rem] sm:h-12 sm:max-w-[15rem] md:h-14 md:max-w-[21rem] lg:h-16 lg:max-w-[27rem]",
  hero: "h-14 max-w-[17rem] sm:h-16 sm:max-w-[22rem] md:h-20 md:max-w-[34rem] lg:h-24 lg:max-w-[44rem]",
};

export function BrandLogo({
  href = "/",
  variant = "header",
  className = "",
  imageClassName = "",
}: {
  href?: string;
  variant?: BrandLogoVariant;
  className?: string;
  imageClassName?: string;
}) {
  const { language } = useLanguage();
  const isRussian = language === "ru";

  return (
    <Link
      href={href}
      className={`inline-flex min-w-0 shrink-0 items-center py-1 transition-opacity hover:opacity-95 ${className}`}
      aria-label={isRussian ? "Евровидение у Морозовых 2026" : "Eurovision at the Morozovs 2026"}
    >
      <img
        src={isRussian ? "/logo-ru.png" : "/logo-en.png"}
        alt={isRussian ? "Евровидение у Морозовых 2026" : "Eurovision at the Morozovs 2026"}
        className={`block w-auto object-contain ${variantClass[variant]} ${imageClassName}`}
      />
    </Link>
  );
}
