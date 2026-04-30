import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Lang } from '../i18n';
import { t as translate } from '../i18n';

interface LangCtx {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LangCtx>({
  lang: 'en',
  toggle: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('lang') as Lang) ?? 'en'
  );

  const toggle = useCallback(() => {
    setLang(l => {
      const next: Lang = l === 'en' ? 'zh' : 'en';
      localStorage.setItem('lang', next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
