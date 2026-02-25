import { getAllPricingPlans } from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';
import PricingCard from '../components/PricingCard';

export default function PricingPage() {
  const { language, t } = useLanguage();
  const plans = getAllPricingPlans();

  const faqs = [
    {
      qEn: 'Can I switch plans later?',
      qZh: '之後可以切換方案嗎？',
      aEn: 'Yes, you can upgrade or downgrade at any time. Your data and configurations are preserved across plan changes.',
      aZh: '可以，你可以隨時升級或降級。你的資料和設定在方案變更時都會保留。',
    },
    {
      qEn: 'Is there a free trial for paid plans?',
      qZh: '付費方案有免費試用嗎？',
      aEn: 'All paid plans include a 14-day free trial with full feature access. No credit card required.',
      aZh: '所有付費方案都包含 14 天免費試用，可使用全部功能。不需要信用卡。',
    },
    {
      qEn: 'What compliance frameworks are supported?',
      qZh: '支援哪些合規框架？',
      aEn: 'We support Taiwan Cyber Security Management Act, ISO 27001, and SOC 2. Enterprise plans include custom framework mapping.',
      aZh: '我們支援台灣資通安全管理法、ISO 27001 和 SOC 2。企業方案包含自訂框架對應。',
    },
    {
      qEn: 'How does the AI learning period work?',
      qZh: 'AI 學習期如何運作？',
      aEn: 'Panguard AI takes 7 days to learn your environment baseline. During this period, you receive regular progress updates and the system operates in observation mode.',
      aZh: 'Panguard AI 需要 7 天來學習你的環境基準線。在此期間，你會收到定期進度更新，系統以觀察模式運作。',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">
          {t('Pricing Plans', '方案價格')}
        </h1>
        <p className="mx-auto max-w-2xl text-brand-muted">
          {t(
            'Choose the plan that fits your security needs. Start free and scale as you grow.',
            '選擇符合你資安需求的方案。免費開始，隨著成長擴展。',
          )}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="mb-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard key={plan.plan} plan={plan} />
        ))}
      </div>

      {/* FAQ */}
      <section>
        <h2 className="section-title">
          {t('Frequently Asked Questions', '常見問題')}
        </h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="card">
              <h3 className="mb-2 font-semibold">
                {language === 'en' ? faq.qEn : faq.qZh}
              </h3>
              <p className="text-sm text-brand-muted">
                {language === 'en' ? faq.aEn : faq.aZh}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
