import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { WebLanguage } from '@openclaw/panguard-web';

interface LanguageContextType {
  language: WebLanguage;
  setLanguage: (lang: WebLanguage) => void;
  toggleLanguage: () => void;
  t: (en: string, zh: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<WebLanguage>('zh-TW');

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'zh-TW' ? 'en' : 'zh-TW'));
  }, []);

  const t = useCallback(
    (en: string, zh: string) => (language === 'en' ? en : zh),
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
