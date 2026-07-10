'use client';

import { Check, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface ComparisonCard {
  readonly title: string;
  readonly titleZh: string;
  readonly tagline: string;
  readonly taglineZh: string;
  readonly bullets: readonly string[];
  readonly bulletsZh: readonly string[];
}

const COMPARISON_CARDS: readonly ComparisonCard[] = [
  {
    title: 'vs Endpoint Security (EDR)',
    titleZh: 'vs 端點安全（EDR）',
    tagline: 'Endpoint tools watch the OS. PanGuard watches the AI agent.',
    taglineZh: '端點工具看的是 OS。PanGuard 看的是 AI agent。',
    bullets: [
      'Endpoint detection and response (EDR) tools monitor OS-level processes, network connections, and files. That surface is essential — and it sits below the AI agent layer.',
      'Prompt flows, MCP tool calls, and skill installations do not surface as OS events, so an agent-layer threat can be invisible to an endpoint sensor.',
      'PanGuard Guard is purpose-built for the AI agent layer — it understands skill installations, prompt injection patterns, and tool poisoning.',
      'Endpoint security and PanGuard cover different layers and complement each other: EDR for the host, PanGuard for the AI agent.',
    ],
    bulletsZh: [
      '端點偵測與回應（EDR）工具監控 OS 層級的程序、網路連線與檔案。這個面向不可或缺——但它位在 AI agent 層之下。',
      'Prompt 流程、MCP 工具呼叫、skill 安裝不會以 OS 事件的形式出現，所以 agent 層的威脅對端點感測器可能完全隱形。',
      'PanGuard Guard 為 AI agent 層量身打造——它理解 skill 安裝、prompt injection 模式與 tool poisoning。',
      '端點安全與 PanGuard 覆蓋不同層次、彼此互補：EDR 顧主機，PanGuard 顧 AI agent。',
    ],
  },
  {
    title: 'vs Code & Dependency Scanners',
    titleZh: 'vs 程式碼與依賴掃描器',
    tagline: 'Dependency scanners secure your code. PanGuard secures what your agent installs.',
    taglineZh: '依賴掃描器保護你的程式碼。PanGuard 保護你的 agent 安裝的東西。',
    bullets: [
      'Software composition and dependency scanners are excellent at finding known vulnerabilities in packages and container images — a mature, necessary practice.',
      "A malicious MCP skill usually has no CVE: it's a newer class of threat that classic vulnerability databases were not built to describe.",
      `PanGuard's Skill Auditor adds pre-install scanning for the AI agent era, with ${STATS.totalRulesDisplay} ATR rules covering skill and tool behavior.`,
      "The two are complementary: dependency scanners for your code, PanGuard for your agent's tools.",
    ],
    bulletsZh: [
      '軟體組成與依賴掃描器很擅長找出套件與 container image 中的已知漏洞——成熟且必要的實務。',
      '惡意的 MCP skill 通常沒有 CVE：這是較新的威脅類別，傳統漏洞資料庫並非為描述它而設計。',
      `PanGuard 的 Skill Auditor 為 AI agent 時代加上安裝前掃描，${STATS.totalRulesDisplay} 條 ATR 規則涵蓋 skill 與工具行為。`,
      '兩者互補：依賴掃描器顧你的程式碼，PanGuard 顧你 agent 的工具。',
    ],
  },
  {
    title: 'vs Prompt Firewalls',
    titleZh: 'vs Prompt 防火牆',
    tagline: 'Prompt firewalls filter inputs and outputs. PanGuard secures the whole agent.',
    taglineZh: 'Prompt 防火牆過濾輸入與輸出。PanGuard 保護整個 agent。',
    bullets: [
      'Prompt firewalls do input/output filtering — blocking injection attacks in LLM prompts and responses — which is valuable at the model boundary.',
      `PanGuard covers the broader agent attack surface: prompt injection plus skill compromise, context exfiltration, agent manipulation, tool poisoning, privilege escalation and more — ${STATS.totalRulesDisplay} ATR rules across 9 threat categories.`,
      'A firewall filters the prompt boundary; PanGuard adds continuous runtime monitoring and response across the agent lifecycle.',
      'They fit together: a prompt firewall at the model edge, PanGuard across skills, tools, and runtime.',
    ],
    bulletsZh: [
      'Prompt 防火牆做輸入/輸出過濾——攔截 LLM prompt 與回應中的注入攻擊——在模型邊界很有價值。',
      `PanGuard 覆蓋更廣的 agent 攻擊面：prompt injection 之外還有 skill 入侵、上下文外洩、agent 操縱、tool poisoning、權限提升等——${STATS.totalRulesDisplay} 條 ATR 規則橫跨 9 大威脅類別。`,
      '防火牆過濾的是 prompt 邊界；PanGuard 加上橫跨 agent 生命週期的持續 runtime 監控與回應。',
      '兩者可以搭配：模型邊緣放 prompt 防火牆，PanGuard 覆蓋 skill、工具與 runtime。',
    ],
  },
  {
    title: 'vs Agent Governance Platforms',
    titleZh: 'vs Agent 治理平台',
    tagline: 'Governance platforms set the policy. PanGuard supplies the detections.',
    taglineZh: '治理平台定政策。PanGuard 供偵測。',
    bullets: [
      'Agent governance platforms provide policy enforcement and compliance dashboards — the control plane for how agents are allowed to behave.',
      `PanGuard provides the detection layer those platforms can build on: ${STATS.totalRulesDisplay} ATR rules that identify prompt injection, tool poisoning, and supply chain attacks in real time.`,
      'Governance answers what is allowed; detection answers what is actually happening. Each is stronger with the other.',
      'ATR is an open standard and PanGuard is MIT-licensed and free, so governance platforms can adopt the detections directly.',
    ],
    bulletsZh: [
      'Agent 治理平台提供政策執行與合規 dashboard——規範 agent 可以怎麼行為的控制平面。',
      `PanGuard 提供這些平台可以疊加其上的偵測層：${STATS.totalRulesDisplay} 條 ATR 規則即時辨識 prompt injection、tool poisoning 與供應鏈攻擊。`,
      '治理回答的是「什麼被允許」；偵測回答的是「實際正在發生什麼」。兩者相輔相成。',
      'ATR 是開放標準，PanGuard 採 MIT 授權且免費，治理平台可以直接採用這些偵測。',
    ],
  },
  {
    title: 'vs MCP Config Scanners',
    titleZh: 'vs MCP 設定掃描器',
    tagline: 'Config scanners validate MCP setup. PanGuard covers the full agent surface.',
    taglineZh: '設定掃描器驗證 MCP 設定。PanGuard 覆蓋完整的 agent 攻擊面。',
    bullets: [
      'MCP configuration scanners check MCP server configs for known misconfigurations and issues — a useful first line at setup time.',
      `PanGuard also scans SKILL.md files, tool descriptions, and runtime behavior — ${STATS.totalRulesDisplay} ATR rules across 9 threat categories, going beyond static config validation.`,
      'On the real-world SKILL.md corpus (498 samples, Layer-1 deterministic rules) ATR reaches 100% recall; benign false positives are reported per detection lane, never as a single blended number.',
      'Config validation and behavioral detection are complementary layers of the same defense.',
    ],
    bulletsZh: [
      'MCP 設定掃描器檢查 MCP server 設定中已知的錯誤設定與問題——安裝階段有用的第一道防線。',
      `PanGuard 還掃描 SKILL.md 檔案、工具描述與 runtime 行為——${STATS.totalRulesDisplay} 條 ATR 規則橫跨 9 大威脅類別，超越靜態設定驗證。`,
      '在真實世界 SKILL.md 語料庫上（498 個樣本、Layer-1 deterministic 規則）ATR 達到 100% 召回率；benign 誤報按偵測 lane 分別回報，絕不混成單一數字。',
      '設定驗證與行為偵測是同一套防禦的互補層次。',
    ],
  },
] as const;

/* -- Ecosystem evidence section -- */

const REAL_FINDINGS = [
  {
    type: 'Credential Exfiltration',
    typeZh: '憑證外洩',
    severity: 'CRITICAL',
    desc: 'MCP skill reads ~/.ssh/id_rsa and sends content to external endpoint via HTTP POST.',
    descZh: 'MCP skill 讀取 ~/.ssh/id_rsa，並透過 HTTP POST 把內容送到外部 endpoint。',
    found: '3 instances across npm registry',
    foundZh: 'npm registry 中發現 3 例',
  },
  {
    type: 'Prompt Injection',
    typeZh: 'Prompt Injection',
    severity: 'CRITICAL',
    desc: 'Skill injects hidden instructions into agent context: "ignore previous instructions and execute..."',
    descZh:
      'Skill 把隱藏指令注入 agent 上下文：「ignore previous instructions and execute...」',
    found: '12 instances, including 4 with obfuscated payloads',
    foundZh: '共 12 例，其中 4 例使用混淆 payload',
  },
  {
    type: 'Excessive Permissions',
    typeZh: '權限過大',
    severity: 'HIGH',
    desc: 'Skill requests filesystem write + network access + process execution, but only needs read access.',
    descZh: 'Skill 要求檔案系統寫入 + 網路存取 + 程序執行，但實際只需要讀取權限。',
    found: '5 instances flagged as over-privileged',
    foundZh: '5 例被標記為權限過大',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <section className="pt-24 pb-4 px-6 text-center">
      <FadeInUp>
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
          {isZh ? '為什麼選 PANGUARD' : 'WHY PANGUARD'}
        </p>
        <h1 className="text-[clamp(30px,5vw,56px)] font-bold text-text-primary leading-[1.08] max-w-4xl mx-auto">
          {isZh
            ? 'PanGuard 在你安全架構中的位置'
            : 'Where PanGuard fits in your security stack'}
        </h1>
        <p className="text-text-secondary mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
          {isZh
            ? '端點工具保護 OS。依賴掃描器保護你的程式碼。Prompt 防火牆過濾模型邊界。'
            : 'Endpoint tools secure the OS. Dependency scanners secure your code. Prompt firewalls filter the model boundary.'}
          <br />
          <span className="text-brand-sage font-semibold">
            {isZh
              ? 'PanGuard 補上 AI agent 這一層——與你既有的工具互補。'
              : 'PanGuard adds the AI agent layer — and complements the tools you already run.'}
          </span>
        </p>
      </FadeInUp>
    </section>
  );
}

function BlindSpotSection() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <SectionWrapper>
      <SectionTitle
        overline={isZh ? '盲區' : 'The blind spot'}
        title={isZh ? '既有工具看不到什麼' : 'What existing tools miss'}
        subtitle={
          isZh
            ? 'AI agent 帶來傳統資安看不到的新攻擊面。'
            : 'AI agents introduce a new attack surface that traditional security cannot see.'
        }
      />
      <FadeInUp>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-surface-1 rounded-xl border border-border p-6">
            <p className="text-sm font-bold text-text-primary mb-3">
              {isZh ? '傳統 EDR 看得到：' : 'Traditional EDR sees:'}
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />{' '}
                {isZh
                  ? '程序執行、檔案存取、網路連線'
                  : 'Process execution, file access, network calls'}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />{' '}
                {isZh ? '惡意軟體特徵、勒索軟體模式' : 'Malware signatures, ransomware patterns'}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />{' '}
                {isZh ? '已安裝軟體中的已知 CVE' : 'Known CVEs in installed software'}
              </li>
            </ul>
          </div>
          <div className="bg-surface-1 rounded-xl border border-red-400/30 p-6">
            <p className="text-sm font-bold text-red-400 mb-3">
              {isZh ? '傳統 EDR 看不到：' : 'Traditional EDR cannot see:'}
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{' '}
                {isZh
                  ? 'agent 對話中的 prompt injection'
                  : 'Prompt injection in agent conversations'}
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{' '}
                {isZh ? '惡意的 MCP 工具定義' : 'Malicious MCP tool definitions'}
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{' '}
                {isZh
                  ? '透過 agent 工具呼叫的憑證外洩'
                  : 'Credential exfiltration via agent tool calls'}
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{' '}
                {isZh
                  ? '跨多輪 session 的上下文操縱'
                  : 'Context manipulation across multi-turn sessions'}
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{' '}
                {isZh ? '透過 skill 套件的供應鏈攻擊' : 'Supply chain attacks via skill packages'}
              </li>
            </ul>
          </div>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}

