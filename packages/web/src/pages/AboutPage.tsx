import { useLanguage } from '../context/LanguageContext';
import { PANGUARD_WEB_VERSION } from '@openclaw/panguard-web';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">
          {t('About Panguard AI', '關於 Panguard AI')}
        </h1>
        <p className="mx-auto max-w-2xl text-brand-muted">
          {t(
            'AI-driven cybersecurity, built for organizations without dedicated security teams.',
            'AI 驅動的網路安全，為沒有專職資安團隊的組織而建。',
          )}
        </p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Our Mission', '我們的使命')}
        </h2>
        <div className="card">
          <p className="text-brand-muted">
            {t(
              'Most small and medium businesses lack the resources to hire a full security operations team. Panguard AI levels the playing field by providing enterprise-grade security intelligence through an AI-first approach. We believe every organization deserves proactive threat detection, compliance automation, and clear security communication — regardless of team size or budget.',
              '大多數中小企業缺乏資源聘請完整的安全運營團隊。Panguard AI 透過 AI 優先的方法提供企業級安全情報，讓競爭環境更加公平。我們相信每個組織都值得擁有主動式威脅偵測、合規自動化和清晰的資安通訊 — 無論團隊規模或預算如何。',
            )}
          </p>
        </div>
      </section>

      {/* Technology */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Technology', '技術')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              titleEn: 'AI Baseline Learning',
              titleZh: 'AI 基準線學習',
              descEn: 'Panguard AI observes your environment for 7 days, building a behavioral baseline. After learning, it detects anomalies with high confidence while minimizing false positives.',
              descZh: 'Panguard AI 觀察你的環境 7 天，建立行為基準線。學習後，它以高信心偵測異常，同時最小化誤報。',
            },
            {
              titleEn: 'Multi-Layer Detection',
              titleZh: '多層偵測',
              descEn: 'Combines rule-based matching, baseline deviation analysis, and AI reasoning to classify threats. Each layer adds confidence, reducing false positives.',
              descZh: '結合規則比對、基準線偏差分析和 AI 推理來分類威脅。每一層增加信心值，降低誤報率。',
            },
            {
              titleEn: 'Adaptive Communication',
              titleZh: '適應性通訊',
              descEn: 'Security alerts are automatically adapted based on the recipient role. Technical teams get detailed analysis; management gets business impact summaries.',
              descZh: '資安警報根據接收者角色自動調整。技術團隊收到詳細分析；管理層收到業務影響摘要。',
            },
            {
              titleEn: 'Threat Intelligence Network',
              titleZh: '威脅情報網路',
              descEn: 'Honeypot data from PanguardTrap is anonymized and shared across the network, enabling collective defense against emerging attack patterns.',
              descZh: '來自 PanguardTrap 的蜜罐資料經匿名化後在網路中共享，實現對新興攻擊模式的集體防禦。',
            },
          ].map((item) => (
            <div key={item.titleEn} className="card">
              <h3 className="mb-2 font-semibold text-brand-cyan">
                {t(item.titleEn, item.titleZh)}
              </h3>
              <p className="text-sm text-brand-muted">
                {t(item.descEn, item.descZh)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OpenClaw Security */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">
          {t('OpenClaw Security', 'OpenClaw Security')}
        </h2>
        <div className="card">
          <p className="mb-4 text-brand-muted">
            {t(
              'Panguard AI is developed by OpenClaw Security, a cybersecurity company focused on making professional-grade security accessible to small and medium businesses across Asia-Pacific.',
              'Panguard AI 由 OpenClaw Security 開發，這是一家致力於讓專業級資安技術普及至亞太地區中小企業的網路安全公司。',
            )}
          </p>
          <div className="flex items-center gap-4 border-t border-brand-border pt-4">
            <span className="text-sm text-brand-muted">
              {t('Platform Version', '平台版本')}
            </span>
            <span className="font-mono text-sm text-brand-cyan">{PANGUARD_WEB_VERSION}</span>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Contact', '聯繫我們')}
        </h2>
        <div className="card">
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-brand-muted">{t('Email:', '電子信箱：')}</span>{' '}
              <span className="text-brand-cyan">contact@openclaw.security</span>
            </p>
            <p>
              <span className="text-brand-muted">{t('GitHub:', 'GitHub：')}</span>{' '}
              <span className="text-brand-cyan">github.com/openclaw-security</span>
            </p>
            <p>
              <span className="text-brand-muted">{t('Location:', '地點：')}</span>{' '}
              <span className="text-brand-text">{t('Taipei, Taiwan', '台北，台灣')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <Link to="/guide" className="btn-primary">
          {t('Get Started', '立即開始')}
        </Link>
      </section>
    </div>
  );
}
