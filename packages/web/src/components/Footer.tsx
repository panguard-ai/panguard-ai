import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-brand-border bg-brand-dark py-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <div className="mb-4 text-lg font-bold">
          <span className="text-brand-cyan">&gt;_</span> Panguard AI
        </div>
        <p className="mb-2 text-sm text-brand-muted">
          {t(
            'AI-Driven Adaptive Endpoint Protection',
            'AI 驅動的自適應端點防護平台',
          )}
        </p>
        <p className="text-xs text-brand-muted/60">
          {t(
            'Built by the OpenClaw Security team',
            '由 OpenClaw Security 團隊打造',
          )}
        </p>
      </div>
    </footer>
  );
}