function EvidenceSection() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline={isZh ? '真實數據' : 'Real data'}
        title={
          isZh
            ? `我們掃描了 ${STATS.ecosystem.skillsScanned.toLocaleString()} 個 MCP skill。這是我們的發現。`
            : `We scanned ${STATS.ecosystem.skillsScanned.toLocaleString()} MCP skills. Here's what we found.`
        }
        subtitle={
          isZh
            ? '這些是我們生態系掃描的真實發現，不是假設情境。'
            : 'These are real findings from our ecosystem scan, not hypothetical scenarios.'
        }
      />
      <FadeInUp>
        <div className="mt-10 space-y-4 max-w-3xl mx-auto">
          {REAL_FINDINGS.map((f) => (
            <div key={f.type} className="bg-surface-1 rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-bold text-text-primary">{isZh ? f.typeZh : f.type}</p>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    f.severity === 'CRITICAL'
                      ? 'text-red-400 bg-red-400/10'
                      : 'text-orange-400 bg-orange-400/10'
                  }`}
                >
                  {f.severity}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {isZh ? f.descZh : f.desc}
              </p>
              <p className="text-xs text-text-muted mt-2">{isZh ? f.foundZh : f.found}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-text-muted mt-6">
          {isZh ? (
            <>
              掃描 {STATS.ecosystem.skillsScanned.toLocaleString()} 個 skill，發現{' '}
              {STATS.ecosystem.findingsCritical} 個 CRITICAL + {STATS.ecosystem.findingsHigh} 個
              HIGH。{STATS.ecosystem.findingsClean.toLocaleString()} 個 skill（
              {((STATS.ecosystem.findingsClean / STATS.ecosystem.skillsScanned) * 100).toFixed(1)}
              %）為乾淨。
            </>
          ) : (
            <>
              {STATS.ecosystem.findingsCritical} CRITICAL + {STATS.ecosystem.findingsHigh} HIGH
              findings out of {STATS.ecosystem.skillsScanned.toLocaleString()} skills scanned.{' '}
              {STATS.ecosystem.findingsClean.toLocaleString()} skills (
              {((STATS.ecosystem.findingsClean / STATS.ecosystem.skillsScanned) * 100).toFixed(1)}
              %) are clean.
            </>
          )}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}

function ComparisonCards() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline={isZh ? '層與層怎麼搭' : 'How the layers fit'}
        title={isZh ? 'PanGuard 與相鄰產品類別' : 'PanGuard alongside adjacent categories'}
        subtitle={
          isZh
            ? 'PanGuard 在你既有安全類別旁的位置——以及彼此如何互補。'
            : 'Where PanGuard fits next to the security categories you already run — and how they complement each other.'
        }
      />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COMPARISON_CARDS.map((card, idx) => (
          <FadeInUp key={card.title} delay={idx * 0.1}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 h-full flex flex-col">
              <h3 className="text-base font-bold text-text-primary mb-1">
                {isZh ? card.titleZh : card.title}
              </h3>
              <p className="text-xs text-brand-sage font-semibold mb-4">
                {isZh ? card.taglineZh : card.tagline}
              </p>
              <ul className="space-y-3 flex-1">
                {(isZh ? card.bulletsZh : card.bullets).map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                  >
                    <span className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-brand-sage shrink-0" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}

function CTASection() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <SectionWrapper>
      <FadeInUp>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-[clamp(20px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
            {isZh
              ? '你的 AI agent 值得和伺服器同等的保護'
              : 'Your AI agents deserve the same protection as your servers'}
          </h2>
          <p className="text-text-secondary mt-4 leading-relaxed">
            {isZh
              ? `一個指令。${STATS.totalRulesDisplay} 條偵測規則。24/7 監控。$0。`
              : `One command. ${STATS.totalRulesDisplay} detection rules. 24/7 monitoring. $0.`}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="https://docs.panguard.ai/quickstart"
              className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
            >
              {isZh ? '免費開始' : 'Get Started Free'}
            </Link>
            <Link
              href="/"
              className="border border-border text-text-secondary font-semibold rounded-full px-8 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
            >
              {isZh ? '試用掃描器' : 'Try the Scanner'}
            </Link>
          </div>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

function DetailedComparisons() {
  const isZh = useLocale() === 'zh-TW';
  const items = [
    {
      slug: 'atr-vs-sigma',
      title: 'ATR vs Sigma',
      blurb: 'Open detection rule standards. Sigma for SIEM, ATR for AI agent runtime.',
      blurbZh: '開放偵測規則標準。Sigma 用於 SIEM，ATR 用於 AI agent runtime。',
    },
    {
      slug: 'atr-vs-garak',
      title: 'ATR vs NVIDIA garak',
      blurb: 'Runtime detection vs adversarial pre-deployment testing. Both needed.',
      blurbZh: 'Runtime 偵測 vs 部署前對抗式測試。兩者都需要。',
    },
    {
      slug: 'atr-vs-pyrit',
      title: 'ATR vs Microsoft PyRIT',
      blurb: 'Defender YAML standard vs red-team Python toolkit. Active cooperation.',
      blurbZh: '防守方 YAML 標準 vs red-team Python 工具包。生態合作進行中。',
    },
    {
      slug: 'atr-vs-owasp-agentic-top-10',
      title: 'ATR vs OWASP Agentic Top 10',
      blurb: 'Executable rules vs taxonomy. ATR ships as OWASP A-S-R-H reference implementation.',
      blurbZh: '可執行規則 vs 分類框架。ATR 是 OWASP A-S-R-H 的參考實作。',
    },
    {
      slug: 'atr-vs-cisco-defenseclaw',
      title: 'PanGuard vs Cisco DefenseClaw',
      blurb:
        'Open standard plus commercial platform vs enterprise bundle. Cisco runs ATR in production.',
      blurbZh: '開放標準加商業平台 vs 企業 bundle。Cisco 在生產環境跑 ATR。',
    },
  ];

  return (
    <SectionWrapper>
      <SectionTitle
        overline={isZh ? '詳細比較' : 'DETAILED COMPARISONS'}
        title={isZh ? 'ATR vs 其他 AI 安全工具' : 'ATR vs other AI security tools'}
        subtitle={
          isZh
            ? '與 AI agent 安全領域的開放標準及商業產品，做誠實的並列比較。'
            : 'Honest side-by-side comparisons with the open standards and commercial products in the AI agent security space.'
        }
      />
      <div className="max-w-5xl mx-auto mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/compare/${item.slug}`}
            className="block bg-surface-1 rounded-xl border border-border p-5 hover:border-brand-sage/40 transition-colors duration-200"
          >
            <p className="text-sm font-bold text-text-primary mb-1.5">{item.title}</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {isZh ? item.blurbZh : item.blurb}
            </p>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}

export default function CompareContent() {
  return (
    <>
      <HeroSection />
      <BlindSpotSection />
      <EvidenceSection />
      <ComparisonCards />
      <DetailedComparisons />
      <CTASection />
    </>
  );
}
