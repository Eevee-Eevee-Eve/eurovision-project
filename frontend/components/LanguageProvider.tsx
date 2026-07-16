'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getBoardLabel,
  getCopy,
  getCountryName,
  getLocalizedActBlurb,
  getLocalizedActContext,
  getLocalizedActFacts,
  getRoomName,
  getRoomCityLabel,
  getRoomTagline,
  getStageLabel,
  localizeTextForLanguage,
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

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  const { language } = context;
  const copy = useMemo(() => getCopy(language), [language]);
  const getStageLabelValue = useCallback((stageKey: StageKey) => getStageLabel(language, stageKey), [language]);
  const getBoardLabelValue = useCallback((boardKey: BoardKey) => getBoardLabel(language, boardKey), [language]);
  const getCountryNameValue = useCallback((code: string, fallback: string) => getCountryName(language, code, fallback), [language]);
  const getDisplayNameValue = useCallback((fallback: string) => localizeTextForLanguage(language, fallback), [language]);
  const getRoomNameValue = useCallback((roomSlug: string, fallback: string) => getRoomName(language, roomSlug, fallback), [language]);
  const getRoomTaglineValue = useCallback((roomSlug: string, fallback: string) => getRoomTagline(language, roomSlug, fallback), [language]);
  const getRoomCityLabelValue = useCallback((roomSlug: string, fallback: string) => getRoomCityLabel(language, roomSlug, fallback), [language]);
  const getActFactsValue = useCallback((act: ActEntry) => getLocalizedActFacts(language, act), [language]);
  const getActBlurbValue = useCallback((act: ActEntry) => getLocalizedActBlurb(language, act), [language]);
  const getActContextValue = useCallback((act: ActEntry) => getLocalizedActContext(language, act), [language]);

  return useMemo(() => ({
    ...context,
    copy,
    getStageLabel: getStageLabelValue,
    getBoardLabel: getBoardLabelValue,
    getCountryName: getCountryNameValue,
    getDisplayName: getDisplayNameValue,
    getRoomName: getRoomNameValue,
    getRoomTagline: getRoomTaglineValue,
    getRoomCityLabel: getRoomCityLabelValue,
    getActFacts: getActFactsValue,
    getActBlurb: getActBlurbValue,
    getActContext: getActContextValue,
  }), [
    context,
    copy,
    getActBlurbValue,
    getActContextValue,
    getActFactsValue,
    getBoardLabelValue,
    getCountryNameValue,
    getDisplayNameValue,
    getRoomCityLabelValue,
    getRoomNameValue,
    getRoomTaglineValue,
    getStageLabelValue,
  ]);
}
