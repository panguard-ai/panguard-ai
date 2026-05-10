'use client';

/**
 * Detection Heritage Bridge
 *
 * Lays out the 15 source-format adapters supported by Migrator, grouped by
 * the era they came from. The user-facing message: every line of detection
 * IP a SOC has accumulated over the past 20 years — across SIEM, EDR, NIDS,
 * code scanning, vuln intel, and the new AI red-teaming era — bridges into
 * the AI agent defense layer through one converter.
 *
 * Tied to the sovereign AI thesis: a country that owns its model but rents
 * its detection IP from a US private vendor has incomplete sovereignty.
 * Migrator is what lets sovereign AI carry its own detection knowledge
 * forward, not just its own weights.
 */

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { ArrowRight, Shield } from 'lucide-react';
import { Link } from '@/navigation';

interface Format {
  name: string;
  what: { en: string; zh: string };
  count: { en: string; zh: string };
}

interface Era {
  label: { en: string; zh: string };
  decade: string;
  formats: Format[];
}

const ERAS: Era[] = [
  {
    label: { en: 'SIEM era', zh: 'SIEM 時代' },
    decade: '2005 →',
    formats: [
      {
        name: 'Sigma',
        what: { en: 'SIEM detection rules', zh: 'SIEM 偵測規則' },
        count: { en: '3,000+ community rules', zh: '社群 3,000+ 條規則' },
      },
      {
        name: 'Splunk SPL',
        what: { en: 'Splunk Search Processing Language', zh: 'Splunk 搜尋查詢語言' },
        count: { en: 'F500 SOC default', zh: 'F500 SOC 標配' },
      },
      {
        name: 'Elastic EQL',
        what: { en: 'Elastic Query Language', zh: 'Elastic 查詢語言' },
        count: { en: 'ELK stack default', zh: 'ELK stack 標配' },
      },
    ],
  },
  {
    label: { en: 'Endpoint & malware era', zh: '端點與惡意程式時代' },
    decade: '2008 →',
    formats: [
      {
        name: 'YARA',
        what: { en: 'Malware family signatures', zh: '惡意樣本特徵' },
        count: { en: '10,000+ community rules', zh: '社群 10,000+ 條規則' },
      },
      {
        name: 'Snort',
        what: { en: 'Network IDS rules', zh: '網路入侵偵測規則' },
        count: { en: 'Cisco + open ruleset', zh: 'Cisco + 開源規則集' },
      },
      {
        name: 'Falco',
        what: { en: 'Runtime container security', zh: 'Runtime 容器安全' },
        count: { en: 'CNCF / Kubernetes default', zh: 'CNCF / Kubernetes 標配' },
      },
    ],
  },
  {
    label: { en: 'Static code scanning era', zh: '靜態程式碼掃描時代' },
    decade: '2014 →',
    formats: [
      {
        name: 'Semgrep',
        what: { en: 'Polyglot pattern-based SAST', zh: '跨語言 pattern SAST' },
        count: { en: '2,000+ rules', zh: '2,000+ 條規則' },
      },
      {
        name: 'CodeQL',
        what: { en: 'GitHub semantic code analysis', zh: 'GitHub 語意分析' },
        count: { en: 'Default for OSS critical repos', zh: 'OSS critical repos 標配' },
      },
    ],
  },
  {
    label: { en: 'Vulnerability intel era', zh: '漏洞情資時代' },
    decade: '1999 →',
    formats: [
      {
        name: 'CVE-NVD',
        what: { en: 'National Vulnerability Database', zh: '美國國家漏洞資料庫' },
        count: { en: '230,000+ CVEs', zh: '23 萬+ CVE' },
      },
      {
        name: 'GHSA',
        what: { en: 'GitHub Security Advisory', zh: 'GitHub 安全公告' },
        count: { en: 'OSS supply chain default', zh: 'OSS 供應鏈標配' },
      },
      {
        name: 'OSV',
        what: { en: 'Open Source Vulnerabilities (Google)', zh: '開源漏洞庫（Google）' },
        count: { en: 'Cross-ecosystem feed', zh: '跨生態系 feed' },
      },
      {
        name: 'CISA KEV',
        what: { en: 'Known Exploited Vulnerabilities', zh: '已知遭利用漏洞清單' },
        count: { en: 'US Federal mandate', zh: '美聯邦強制清單' },
      },
    ],
  },
  {
    label: { en: 'AI red-teaming era', zh: 'AI 紅隊時代' },
    decade: '2024 →',
    formats: [
      {
        name: 'NVIDIA garak',
        what: { en: 'LLM jailbreak probes', zh: 'LLM 越獄探測' },
        count: { en: '32 probe modules', zh: '32 個 probe 模組' },
      },
      {
        name: 'Microsoft PyRIT',
        what: { en: 'Python Risk Identification Tool', zh: 'Python 風險識別工具' },
        count: { en: 'MS AI red team default', zh: 'MS AI 紅隊標配' },
      },
      {
        name: 'promptfoo',
        what: { en: 'LLM eval / red-team framework', zh: 'LLM 評估與紅隊框架' },
        count: { en: 'OSS LLM testing default', zh: 'OSS LLM 測試標配' },
      },
    ],
  },
];

