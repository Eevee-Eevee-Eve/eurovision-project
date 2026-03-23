'use client';

import type { Language } from "../lib/i18n";
import { useLanguage } from "./LanguageProvider";

const options: Language[] = ["ru", "en"];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex rounded-full bg-white/5 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`label-copy rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em] transition ${
            language === option ? "bg-arenaSurfaceMax text-white shadow-glow" : "text-arenaMuted hover:text-white"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
