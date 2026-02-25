import { PRODUCT_FEATURES, getAllPersonas } from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';
import FeatureCard from '../components/FeatureCard';
import { Link } from 'react-router-dom';

export default function FeaturesPage() {
  const { language, t } = useLanguage();
  const personas = getAllPersonas();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">
          {t('Product Features', '產品功能')}
        </h1>
        <p className="mx-auto max-w-2xl text-brand-muted">
          {t(
            'Panguard AI integrates five specialized modules into a unified security platform, designed for organizations without dedicated security teams.',
            'Panguard AI 將五個專業模組整合為統一的資安平台，專為沒有專職資安團隊的組織設計。',
          )}
        </p>
      </div>

      {/* Product Feature Cards */}
      <section className="mb-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_FEATURES.map((feature) => (
            <FeatureCard key={feature.product} feature={feature} />
          ))}
        </div>
      </section>

      {/* Scenarios per Persona */}
      <section className="mb-20">
        <h2 className="section-title">
          {t('Real-World Scenarios', '實際應用場景')}
        </h2>
        <div className="space-y-12">
          {personas.map((persona) => (
            <div key={persona.type} className="card">
              <div className="mb-6">
                <span className="mb-2 inline-block rounded-full bg-brand-cyan/10 px-3 py-1 text-sm font-semibold text-brand-cyan">
                  {language === 'en' ? persona.nameEn : persona.nameZh}
                </span>
                <p className="text-brand-muted">
                  {language === 'en' ? persona.descriptionEn : persona.descriptionZh}
                </p>
              </div>

              {/* Pain Points */}
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                  {t('Challenges', '面臨的挑戰')}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(language === 'en' ? persona.painPointsEn : persona.painPointsZh).map(
                    (point, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm"
                      >
                        {point}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Scenarios */}
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-muted">
                  {t('How Panguard AI Helps', 'Panguard AI 如何幫助')}
                </h4>
                <div className="space-y-4">
                  {persona.scenarios.map((scenario) => (
                    <div key={scenario.id} className="rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 p-4">
                      <p className="mb-2 font-semibold text-brand-cyan">
                        {scenario.threatType}
                      </p>
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                          {t('Before', '使用前')}
                        </p>
                        <p className="text-sm text-brand-muted">
                          {language === 'en' ? scenario.beforeEn : scenario.beforeZh}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                          {t('After', '使用後')}
                        </p>
                        <p className="text-sm text-brand-muted">
                          {language === 'en' ? scenario.afterEn : scenario.afterZh}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="mb-4 text-2xl font-bold">
          {t('Find the Right Setup', '找到適合的方案')}
        </h2>
        <p className="mb-6 text-brand-muted">
          {t(
            'Use our interactive guide to get a personalized recommendation.',
            '使用我們的互動指南，取得個人化推薦方案。',
          )}
        </p>
        <Link to="/guide" className="btn-primary">
          {t('Start Guide', '開始指南')}
        </Link>
      </section>
    </div>
  );
}
