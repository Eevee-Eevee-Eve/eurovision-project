'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getBoardLabel,
  getCopy,
  getCountryName,
  getLocalizedActBlurb,
  getLocalizedActContext,
  getLocalizedActFacts,
  getRoomCityLabel,
  getRoomTagline,
  getStageLabel,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "../lib/i18n";
import type { ActEntry, BoardKey, StageKey } from "../lib/types";

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "ru" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  const value = {
    language,
    setLanguage: (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    },
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  const copy = getCopy(context.language);

  return {
    ...context,
    copy,
    getStageLabel: (stageKey: StageKey) => getStageLabel(context.language, stageKey),
    getBoardLabel: (boardKey: BoardKey) => getBoardLabel(context.language, boardKey),
    getCountryName: (code: string, fallback: string) => getCountryName(context.language, code, fallback),
    getRoomTagline: (roomSlug: string, fallback: string) => getRoomTagline(context.language, roomSlug, fallback),
    getRoomCityLabel: (roomSlug: string, fallback: string) => getRoomCityLabel(context.language, roomSlug, fallback),
    getActFacts: (act: ActEntry) => getLocalizedActFacts(context.language, act),
    getActBlurb: (act: ActEntry) => getLocalizedActBlurb(context.language, act),
    getActContext: (act: ActEntry) => getLocalizedActContext(context.language, act),
  };
}
