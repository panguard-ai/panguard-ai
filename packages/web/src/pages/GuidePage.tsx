import { useLanguage } from '../context/LanguageContext';
import GuidanceWizard from '../components/GuidanceWizard';

export default function GuidePage() {
  const { t } = useLanguage();

  return (
    <div className="px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">
          {t('Setup Guide', '設定指南')}
        </h1>
        <p className="mx-auto max-w-2xl text-brand-muted">
          {t(
            'Answer a few questions and we will recommend the right Panguard AI setup for your needs.',
            '回答幾個問題，我們將為你推薦適合的 Panguard AI 設定方案。',
          )}
        </p>
      </div>

      <GuidanceWizard />
    </div>
  );
}
