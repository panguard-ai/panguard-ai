import { useLanguage } from '../context/LanguageContext';

export default function CliAuthSuccess() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-brand-cyan/50 bg-brand-card p-8 text-center">
        <div className="mb-4 text-4xl text-brand-cyan">&gt;_</div>
        <h2 className="mb-3 text-xl font-bold text-brand-text">
          {t('Authentication Successful', '\u8A8D\u8B49\u6210\u529F')}
        </h2>
        <p className="mb-6 text-brand-muted">
          {t(
            'You can close this browser tab and return to your terminal.',
            '\u53EF\u4EE5\u95DC\u9589\u6B64\u700F\u89BD\u5668\u5206\u9801\u4E26\u56DE\u5230\u7D42\u7AEF\u6A5F\u3002',
          )}
        </p>
        <div className="rounded-lg bg-brand-dark px-4 py-3 font-mono text-sm text-brand-cyan">
          $ panguard whoami
        </div>
        <p className="mt-3 text-xs text-brand-muted">
          {t(
            'Run this command to verify your login.',
            '\u57F7\u884C\u6B64\u6307\u4EE4\u4F86\u9A57\u8B49\u767B\u5165\u72C0\u614B\u3002',
          )}
        </p>
      </div>
    </div>
  );
}
