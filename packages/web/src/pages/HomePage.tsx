import { getAllPersonas, PRODUCT_FEATURES } from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';
import Hero from '../components/Hero';
import PersonaCard from '../components/PersonaCard';
import FeatureCard from '../components/FeatureCard';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { language, t } = useLanguage();
  const personas = getAllPersonas();

  return (
    <div>
      <Hero />

      {/* Who We Protect */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="section-title">
            {t('Who We Protect', '我們保護誰')}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-brand-muted">
            {t(
              'Security solutions tailored for every role in your organization.',
              '為組織中每個角色量身打造的資安解決方案。',
            )}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {personas.map((persona) => (
              <PersonaCard key={persona.type} persona={persona} />
            ))}
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="border-t border-brand-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="section-title">
            {t('Product Suite', '產品套件')}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-brand-muted">
            {t(
              'Five integrated modules working together to protect your infrastructure.',
              '五個整合模組協同運作，保護你的基礎設施。',
            )}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_FEATURES.map((feature) => (
              <FeatureCard key={feature.product} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Stats */}
      <section className="border-t border-brand-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { value: '5', labelEn: 'Integrated Modules', labelZh: '整合模組' },
              { value: '3', labelEn: 'Compliance Frameworks', labelZh: '合規框架' },
              { value: '8', labelEn: 'Honeypot Services', labelZh: '蜜罐服務' },
              { value: '24/7', labelEn: 'AI Monitoring', labelZh: 'AI 監控' },
            ].map((stat) => (
              <div key={stat.labelEn} className="text-center">
                <p className="mb-1 text-4xl font-bold text-brand-cyan">{stat.value}</p>
                <p className="text-sm text-brand-muted">
                  {language === 'en' ? stat.labelEn : stat.labelZh}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-brand-border py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            {t(
              'Ready to Secure Your Infrastructure?',
              '準備好保護你的基礎設施了嗎？',
            )}
          </h2>
          <p className="mb-8 text-brand-muted">
            {t(
              'Start with our interactive guide to find the right setup for your needs.',
              '從我們的互動指南開始，找到適合你的設定方案。',
            )}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/guide" className="btn-primary">
              {t('Start Setup Guide', '開始設定指南')}
            </Link>
            <Link to="/pricing" className="btn-secondary">
              {t('View Pricing', '查看方案')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
