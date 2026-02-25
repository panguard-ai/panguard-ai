import { useState, useMemo, useCallback } from 'react';
import type { GuidanceAnswers, GuidanceStepType, PersonaType } from '@openclaw/panguard-web';
import {
  getGuidanceStep,
  getNextStep,
  getPreviousStep,
  generateGuidanceResult,
  getProductFeature,
  getPricingPlan,
} from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';
import StepProgress from './StepProgress';
import CopyCommand from './CopyCommand';

export default function GuidanceWizard() {
  const { language, t } = useLanguage();
  const [currentStepType, setCurrentStepType] = useState<GuidanceStepType>('welcome');
  const [answers, setAnswers] = useState<GuidanceAnswers>({});

  const currentStep = getGuidanceStep(currentStepType)!;
  const title = language === 'en' ? currentStep.titleEn : currentStep.titleZh;
  const description = language === 'en' ? currentStep.descriptionEn : currentStep.descriptionZh;

  const result = useMemo(
    () => generateGuidanceResult(answers, language),
    [answers, language],
  );

  const goNext = useCallback(() => {
    const next = getNextStep(currentStepType);
    if (next) setCurrentStepType(next.type);
  }, [currentStepType]);

  const goBack = useCallback(() => {
    const prev = getPreviousStep(currentStepType);
    if (prev) setCurrentStepType(prev.type);
  }, [currentStepType]);

  const selectPersona = useCallback((persona: PersonaType) => {
    setAnswers((prev) => ({ ...prev, persona }));
  }, []);

  const toggleServer = useCallback((has: boolean) => {
    setAnswers((prev) => ({ ...prev, hasServer: has }));
  }, []);

  const selectChannel = useCallback((channel: GuidanceAnswers['notificationChannel']) => {
    setAnswers((prev) => ({ ...prev, notificationChannel: channel }));
  }, []);

  const renderStepContent = () => {
    switch (currentStepType) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="mb-6 text-6xl">
              <span className="gradient-text font-mono">&gt;_</span>
            </div>
            <button onClick={goNext} className="btn-primary">
              {t("Let's Go", '開始吧')}
            </button>
          </div>
        );

      case 'persona_select':
        return (
          <div className="grid gap-4 md:grid-cols-3">
            {currentStep.options?.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  selectPersona(opt.id as PersonaType);
                  goNext();
                }}
                className={`card text-left transition-all hover:border-brand-cyan/50 ${
                  answers.persona === opt.id ? 'border-brand-cyan' : ''
                }`}
              >
                <h4 className="mb-1 font-semibold">
                  {language === 'en' ? opt.labelEn : opt.labelZh}
                </h4>
                <p className="text-sm text-brand-muted">
                  {language === 'en' ? opt.descriptionEn : opt.descriptionZh}
                </p>
              </button>
            ))}
          </div>
        );

      case 'threat_assessment':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {currentStep.options?.map((opt) => {
                const isSelected =
                  (opt.id === 'has_server' && answers.hasServer) ||
                  (opt.id === 'has_webapp' && answers.hasWebApp) ||
                  (opt.id === 'has_database' && answers.hasDatabase);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.id === 'has_server') toggleServer(!answers.hasServer);
                      else if (opt.id === 'has_webapp')
                        setAnswers((prev) => ({ ...prev, hasWebApp: !prev.hasWebApp }));
                      else if (opt.id === 'has_database')
                        setAnswers((prev) => ({ ...prev, hasDatabase: !prev.hasDatabase }));
                    }}
                    className={`card text-left transition-all ${
                      isSelected ? 'border-brand-cyan bg-brand-cyan/5' : 'hover:border-brand-cyan/30'
                    }`}
                  >
                    <h4 className="mb-1 font-semibold">
                      {language === 'en' ? opt.labelEn : opt.labelZh}
                    </h4>
                    <p className="text-sm text-brand-muted">
                      {language === 'en' ? opt.descriptionEn : opt.descriptionZh}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="text-center">
              <button onClick={goNext} className="btn-primary">
                {t('Continue', '繼續')}
              </button>
            </div>
          </div>
        );

      case 'product_recommendation': {
        const plan = getPricingPlan(result.recommendedPlan);
        return (
          <div className="space-y-6">
            {plan && (
              <div className="card-highlighted mx-auto max-w-md text-center">
                <p className="mb-1 text-sm text-brand-muted">{t('Recommended Plan', '推薦方案')}</p>
                <h3 className="text-2xl font-bold text-brand-cyan">
                  {language === 'en' ? plan.nameEn : plan.nameZh}
                </h3>
                <p className="text-brand-muted">
                  {language === 'en' ? plan.priceDisplayEn : plan.priceDisplayZh}
                </p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {result.recommendedProducts.map((product) => {
                const feat = getProductFeature(product);
                if (!feat) return null;
                return (
                  <div key={product} className="card">
                    <span className="font-mono text-sm font-bold text-brand-cyan">{feat.product}</span>
                    <p className="mt-1 text-sm text-brand-muted">
                      {language === 'en' ? feat.headlineEn : feat.headlineZh}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <button onClick={goNext} className="btn-primary">
                {t('Continue', '繼續')}
              </button>
            </div>
          </div>
        );
      }

      case 'notification_setup':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {currentStep.options?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    selectChannel(opt.id as GuidanceAnswers['notificationChannel']);
                    goNext();
                  }}
                  className={`card text-left transition-all hover:border-brand-cyan/50 ${
                    answers.notificationChannel === opt.id ? 'border-brand-cyan' : ''
                  }`}
                >
                  <h4 className="mb-1 font-semibold">
                    {language === 'en' ? opt.labelEn : opt.labelZh}
                  </h4>
                  <p className="text-sm text-brand-muted">
                    {language === 'en' ? opt.descriptionEn : opt.descriptionZh}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'installation':
        return (
          <div className="mx-auto max-w-xl space-y-6">
            <CopyCommand command={result.installCommand} />
            <div className="space-y-3">
              <p className="text-sm font-semibold text-brand-muted">
                {t('Setup Steps:', '設定步驟：')}
              </p>
              {result.configSteps.map((step, i) => (
                <p key={i} className="text-sm text-brand-muted">{step}</p>
              ))}
            </div>
            <p className="text-center text-sm text-brand-muted">
              {t('Estimated setup time:', '預估設定時間：')}{' '}
              <span className="font-semibold text-brand-cyan">{result.estimatedSetupTime}</span>
            </p>
            <div className="text-center">
              <button onClick={goNext} className="btn-primary">
                {t('Done!', '完成!')}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="mb-4 text-5xl">
              <span className="gradient-text font-mono">[OK]</span>
            </div>
            <p className="mb-6 text-brand-muted">
              {t(
                'Panguard AI is now learning your environment. You will receive your first security summary in 24 hours.',
                'Panguard AI 正在學習你的環境。你會在 24 小時內收到第一份資安摘要。',
              )}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <StepProgress currentStep={currentStep.stepNumber} />

      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">{title}</h2>
        <p className="text-brand-muted">{description}</p>
      </div>

      {renderStepContent()}

      {currentStepType !== 'welcome' && currentStepType !== 'complete' && (
        <div className="mt-8 text-center">
          <button onClick={goBack} className="text-sm text-brand-muted hover:text-brand-text">
            {t('Back', '上一步')}
          </button>
        </div>
      )}
    </div>
  );
}
