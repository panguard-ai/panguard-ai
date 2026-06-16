'use client';

import { useTranslations, useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { useRuleStats } from '@/hooks/useRuleStats';
import { ArrowRight } from 'lucide-react';
import {
  ShieldIcon,
  ScanIcon,
  TerminalIcon,
  AnalyticsIcon,
  ResponseIcon,
  AlertIcon,
  CheckIcon,
  NetworkIcon,
  SettingsIcon,
  GlobalIcon,
  HistoryIcon,
  LockIcon,
  MonitorIcon,
  IntegrationIcon,
} from '@/components/ui/BrandIcons';

/* ─── Layer Config ─── */
const layerConfigs = [
  { key: 'layer1' as const, badgeColor: 'bg-brand-sage/10 text-brand-sage', mdClass: '' },
  {
    key: 'layer2' as const,
    badgeColor: 'bg-[#60a5fa]/10 text-[#60a5fa]',
    mdClass: 'md:max-w-[70%]',
  },
  {
    key: 'layer3' as const,
    badgeColor: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    mdClass: 'md:max-w-[40%]',
  },
];

/* ─── Defense Stack Layers ─── */
const defenseStackLayers = [
  {
    key: 'kernel' as const,
    icon: TerminalIcon,
    iconColor: 'text-[#ef4444]',
    borderColor: 'border-[#ef4444]/20',
    bgGlow: 'bg-[#ef4444]/5',
    badgeBg: 'bg-[#ef4444]/10 text-[#ef4444]',
  },
  {
    key: 'network' as const,
    icon: NetworkIcon,
    iconColor: 'text-[#f59e0b]',
    borderColor: 'border-[#f59e0b]/20',
    bgGlow: 'bg-[#f59e0b]/5',
    badgeBg: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  },
  {
    key: 'filesystem' as const,
    icon: LockIcon,
    iconColor: 'text-[#60a5fa]',
    borderColor: 'border-[#60a5fa]/20',
    bgGlow: 'bg-[#60a5fa]/5',
    badgeBg: 'bg-[#60a5fa]/10 text-[#60a5fa]',
  },
  {
    key: 'logs' as const,
    icon: AnalyticsIcon,
    iconColor: 'text-[#a78bfa]',
    borderColor: 'border-[#a78bfa]/20',
    bgGlow: 'bg-[#a78bfa]/5',
    badgeBg: 'bg-[#a78bfa]/10 text-[#a78bfa]',
  },
  {
    key: 'ai' as const,
    icon: SettingsIcon,
    iconColor: 'text-brand-sage',
    borderColor: 'border-brand-sage/20',
    bgGlow: 'bg-brand-sage/5',
    badgeBg: 'bg-brand-sage/10 text-brand-sage',
  },
];

/* ─── Data Flow Pipeline Stages ─── */
const dataFlowStages = [
  { key: 'stage1' as const, icon: ScanIcon },
  { key: 'stage2' as const, icon: SettingsIcon },
  { key: 'stage3' as const, icon: NetworkIcon },
  { key: 'stage4' as const, icon: AnalyticsIcon },
  { key: 'stage5' as const, icon: AlertIcon },
];

/* ─── Agent Icons ─── */
const agentConfigs = [
  { key: 'detect' as const, icon: ScanIcon },
  { key: 'analyze' as const, icon: SettingsIcon },
  { key: 'respond' as const, icon: ResponseIcon },
  { key: 'report' as const, icon: AnalyticsIcon },
];

/* ─── Confidence Scoring ─── */
const confidenceConfigs = [
  { key: 'high' as const, color: 'bg-[#22c55e]' },
  { key: 'medium' as const, color: 'bg-[#f59e0b]' },
  { key: 'low' as const, color: 'bg-[#60a5fa]' },
];

const confidenceBarWidths: Record<string, string> = {
  high: '100%',
  medium: '84%',
  low: '49%',
};

/* ─── Collective Intelligence Icons ─── */
const collectiveConfigs = [
  { key: 'item1' as const, icon: ScanIcon },
  { key: 'item2' as const, icon: NetworkIcon },
  { key: 'item3' as const, icon: HistoryIcon },
  { key: 'item4' as const, icon: ShieldIcon },
];

/* ─── Resilience Levels ─── */
const resilienceConfigs = [
  { key: 'optimal' as const, color: 'bg-[#22c55e]', icon: CheckIcon },
  { key: 'cloudUnavailable' as const, color: 'bg-[#f59e0b]', icon: AlertIcon },
  { key: 'engineOnly' as const, color: 'bg-[#f59e0b]', icon: AlertIcon },
  { key: 'emergency' as const, color: 'bg-[#ef4444]', icon: AlertIcon },
];

/* ─── Tech Stack Icons ─── */
const stackConfigs = [
  { key: 'item1' as const, icon: TerminalIcon },
  { key: 'item2' as const, icon: ShieldIcon },
  { key: 'item3' as const, icon: LockIcon },
  { key: 'item4' as const, icon: SettingsIcon },
  { key: 'item5' as const, icon: SettingsIcon },
  { key: 'item6' as const, icon: TerminalIcon },
  { key: 'item7' as const, icon: NetworkIcon },
  { key: 'item8' as const, icon: NetworkIcon },
  { key: 'item9' as const, icon: GlobalIcon },
  { key: 'item10' as const, icon: AnalyticsIcon },
  { key: 'item11' as const, icon: IntegrationIcon },
  { key: 'item12' as const, icon: ScanIcon },
  { key: 'item13' as const, icon: ResponseIcon },
  { key: 'item14' as const, icon: AnalyticsIcon },
];

/* ─── Rule Production: four fast paths to high-quality rules ───
   Copy is inline (bilingual) on purpose: this section is owned by the
   technology page and kept out of the shared messages catalog. All four
   paths are real, shipping pipelines in the ATR repo / migrator-community:
     CVE feed      -> scripts/cve-collect.ts + sync-cvelistv5.ts
     Red-team/PoC  -> scripts/generate-detection-from-poc.ts
     Community     -> scripts/local-crystallize.ts + promote-detection-ready.ts
     Converter     -> packages/migrator-community (Sigma/YARA -> ATR YAML, MIT)
   Rule count stays dynamic via useRuleStats() — never hardcode it. */
type RuleProductionCopy = {
  overline: string;
  title: string;
  subtitle: string;
  problemTitle: string;
  problemBody: string;
  paths: Array<{ tag: string; name: string; desc: string }>;
  footnote: string;
};

const ruleProductionCopy: Record<'en' | 'zh-TW', RuleProductionCopy> = {
  en: {
    overline: 'Rule Production',
    title: 'Four fast paths to high-quality rules',
    subtitle:
      'Models ship a new version every few weeks. Hand-writing detection the old way takes weeks per rule and stays a step behind. ATR produces vetted rules from four sources at once, so the rule base grows daily and every new rule raises the cost of attacking your agents.',
    problemTitle: 'The old way is slow and complex',
    problemBody:
      'Traditional detection waits on a committee: someone reverse-engineers an attack, hand-tunes a signature, runs a review cycle, then ships weeks later. By the time the rule lands, the model and the attack have already moved on. ATR closes that gap by mass-producing rules from live sources and gating each one on precision before it goes out.',
    paths: [
      {
        tag: 'CVE feed',
        name: 'Disclosed CVEs',
        desc: 'A collector pulls AI / agent / LLM / MCP CVEs from upstream feeds the moment they publish, so a disclosed vulnerability becomes a detection candidate the same day instead of next quarter.',
      },
      {
        tag: 'Red-team / PoC',
        name: 'Proof-of-concept attacks',
        desc: 'Real exploit payloads and red-team PoCs are parsed into generalized detection patterns — the attack signal, not the prose around it — so a working attack turns straight into a rule.',
      },
      {
        tag: 'Converter',
        name: 'The Sigma / YARA bridge',
        desc: 'The community converter carries 20 years of SOC detection IP — Sigma, YARA, Snort — across to ATR YAML. It lays the foundation; the new AI defense wall is rebuilt on top. Free and MIT-licensed.',
      },
      {
        tag: 'Community flywheel',
        name: 'Captures from the field',
        desc: 'Every install that opts into the semantic layer can surface a novel attack, draft it as an ATR proposal with evidence, and — only on community consensus — push it to everyone. The more people run it, the faster the rule base catches up to model speed.',
      },
    ],
    footnote:
      'Every path runs through the same precision gate before a rule ships. Rules grow daily.',
  },
  'zh-TW': {
    overline: '規則生產',
    title: '四條快路造高品質規則',
    subtitle:
      '模型每隔幾週就升級一版。用老方法手寫偵測,一條規則要數週,而且永遠慢半拍。ATR 同時從四個來源量產經過驗證的規則,規則庫每天增長,每多一條都墊高攻擊你 agent 的成本。',
    problemTitle: '老方法又慢又複雜',
    problemBody:
      '傳統偵測卡在委員會流程:先有人逆向一個攻擊、手調簽章、跑審查週期,數週後才出貨。等規則落地,模型和攻擊早就換代了。ATR 從活來源量產規則、並在出貨前對每一條把關精準度,直接補上這段時間差。',
    paths: [
      {
        tag: 'CVE 流',
        name: '公開 CVE',
        desc: '收集器在上游一發布就抓 AI / agent / LLM / MCP 的 CVE,公開的漏洞當天就變成偵測候選,而不是等到下一季。',
      },
      {
        tag: '紅隊 / PoC',
        name: '概念驗證攻擊',
        desc: '把真實的攻擊 payload 和紅隊 PoC 解析成可泛化的偵測 pattern — 取攻擊訊號本身,不是周邊文字 — 一個能跑的攻擊就直接變成一條規則。',
      },
      {
        tag: '轉換器',
        name: 'Sigma / YARA 的橋',
        desc: '社群轉換器把 20 年的 SOC 偵測 IP — Sigma、YARA、Snort — 搬過來變成 ATR YAML。它打地基,新的 AI 防禦牆在上面重新砌起。免費、MIT 授權。',
      },
      {
        tag: '社群飛輪',
        name: '一線的捕獲',
        desc: '每個啟用語意層的安裝都能浮出一種新型攻擊、帶著證據草擬成 ATR 提案 — 並且只在社群共識下 — 推給所有人。用的人越多,規則庫追上模型速度的速度越快。',
      },
    ],
    footnote: '每一條路徑出貨前都過同一道精準度閘。規則每天增長。',
  },
};

const rulePathIcons = [ScanIcon, AlertIcon, IntegrationIcon, NetworkIcon];

export default function TechnologyContent() {
  const t = useTranslations('technology');
  const locale = useLocale();
  const ruleCopy = ruleProductionCopy[locale === 'zh-TW' ? 'zh-TW' : 'en'];
  const { totalRules } = useRuleStats();
  const ruleCountLabel =
    locale === 'zh-TW' ? `${totalRules} 條規則,每天增長` : `${totalRules} rules and growing daily`;

  return (
    <>
      <p id="definition" className="sr-only">
        Panguard&apos;s detection engine uses ATR (Agent Threat Rules) -- the first open standard
        for AI agent threat detection -- across multiple deterministic detection stages that run
        entirely on-device, with no LLM in the detection path.
      </p>

      {/* -- Hero -- */}
      <section className="relative min-h-[60vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-28 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              {t('overline')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl">
              {t('title')} <span className="text-brand-sage">{t('titleHighlight')}</span>
              {t('titleSuffix')}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* -- Rule Production: four fast paths -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={ruleCopy.overline}
          title={ruleCopy.title}
          subtitle={ruleCopy.subtitle}
        />

        {/* Live rule count + problem framing */}
        <div className="max-w-3xl mx-auto mt-12">
          <FadeInUp>
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-brand-sage/10 text-brand-sage text-xs font-semibold px-4 py-2 rounded-full">
                <NetworkIcon className="w-3.5 h-3.5" />
                <span>{ruleCountLabel}</span>
              </div>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <div className="bg-surface-2 rounded-xl border border-border p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
                {ruleCopy.problemTitle}
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">{ruleCopy.problemBody}</p>
            </div>
          </FadeInUp>
        </div>

        {/* Four paths grid */}
        <div className="grid gap-4 sm:grid-cols-2 mt-6 max-w-4xl mx-auto">
          {ruleCopy.paths.map((path, i) => {
            const Icon = rulePathIcons[i] || ScanIcon;
            return (
              <FadeInUp key={path.tag} delay={i * 0.08}>
                <div className="bg-surface-2 rounded-xl border border-border p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-sage/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-brand-sage" />
                    </div>
                    <span className="bg-brand-sage/10 text-brand-sage text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {path.tag}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-1.5">{path.name}</p>
                  <p className="text-xs text-text-secondary leading-relaxed flex-1">{path.desc}</p>
                </div>
              </FadeInUp>
            );
          })}
        </div>

        <FadeInUp delay={0.4}>
          <p className="text-center text-xs text-text-tertiary mt-8 max-w-2xl mx-auto">
            {ruleCopy.footnote}
          </p>
        </FadeInUp>
      </SectionWrapper>

      {/* -- Deterministic Detection Stages -- */}
      <SectionWrapper>
        <SectionTitle
          overline={t('defenseFunnel.overline')}
          title={t('defenseFunnel.title')}
          subtitle={t('defenseFunnel.subtitle')}
        />
        <div className="max-w-3xl mx-auto mt-14 space-y-6">
          {layerConfigs.map((l, i) => (
            <FadeInUp key={l.key} delay={i * 0.1}>
              <div
                className={`bg-surface-1 rounded-xl p-4 sm:p-6 border border-border md:mx-auto ${l.mdClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`${l.badgeColor} text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full`}
                    >
                      {t(`defenseFunnel.${l.key}.badge`)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {t(`defenseFunnel.${l.key}.name`)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {t(`defenseFunnel.${l.key}.tech`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-text-secondary font-medium">
                      {t(`defenseFunnel.${l.key}.pct`)}
                    </span>
                    <span className="text-text-tertiary">
                      {t(`defenseFunnel.${l.key}.cost`)}/event
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`defenseFunnel.${l.key}.desc`)}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Defense Stack (5-Layer Architecture) -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={t('defenseStack.overline')}
          title={t('defenseStack.title')}
          subtitle={t('defenseStack.subtitle')}
        />

        {/* Vertical stack visualization */}
        <div className="max-w-4xl mx-auto mt-14 space-y-4">
          {defenseStackLayers.map((layer, i) => (
            <FadeInUp key={layer.key} delay={i * 0.08}>
              <div
                className={`relative bg-surface-2 rounded-xl border ${layer.borderColor} p-6 sm:p-8 hover:border-opacity-60 transition-all duration-300 group`}
              >
                {/* Layer connector line (not on first) */}
                {i > 0 && <div className="absolute -top-4 left-10 w-px h-4 bg-border" />}

                {/* Header row */}
                <div className="flex flex-wrap items-start gap-4 mb-4">
                  <div
                    className={`shrink-0 w-12 h-12 rounded-lg ${layer.bgGlow} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}
                  >
                    <layer.icon className={`w-6 h-6 ${layer.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span
                        className={`${layer.badgeBg} text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full`}
                      >
                        {t(`defenseStack.${layer.key}.layer`)}
                      </span>
                      <h3 className="text-lg font-bold text-text-primary">
                        {t(`defenseStack.${layer.key}.name`)}
                      </h3>
                    </div>
                    <p className="text-sm font-mono text-brand-sage">
                      {t(`defenseStack.${layer.key}.engine`)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {t(`defenseStack.${layer.key}.desc`)}
                </p>

                {/* Technical details grid */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-surface-0/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                      Detects
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t(`defenseStack.${layer.key}.detects`)}
                    </p>
                  </div>
                  <div className="bg-surface-0/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                      Implementation
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed font-mono">
                      {t(`defenseStack.${layer.key}.tech`)}
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Vertical flow indicator */}
        <FadeInUp delay={0.5}>
          <div className="flex items-center justify-center mt-8 gap-3">
            <div className="h-px w-12 bg-border" />
            <div className="flex items-center gap-2 text-text-tertiary">
              <MonitorIcon className="w-4 h-4 text-brand-sage" />
              <span className="text-xs font-medium">
                All layers feed into the unified event pipeline
              </span>
            </div>
            <div className="h-px w-12 bg-border" />
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* -- Data Flow Pipeline -- */}
      <SectionWrapper>
        <SectionTitle
          overline={t('dataFlow.overline')}
          title={t('dataFlow.title')}
          subtitle={t('dataFlow.subtitle')}
        />

        {/* Pipeline stages */}
        <div className="max-w-4xl mx-auto mt-14">
          {/* Desktop: horizontal flow */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-3">
            {dataFlowStages.map((stage, i) => (
              <FadeInUp key={stage.key} delay={i * 0.08}>
                <div className="relative">
                  <div className="card-glow bg-surface-1 rounded-xl border border-border p-5 text-center hover:border-brand-sage/30 transition-all duration-300 h-full">
                    {/* Step number */}
                    <div className="w-8 h-8 rounded-full bg-brand-sage/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-sm font-bold text-brand-sage">{i + 1}</span>
                    </div>
                    <stage.icon className="w-5 h-5 text-brand-sage mx-auto mb-2" />
                    <p className="text-sm font-bold text-text-primary mb-1.5">
                      {t(`dataFlow.${stage.key}.name`)}
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t(`dataFlow.${stage.key}.desc`)}
                    </p>
                  </div>
                  {/* Arrow connector */}
                  {i < 4 && (
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <ArrowRight className="w-4 h-4 text-brand-sage/40" />
                    </div>
                  )}
                </div>
              </FadeInUp>
            ))}
          </div>

          {/* Mobile: vertical flow */}
          <div className="lg:hidden space-y-3">
            {dataFlowStages.map((stage, i) => (
              <FadeInUp key={stage.key} delay={i * 0.08}>
                <div className="card-glow bg-surface-1 rounded-xl border border-border p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-brand-sage/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-sage">{i + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <stage.icon className="w-4 h-4 text-brand-sage shrink-0" />
                        <p className="text-sm font-bold text-text-primary">
                          {t(`dataFlow.${stage.key}.name`)}
                        </p>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {t(`dataFlow.${stage.key}.desc`)}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>

          {/* Latency badge */}
          <FadeInUp delay={0.5}>
            <div className="flex justify-center mt-6">
              <div className="inline-flex items-center gap-2 bg-brand-sage/10 text-brand-sage text-xs font-semibold px-4 py-2 rounded-full">
                <ResponseIcon className="w-3.5 h-3.5" />
                <span>End-to-end latency: &lt;200ms typical</span>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* -- Four Agent Architecture -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={t('agents.overline')}
          title={t('agents.title')}
          subtitle={t('agents.subtitle')}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agentConfigs.map((a, i) => (
            <FadeInUp key={a.key} delay={i * 0.08}>
              <div className="bg-surface-2 rounded-xl p-6 border border-border h-full flex flex-col">
                <a.icon className="w-6 h-6 text-brand-sage mb-4 shrink-0" />
                <p className="text-sm font-bold text-text-primary">{t(`agents.${a.key}.name`)}</p>
                <p className="text-[11px] uppercase tracking-wider text-brand-sage font-semibold mt-0.5 mb-3">
                  {t(`agents.${a.key}.role`)}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed flex-1">
                  {t(`agents.${a.key}.desc`)}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Flow arrows (desktop) */}
        <FadeInUp delay={0.4}>
          <div className="hidden lg:flex items-center justify-center gap-2 mt-6 text-text-muted">
            {['detect', 'analyze', 'respond', 'report'].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-tertiary">
                  {t(`agents.${step}.name`)}
                </span>
                {i < 3 && <ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
              </span>
            ))}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* -- Context Memory -- */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                {t('contextMemory.overline')}
              </p>
              <h2 className="text-[clamp(32px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
                {t('contextMemory.title')}
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">{t('contextMemory.desc1')}</p>
              <p className="text-text-secondary mt-4 leading-relaxed">{t('contextMemory.desc2')}</p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 space-y-4">
              {(['phase1', 'phase2', 'phase3', 'phase4'] as const).map((phase) => (
                <div key={phase} className="flex gap-4 items-start">
                  <div className="shrink-0 w-20">
                    <span className="text-xs font-semibold text-brand-sage">
                      {t(`contextMemory.${phase}.day`)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {t(`contextMemory.${phase}.label`)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {t(`contextMemory.${phase}.desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* -- Confidence Scoring -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={t('confidenceScoring.overline')}
          title={t('confidenceScoring.title')}
          subtitle={t('confidenceScoring.subtitle')}
        />
        <div className="max-w-3xl mx-auto mt-14 space-y-6">
          {confidenceConfigs.map((band, i) => (
            <FadeInUp key={band.key} delay={i * 0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <span className="text-lg font-bold text-text-primary font-mono">
                    {t(`confidenceScoring.${band.key}.range`)}
                  </span>
                  <span className="text-sm font-semibold text-text-secondary">
                    {t(`confidenceScoring.${band.key}.label`)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-3 rounded-full mb-3">
                  <div
                    className={`h-full ${band.color} rounded-full`}
                    style={{ width: confidenceBarWidths[band.key] }}
                  />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`confidenceScoring.${band.key}.desc`)}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* -- Collective Threat Intelligence -- */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeInUp>
            <div className="bg-surface-1 rounded-xl border border-border p-6">
              <div className="space-y-4">
                {collectiveConfigs.map((item) => (
                  <div key={item.key} className="flex gap-4 items-start">
                    <item.icon className="w-5 h-5 text-brand-sage shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {t(`collectiveIntelligence.${item.key}.label`)}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {t(`collectiveIntelligence.${item.key}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                {t('collectiveIntelligence.overline')}
              </p>
              <h2 className="text-[clamp(32px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
                {t('collectiveIntelligence.title')}
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                {t('collectiveIntelligence.desc1')}
              </p>
              <p className="text-text-secondary mt-4 leading-relaxed">
                {t('collectiveIntelligence.desc2')}
              </p>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* -- Graceful Degradation -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={t('resilience.overline')}
          title={t('resilience.title')}
          subtitle={t('resilience.subtitle')}
        />
        <div className="max-w-3xl mx-auto mt-14">
          <FadeInUp>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              {resilienceConfigs.map((level, i) => (
                <div
                  key={level.key}
                  className={`flex items-start gap-4 p-6 ${i < 3 ? 'border-b border-border' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full ${level.color} mt-1.5 shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <level.icon className="w-4 h-4 text-text-tertiary" />
                      <p className="text-sm font-semibold text-text-primary">
                        {t(`resilience.${level.key}.status`)}
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {t(`resilience.${level.key}.desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* -- Tech Stack -- */}
      <SectionWrapper>
        <SectionTitle
          overline={t('stack.overline')}
          title={t('stack.title')}
          subtitle={t('stack.subtitle')}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-14">
          {stackConfigs.map((item, i) => (
            <FadeInUp key={item.key} delay={i * 0.05}>
              <div className="card-glow bg-surface-1 rounded-xl border border-border p-5 text-center hover:border-border-hover transition-colors">
                <item.icon className="w-5 h-5 text-brand-sage mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-primary">
                  {t(`stack.${item.key}.name`)}
                </p>
                <p className="text-xs text-text-tertiary mt-1">{t(`stack.${item.key}.desc`)}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* -- CTA -- */}
      <SectionWrapper dark>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary">
              {t('cta.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">{t('cta.desc')}</p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="https://docs.panguard.ai/quickstart"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('cta.cta1')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://docs.panguard.ai"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('cta.cta2')}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
