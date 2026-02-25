import { useLanguage } from '../context/LanguageContext';
import CopyCommand from '../components/CopyCommand';
import { Link } from 'react-router-dom';

export default function DocsPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          {t('Documentation', '文件')}
        </h1>
        <p className="text-brand-muted">
          {t(
            'Everything you need to get started with Panguard AI.',
            '開始使用 Panguard AI 所需的一切。',
          )}
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Quick Start', '快速開始')}
        </h2>

        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-3 font-semibold">
              {t('1. Install Panguard AI', '1. 安裝 Panguard AI')}
            </h3>
            <CopyCommand command="curl -fsSL https://get.panguard.ai | sh" />
          </div>

          <div className="card">
            <h3 className="mb-3 font-semibold">
              {t('2. Initialize Configuration', '2. 初始化設定')}
            </h3>
            <CopyCommand command="panguard init" />
            <p className="mt-3 text-sm text-brand-muted">
              {t(
                'This creates a configuration file at ~/.panguard/config.yaml with sensible defaults.',
                '這會在 ~/.panguard/config.yaml 建立一個有合理預設值的設定檔。',
              )}
            </p>
          </div>

          <div className="card">
            <h3 className="mb-3 font-semibold">
              {t('3. Start Monitoring', '3. 開始監控')}
            </h3>
            <CopyCommand command="panguard start" />
            <p className="mt-3 text-sm text-brand-muted">
              {t(
                'Panguard AI will begin learning your environment. You will receive your first security summary in 24 hours.',
                'Panguard AI 將開始學習你的環境。你會在 24 小時內收到第一份資安摘要。',
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Configuration', '設定')}
        </h2>

        <div className="card">
          <h3 className="mb-3 font-semibold">
            {t('Configuration File', '設定檔案')}
          </h3>
          <p className="mb-4 text-sm text-brand-muted">
            {t(
              'The main configuration file is located at ~/.panguard/config.yaml. Here are the key settings:',
              '主要設定檔位於 ~/.panguard/config.yaml。以下是主要設定項目：',
            )}
          </p>
          <div className="code-block text-sm">
            <pre>{`# ~/.panguard/config.yaml
monitoring:
  level: standard          # basic | standard | advanced
  learning_days: 7         # baseline learning period

notifications:
  channel: slack           # slack | telegram | line | email
  language: en             # en | zh-TW

scan:
  schedule: daily          # daily | weekly | manual
  categories:
    - password
    - network
    - encryption
    - access_control

report:
  framework: iso27001      # tw_cyber_security_act | iso27001 | soc2
  schedule: monthly        # weekly | monthly | quarterly
  language: en             # en | zh-TW`}</pre>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">
          {t('Module Overview', '模組概覽')}
        </h2>

        <div className="space-y-4">
          {[
            {
              name: 'PanguardScan',
              descEn: 'Security scanner that checks passwords, network configuration, encryption, and access controls. Produces findings with severity levels and remediation suggestions.',
              descZh: '安全掃描器，檢查密碼、網路設定、加密和存取控制。產出含嚴重度等級和修復建議的發現報告。',
            },
            {
              name: 'PanguardGuard',
              descEn: 'AI-powered threat detection engine. Learns your environment baseline over 7 days, then detects deviations and classifies threats using rule matching, baseline analysis, and AI reasoning.',
              descZh: 'AI 驅動的威脅偵測引擎。用 7 天學習你的環境基準線，然後透過規則比對、基準線分析和 AI 推理偵測異常並分類威脅。',
            },
            {
              name: 'PanguardChat',
              descEn: 'Notification system that adapts security alerts to your role. Developers get technical details, managers get business impact summaries, IT admins get actionable steps.',
              descZh: '通知系統，根據你的角色調整資安警報。開發者收到技術細節，管理者收到業務影響摘要，IT 管理員收到可執行步驟。',
            },
            {
              name: 'PanguardTrap',
              descEn: 'Honeypot system supporting 8 service types (SSH, HTTP, FTP, SMB, MySQL, RDP, Telnet, Redis). Captures attacker behavior and feeds intelligence back into threat detection.',
              descZh: '蜜罐系統，支援 8 種服務類型（SSH、HTTP、FTP、SMB、MySQL、RDP、Telnet、Redis）。捕捉攻擊者行為並將情報回饋到威脅偵測。',
            },
            {
              name: 'PanguardReport',
              descEn: 'Compliance report generator supporting Taiwan Cyber Security Act, ISO 27001, and SOC 2. Produces executive summaries, control evaluations, and actionable recommendations.',
              descZh: '合規報告產生器，支援台灣資通安全管理法、ISO 27001 和 SOC 2。產出執行摘要、控制措施評估和可執行建議。',
            },
          ].map((mod) => (
            <div key={mod.name} className="card">
              <h3 className="mb-2 font-mono font-semibold text-brand-cyan">{mod.name}</h3>
              <p className="text-sm text-brand-muted">
                {t(mod.descEn, mod.descZh)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <p className="mb-4 text-brand-muted">
          {t(
            'Need help choosing the right configuration?',
            '需要幫助選擇正確的設定嗎？',
          )}
        </p>
        <Link to="/guide" className="btn-primary">
          {t('Try the Setup Guide', '試試設定指南')}
        </Link>
      </section>
    </div>
  );
}