export default function DetectionHeritageBridge() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <SectionWrapper className="border-y border-border bg-gradient-to-b from-surface-1/30 to-surface-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.18em] text-panguard-green font-semibold mb-4">
            {isZh ? '把 20 年偵測知識接進 AI Agent 時代' : 'Bridging 20 years of detection IP into the AI agent era'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-5 max-w-3xl">
            {isZh
              ? '舊時代的規則 →  AI Agent 防護層'
              : 'Legacy detection rules → AI agent defense layer'}
          </h2>
          <p className="text-base text-text-secondary leading-relaxed max-w-3xl">
            {isZh
              ? '銀行、醫院、政府、半導體廠的 SOC 累積了 20 年的偵測 IP——SIEM 查詢、惡意樣本特徵、IDS 規則、CVE 對應、靜態分析。AI Agent 時代來了，這些規則本身抓不到 prompt injection，但它們背後的「攻擊知識」依然有效——SQL injection 沒消失，只是搬進了 tool call；命令注入沒消失，只是換了載體。Migrator 把 15 種來源格式自動翻譯成 ATR 行為層規則，一條都不浪費。'
              : 'A bank, hospital, government agency, or semiconductor SOC has accumulated 20 years of detection IP — SIEM queries, malware signatures, IDS rules, CVE mappings, static analysis. The AI agent era arrived. The rules themselves don\'t catch prompt injection, but the attack knowledge underneath still applies — SQL injection didn\'t vanish, it moved into tool calls; command injection didn\'t vanish, it changed substrate. Migrator translates 15 source formats into ATR behavioral rules. None of it goes to waste.'}
          </p>
        </FadeInUp>

        {/* 15 source formats grouped by era */}
        <div className="mt-14 space-y-10">
          {ERAS.map((era, eraIdx) => (
            <FadeInUp key={era.decade} delay={eraIdx * 0.05}>
              <div className="grid lg:grid-cols-[200px_1fr] gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                    {era.label[isZh ? 'zh' : 'en']}
                  </p>
                  <p className="font-mono text-2xl font-bold text-text-primary mt-1">
                    {era.decade}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {era.formats.map((fmt) => (
                    <div
                      key={fmt.name}
                      className="bg-surface-2 rounded-lg border border-border p-4"
                    >
                      <p className="font-mono text-sm font-bold text-text-primary">{fmt.name}</p>
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                        {fmt.what[isZh ? 'zh' : 'en']}
                      </p>
                      <p className="text-[10px] text-panguard-green mt-2 font-semibold">
                        {fmt.count[isZh ? 'zh' : 'en']}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Transformation arrow */}
        <FadeInUp delay={0.3}>
          <div className="mt-16 grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-center max-w-5xl mx-auto">
            <div className="bg-surface-2 rounded-xl border border-border p-6 text-center">
              <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                {isZh ? '輸入：15 種舊時代格式' : 'Input: 15 legacy formats'}
              </p>
              <p className="font-mono text-xs text-text-secondary leading-relaxed">
                Sigma · Splunk SPL · Elastic EQL · YARA · Snort · Falco · Semgrep · CodeQL · CVE-NVD ·
                GHSA · OSV · CISA KEV · garak · PyRIT · promptfoo
              </p>
            </div>
            <ArrowRight className="w-8 h-8 text-panguard-green mx-auto rotate-90 lg:rotate-0" />
            <div className="bg-surface-2 rounded-xl border border-panguard-green/30 p-6 text-center">
              <p className="text-[11px] uppercase tracking-wider text-panguard-green font-semibold mb-2">
                {isZh ? '輸出：ATR 行為層規則' : 'Output: ATR behavioral rules'}
              </p>
              <p className="font-mono text-xs text-text-secondary leading-relaxed">
                {isZh
                  ? 'AI Agent 行為偵測 + 5 框架合規 metadata + 測試案例 + SHA-256 稽核軌跡'
                  : 'AI agent behavior detection + 5-framework compliance metadata + test cases + SHA-256 audit trail'}
              </p>
            </div>
          </div>
        </FadeInUp>

        {/* Sovereign AI callout */}
        <FadeInUp delay={0.4}>
          <div className="mt-16 bg-gradient-to-br from-brand-sage-wash to-surface-2 rounded-xl border border-brand-sage/30 p-8 sm:p-10 max-w-5xl mx-auto">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-brand-sage flex-shrink-0 mt-1" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-3">
                  {isZh ? '對主權 AI 的意義' : 'What this means for sovereign AI'}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4">
                  {isZh
                    ? '擁有自己的模型，不等於擁有自己的 detection IP。'
                    : 'Owning your own model is not the same as owning your detection IP.'}
                </h3>
                <p className="text-base text-text-secondary leading-relaxed mb-4">
                  {isZh
                    ? '印度、日本、英國、法國、韓國、UAE、台灣——每個民主國家都在打造主權 AI 模型與算力。但當這些 AI 變成 Agent，安全層仍然由美國私企供應（閉源規則、黑盒模型）。這正是 Sovereign AI 想要消除的依賴。'
                    : 'India, Japan, UK, France, Korea, UAE, Taiwan — every democracy is building sovereign AI models and compute. But when those AI systems become agents, the security layer is still rented from US-private vendors (proprietary rules, black-box models). That is exactly the dependency Sovereign AI was created to escape.'}
                </p>
                <p className="text-base text-text-secondary leading-relaxed mb-4">
                  {isZh
                    ? '一個國家的 SOC 累積的 detection IP，是這個國家的「資安主權」。Migrator 確保——你的 Sigma 規則、YARA 樣本、Splunk 查詢、CVE 對應——這些 20 年累積的知識，在 AI Agent 時代依然是你的，不必丟掉重來，也不必租回來。'
                    : "A nation's accumulated SOC detection IP is its security sovereignty. Migrator ensures that your Sigma rules, YARA signatures, Splunk queries, and CVE mappings — 20 years of accumulated knowledge — remain yours in the AI agent era. You don\'t throw it out. You don\'t rent it back."}
                </p>
                <p className="text-base text-text-primary font-semibold leading-relaxed">
                  {isZh
                    ? 'Sovereign AI = 主權的模型 + 主權的算力 + 主權的偵測知識。三者俱全，才稱得上完整。'
                    : 'Sovereign AI = sovereign model + sovereign compute + sovereign detection knowledge. Only with all three is it complete.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <Link
                    href="/migrator"
                    className="text-brand-sage font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    {isZh ? '看完整 Migrator 規格' : 'See full Migrator spec'}{' '}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-text-muted">·</span>
                  <a
                    href="https://www.npmjs.com/package/@panguard-ai/migrator-community"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-sage font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    {isZh ? '安裝 Community 版（免費）' : 'Install Community (free)'}{' '}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
