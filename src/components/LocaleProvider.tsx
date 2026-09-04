"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LOCALE_STORAGE_KEY, normalizeLocale, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  override: Locale | null;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<Locale | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        const next = normalizeLocale(stored);
        setOverride(next);
        document.documentElement.lang = next;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setOverride(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({ override, setLocale }),
    [override, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useUiLocale(fallback: Locale = "he"): Locale {
  const ctx = useContext(LocaleContext);
  return ctx?.override ?? fallback;
}

export function useLocaleControls(fallback: Locale = "he") {
  const ctx = useContext(LocaleContext);
  const locale = ctx?.override ?? fallback;
  return {
    locale,
    setLocale: ctx?.setLocale ?? (() => undefined),
  };
}
