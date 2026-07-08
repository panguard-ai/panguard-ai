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
import { ArrowRight, Shield } from 'lucide-react';
import { Link } from '@/navigation';
import { Eyebrow, SectionTitleV2, SectionV2 } from './v2/primitives';

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
    <SectionV2>
      <FadeInUp>
        <Eyebrow>
          {isZh
            ? '把 20 年偵測知識銜接到 AI Agent 時代'
            : 'Bridging 20 years of detection IP into the AI agent era'}
        </Eyebrow>
        <SectionTitleV2>
          {isZh ? (
            <>
              舊時代的偵測規則，
              <span className="text-brand-sage">銜接成 AI Agent 防護層。</span>
            </>
          ) : (
            <>
              Legacy detection rules →{' '}
              <span className="text-brand-sage">AI agent defense layer.</span>
            </>
          )}
        </SectionTitleV2>
        <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-text-secondary">
          {isZh ? (
            <>
              <p>
                銀行、醫院、政府、半導體廠的 SOC，累積了二十年的偵測 IP——SIEM
                查詢、惡意樣本特徵、IDS 規則、CVE 對應、靜態分析。
              </p>
              <p>
                AI Agent 時代到來，這些既有規則本身雖然抓不到 prompt
                injection，但背後的攻擊知識依然成立：SQL injection 沒消失，只是搬進了 tool
                call；命令注入沒消失，只是換了載體。
              </p>
              <p>
                Migrator 將 15 種來源格式自動翻譯成 ATR
                行為層規則。過去累積的偵測知識，一條都不會浪費。
              </p>
            </>
          ) : (
            <>
              <p>
                Banks, hospitals, government agencies, and semiconductor SOCs have accumulated two
                decades of detection IP — SIEM queries, malware signatures, IDS rules, CVE mappings,
                static analysis.
              </p>
              <p>
                In the AI agent era, those rules themselves no longer catch prompt injection, but
                the attack knowledge beneath them still holds. SQL injection did not vanish; it
                moved into tool calls. Command injection did not vanish; it changed substrate.
              </p>
              <p>
                Migrator automatically translates 15 source formats into ATR behavioral rules. Not a
                single line of accumulated detection knowledge is wasted.
              </p>
            </>
          )}
        </div>
      </FadeInUp>

      {/* 15 source formats grouped by era */}
      <div className="mt-14 space-y-10">
        {ERAS.map((era, eraIdx) => (
          <FadeInUp key={era.decade} delay={eraIdx * 0.05}>
            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-micro text-text-muted">
                  {era.label[isZh ? 'zh' : 'en']}
                </p>
                <p className="mt-2 font-mono text-2xl font-medium text-text-primary sm:text-3xl">
                  {era.decade}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {era.formats.map((fmt) => (
                  <div
                    key={fmt.name}
                    className="lift rounded-2xl border border-border bg-surface-1 p-4"
                  >
                    <p className="font-mono text-sm font-bold text-text-primary">{fmt.name}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                      {fmt.what[isZh ? 'zh' : 'en']}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-micro text-brand-sage">
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
        <div className="mt-16 grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="lift rounded-2xl border border-border bg-surface-1 p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-micro text-text-muted">
              {isZh ? '輸入：15 種舊時代格式' : 'Input: 15 legacy formats'}
            </p>
            <p className="font-mono text-xs leading-relaxed text-text-secondary">
              Sigma · Splunk SPL · Elastic EQL · YARA · Snort · Falco · Semgrep · CodeQL · CVE-NVD ·
              GHSA · OSV · CISA KEV · garak · PyRIT · promptfoo
            </p>
          </div>
          <ArrowRight className="mx-auto h-8 w-8 rotate-90 text-brand-sage lg:rotate-0" />
          <div className="lift rounded-2xl border border-brand-sage/40 bg-surface-1 p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-micro text-brand-sage">
              {isZh ? '輸出：ATR 行為層規則' : 'Output: ATR behavioral rules'}
            </p>
            <p className="text-xs leading-relaxed text-text-secondary">
              {isZh
                ? 'AI Agent 行為偵測規則、五大框架合規 metadata、測試案例，以及 SHA-256 稽核軌跡。'
                : 'AI agent behavioral detection rules, five-framework compliance metadata, test cases, and SHA-256 audit trails.'}
            </p>
          </div>
        </div>
      </FadeInUp>

      {/* Sovereign AI callout */}
      <FadeInUp delay={0.4}>
        <div className="mt-16 max-w-5xl rounded-2xl border border-brand-sage/40 bg-surface-1 p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <Shield className="mt-1 h-8 w-8 flex-shrink-0 text-brand-sage" />
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-micro text-brand-sage">
                {isZh ? '對主權 AI 的意義' : 'What this means for sovereign AI'}
              </p>
              <h3 className="mb-4 font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                {isZh
                  ? '擁有自己的模型，不等於擁有自己的 detection IP。'
                  : 'Owning your own model is not the same as owning your detection IP.'}
              </h3>
              <p className="mb-4 text-base leading-relaxed text-text-secondary">
                {isZh
                  ? '印度、日本、英國、法國、韓國、UAE、台灣——每一個民主國家都在打造自己的主權 AI 模型與算力。然而當這些 AI 進化為 Agent 之後，安全層仍然由美國私企以閉源規則與黑盒模型供應，這正是主權 AI 計畫原本想要消除的依賴關係。'
                  : 'India, Japan, the UK, France, Korea, the UAE, and Taiwan are all building sovereign AI models and compute. Yet once those AI systems evolve into agents, the security layer is still supplied by US-private vendors using proprietary rules and black-box models — exactly the dependency that sovereign AI programs were created to escape.'}
              </p>
              <p className="mb-4 text-base leading-relaxed text-text-secondary">
                {isZh
                  ? '一個國家的 SOC 二十年累積下來的 detection IP（Sigma 規則、YARA 樣本、Splunk 查詢、CVE 對應），本身就是這個國家的資安主權。Migrator 的角色，是把這份知識自動延伸到 AI Agent 時代——既不必丟棄重練，也不需要從外國廠商租回。'
                  : "A nation's accumulated SOC detection IP — Sigma rules, YARA signatures, Splunk queries, CVE mappings — is itself a form of security sovereignty. Migrator extends that body of knowledge into the AI agent era automatically, with no rewriting from scratch and no renting it back from foreign vendors."}
              </p>
              <p className="text-base font-semibold leading-relaxed text-text-primary">
                {isZh
                  ? '主權 AI 的完整定義：主權的模型、主權的算力、主權的偵測知識。三者俱備，才稱得上完整。'
                  : 'Sovereign AI is defined by three components: sovereign model, sovereign compute, and sovereign detection knowledge. Only with all three is it complete.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Link
                  href="/migrator"
                  className="inline-flex items-center gap-1 font-semibold text-brand-sage hover:underline"
                >
                  {isZh ? '看完整 Migrator 規格' : 'See full Migrator spec'}{' '}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-text-muted">·</span>
                <a
                  href="https://www.npmjs.com/package/@panguard-ai/migrator-community"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand-sage hover:underline"
                >
                  {isZh ? '安裝 Community 版（免費）' : 'Install Community (free)'}{' '}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </FadeInUp>
    </SectionV2>
  );
}
