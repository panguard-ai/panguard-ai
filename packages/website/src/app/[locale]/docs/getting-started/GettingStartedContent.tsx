'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Copy, Check, Terminal, Monitor, Server } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = 'macos' | 'linux' | 'windows';
type InstallMethod = 'curl' | 'npm';

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Terminal }> = {
  macos: { label: 'macOS', icon: Terminal },
  linux: { label: 'Linux', icon: Server },
  windows: { label: 'Windows', icon: Monitor },
};

// ---------------------------------------------------------------------------
// Install data — inspired by Claude Code's nested-tab pattern
// ---------------------------------------------------------------------------

interface InstallOption {
  method: InstallMethod;
  label: string;
  labelZh?: string;
  recommended?: boolean;
  prereq?: string;
  command: string;
  note?: string;
  noteZh?: string;
}

const INSTALL_OPTIONS: Record<Platform, InstallOption[]> = {
  macos: [
    {
      method: 'curl',
      label: 'One-line Install',
      labelZh: '一行指令安裝',
      recommended: true,
      command: 'curl -fsSL https://get.panguard.ai | bash',
      note: 'Apple Silicon (ARM64) native binary. Intel Mac users: install via npm, or enable Rosetta 2 first.',
      noteZh:
        'Apple Silicon（ARM64）原生 binary。Intel Mac 使用者：請改用 npm 安裝，或先啟用 Rosetta 2。',
    },
    {
      method: 'npm',
      label: 'npm',
      command: 'npm install -g @panguard-ai/panguard && pga up',
      note: 'Requires Node.js 20+. Works on both Apple Silicon and Intel Mac.',
      noteZh: '需要 Node.js 20+。Apple Silicon 與 Intel Mac 皆可使用。',
    },
  ],
  linux: [
    {
      method: 'curl',
      label: 'One-line Install',
      labelZh: '一行指令安裝',
      recommended: true,
      command: 'curl -fsSL https://get.panguard.ai | bash',
      note: 'Supports x64 and ARM64 architectures. Requires Node.js 20+.',
      noteZh: '支援 x64 與 ARM64 架構。需要 Node.js 20+。',
    },
    {
      method: 'npm',
      label: 'npm',
      prereq:
        '# Ubuntu / Debian\ncurl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt-get install -y nodejs\n\n# CentOS / RHEL\ncurl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -\nsudo yum install -y nodejs',
      command: 'npm install -g @panguard-ai/panguard && pga up',
    },
  ],
  windows: [
    {
      method: 'npm',
      label: 'npm (Recommended)',
      labelZh: 'npm（推薦）',
      recommended: true,
      prereq:
        '# Install Node.js first (pick one):\nwinget install OpenJS.NodeJS.LTS\n# Or download from https://nodejs.org (v20+ LTS)',
      command: 'npm install -g @panguard-ai/panguard && pga up',
    },
    {
      method: 'curl',
      label: 'PowerShell',
      command:
        'powershell -ExecutionPolicy Bypass -Command "irm https://get.panguard.ai/windows | iex"',
      note: 'If using PowerShell 7+: pwsh -ExecutionPolicy Bypass -Command "irm https://get.panguard.ai/windows | iex"',
      noteZh:
        '若使用 PowerShell 7+：pwsh -ExecutionPolicy Bypass -Command "irm https://get.panguard.ai/windows | iex"',
    },
  ],
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useDetectedPlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('macos');
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Win/.test(ua)) setPlatform('windows');
    else if (/Linux/.test(ua)) setPlatform('linux');
  }, []);
  return platform;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copyText = code.replace(/^#.*\n?/gm, '').trim();
  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0c0d0c] border border-border rounded-xl overflow-hidden group">
      {label && (
        <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono">{label}</span>
          <button
            onClick={handleCopy}
            className="text-text-muted hover:text-text-secondary transition-colors p-1 opacity-0 group-hover:opacity-100"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-status-safe" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code.split('\n').map((line, i) => (
          <span key={i} className={line.startsWith('#') ? 'text-text-muted' : 'text-text-primary'}>
            {line}
            {i < code.split('\n').length - 1 && '\n'}
          </span>
        ))}
      </pre>
    </div>
  );
}

function PlatformTabs({
  selected,
  onChange,
}: {
  selected: Platform;
  onChange: (p: Platform) => void;
}) {
  const platforms: Platform[] = ['macos', 'linux', 'windows'];
  return (
    <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1 w-fit">
      {platforms.map((p) => {
        const Icon = PLATFORM_META[p].icon;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selected === p
                ? 'bg-brand-sage text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {PLATFORM_META[p].label}
          </button>
        );
      })}
    </div>
  );
}

function MethodTabs({
  options,
  selected,
  onChange,
}: {
  options: InstallOption[];
  selected: InstallMethod;
  onChange: (m: InstallMethod) => void;
}) {
  const isZh = useLocale() === 'zh-TW';
  return (
    <div className="flex gap-1 bg-surface-1/50 border border-border/60 rounded-lg p-0.5 w-fit">
      {options.map((opt) => (
        <button
          key={opt.method}
          onClick={() => onChange(opt.method)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            selected === opt.method
              ? 'bg-surface-1 text-text-primary border border-border'
              : 'text-text-muted hover:text-text-secondary border border-transparent'
          }`}
        >
          {isZh && opt.labelZh ? opt.labelZh : opt.label}
        </button>
      ))}
    </div>
  );
}

function TerminalOutput({ lines }: { lines: string[] }) {
  return (
    <div className="bg-[#0c0d0c] border border-border rounded-xl p-4 font-mono text-sm space-y-1">
      {lines.map((line, i) => {
        const isOk = line.startsWith('[OK]');
        return (
          <p key={i} className={isOk ? 'text-status-safe' : 'text-text-muted'}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GettingStartedContent() {
  const t = useTranslations('docs.gettingStarted');
  const isZh = useLocale() === 'zh-TW';
  const detectedPlatform = useDetectedPlatform();
  const [platform, setPlatform] = useState<Platform>('macos');
  const [method, setMethod] = useState<InstallMethod>('curl');

  useEffect(() => {
    setPlatform(detectedPlatform);
    setMethod(INSTALL_OPTIONS[detectedPlatform][0].method);
  }, [detectedPlatform]);

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    setMethod(INSTALL_OPTIONS[p][0].method);
  };

  const options = INSTALL_OPTIONS[platform];
  const activeOption = options.find((o) => o.method === method) || options[0];

  return (
    <>
      {/* Hero */}
      <SectionWrapper spacing="spacious">
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <Link
              href="https://docs.panguard.ai"
              className="text-sm text-text-muted hover:text-brand-sage transition-colors"
            >
              {t('backToDocs')}
            </Link>
            <h1 className="text-[clamp(32px,4vw,48px)] font-bold text-text-primary mt-4 leading-[1.1]">
              {t('title')}
            </h1>
            <p className="text-text-secondary mt-4 text-lg leading-relaxed">{t('subtitle')}</p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Step 1: Install */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('step1Title')}</h2>
            <p className="text-text-secondary mb-6">{t('step1Desc')}</p>

            {/* Platform selector */}
            <PlatformTabs selected={platform} onChange={handlePlatformChange} />

            {/* Method selector */}
            <div className="mt-4 mb-5">
              <MethodTabs options={options} selected={method} onChange={setMethod} />
            </div>

            {/* Prereq (if any) */}
            {activeOption.prereq && (
              <div className="mb-3">
                <CodeBlock code={activeOption.prereq} label="Prerequisites" />
              </div>
            )}

            {/* Install command */}
            <CodeBlock code={activeOption.command} label="Install" />

            {/* Note */}
            {activeOption.note && (
              <p className="text-xs text-text-muted mt-2">
                {isZh && activeOption.noteZh ? activeOption.noteZh : activeOption.note}
              </p>
            )}

            {/* Verify */}
            <div className="mt-6 pt-6 border-t border-border/40">
              <p className="text-sm text-text-secondary mb-3">
                {isZh ? '驗證安裝：' : 'Verify the installation:'}
              </p>
              <CodeBlock
                code={`panguard --version\n# Expected: ${STATS.cliVersion}`}
                label="Terminal"
              />
            </div>

            {/* Setup step */}
            <div className="mt-4">
              <p className="text-sm text-text-secondary mb-3">
                {isZh
                  ? '執行 setup 自動設定所有偵測到的 AI 平台（Claude Code、Claude Desktop、Cursor、OpenClaw、Codex、WorkBuddy、NemoClaw、ArkClaw、Windsurf、QClaw、Cline、VS Code Copilot、Zed、Gemini CLI、Continue、Roo Code）：'
                  : 'Run setup to auto-configure all detected AI platforms (Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, WorkBuddy, NemoClaw, ArkClaw, Windsurf, QClaw, Cline, VS Code Copilot, Zed, Gemini CLI, Continue, Roo Code):'}
              </p>
              <CodeBlock code="pga setup" label="Terminal" />
              <p className="text-xs text-text-muted mt-1">
                {isZh ? (
                  <>
                    提示：<code className="text-panguard-green">pga</code> 是{' '}
                    <code className="text-text-muted">panguard</code> 的縮寫，兩者皆可使用。
                  </>
                ) : (
                  <>
                    Tip: <code className="text-panguard-green">pga</code> is a shortcut for{' '}
                    <code className="text-text-muted">panguard</code>. Both work.
                  </>
                )}
              </p>
            </div>

            {/* Then start */}
            <div className="mt-4">
              <p className="text-sm text-text-secondary mb-3">
                {isZh ? '接著在任何專案中啟動 Panguard：' : 'Then start Panguard in any project:'}
              </p>
              <CodeBlock code={`cd your-project\npga scan`} label="Terminal" />
            </div>

            <div className="mt-4">
              <TerminalOutput
                lines={[
                  `[OK] Panguard v${STATS.cliVersion} installed`,
                  `[OK] Rule engine loaded (${STATS.atrRules} ATR + ${STATS.totalRulesDisplay} total rules)`,
                  '[OK] Scan complete.',
                ]}
              />
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Platform Quick Start Guides */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              {isZh ? '平台快速上手' : 'Platform Quick Start'}
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              {isZh
                ? '各 AI 平台的逐步指南。選擇你用的平台。'
                : 'Step-by-step for each AI platform. Pick yours.'}
            </p>
          </FadeInUp>

          <div className="space-y-6">
            {/* Claude Code */}
            <FadeInUp delay={0.05}>
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-panguard-green/10 flex items-center justify-center text-[10px] font-bold text-panguard-green">
                    CC
                  </span>
                  Claude Code
                </h3>
                <div className="space-y-3 text-sm text-text-secondary">
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 1：' : 'Step 1:'}</strong>
                    {isZh ? '打開終端機' : ' Open your terminal'}
                  </p>
                  <CodeBlock
                    code="npm install -g @panguard-ai/panguard && pga up"
                    label="Install"
                  />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 2：' : 'Step 2:'}</strong>
                    {isZh ? '自動設定 Claude Code' : ' Auto-configure Claude Code'}
                  </p>
                  <CodeBlock code="pga setup --platform claude-code" label="Setup" />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 3：' : 'Step 3:'}</strong>
                    {isZh ? '重新啟動 Claude Code，然後試試：' : ' Restart Claude Code, then try:'}
                  </p>
                  <CodeBlock
                    code={
                      '# In Claude Code, ask:\n"scan my current project for security issues"\n"audit the MCP skill at github.com/owner/repo"'
                    }
                    label="Claude Code"
                  />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 4：' : 'Step 4:'}</strong>
                    {isZh ? '啟動 24/7 防護' : ' Start 24/7 protection'}
                  </p>
                  <CodeBlock code="pga guard start --dashboard" label="Terminal" />
                  <p className="text-xs text-panguard-green">
                    {isZh
                      ? '完成！Claude Code 現在透過 MCP 擁有 11 個安全工具，Guard 24/7 監控一切。'
                      : 'Done! Claude Code now has 11 security tools via MCP. Guard monitors everything 24/7.'}
                  </p>
                </div>
              </div>
            </FadeInUp>

            {/* OpenClaw */}
            <FadeInUp delay={0.1}>
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-panguard-green/10 flex items-center justify-center text-[10px] font-bold text-panguard-green">
                    OC
                  </span>
                  OpenClaw
                </h3>
                <div className="space-y-3 text-sm text-text-secondary">
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 1：' : 'Step 1:'}</strong>
                    {isZh ? '安裝 PanGuard' : ' Install PanGuard'}
                  </p>
                  <CodeBlock
                    code="npm install -g @panguard-ai/panguard && pga up"
                    label="Install"
                  />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 2：' : 'Step 2:'}</strong>
                    {isZh ? '自動設定 OpenClaw' : ' Auto-configure OpenClaw'}
                  </p>
                  <CodeBlock code="pga setup --platform openclaw" label="Setup" />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 3：' : 'Step 3:'}</strong>
                    {isZh ? '關閉並重新開啟 OpenClaw' : ' Close and reopen OpenClaw'}
                  </p>
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 4：' : 'Step 4:'}</strong>
                    {isZh
                      ? 'PanGuard 工具現在已可在 OpenClaw 中使用。試試：'
                      : ' In OpenClaw, PanGuard tools are now available. Try:'}
                  </p>
                  <CodeBlock
                    code={
                      '# In OpenClaw, ask:\n"use panguard to scan this project"\n"audit the skill I just installed"'
                    }
                    label="OpenClaw"
                  />
                  <p>
                    <strong className="text-text-primary">{isZh ? '步驟 5：' : 'Step 5:'}</strong>
                    {isZh ? '啟動 Guard 提供持續防護' : ' Start Guard for continuous protection'}
                  </p>
                  <CodeBlock code="pga guard start --dashboard" label="Terminal" />
                  <p className="text-xs text-panguard-green">
                    {isZh
                      ? '完成！OpenClaw 之後安裝的每一個 skill 都會自動接受審計。'
                      : 'Done! Every skill OpenClaw installs will be automatically audited.'}
                  </p>
                </div>
              </div>
            </FadeInUp>

            {/* All Platforms */}
            <FadeInUp delay={0.15}>
              <div className="bg-surface-2/30 border border-border rounded-xl p-5 text-center">
                <p className="text-sm text-text-secondary mb-2">
                  {isZh ? '或者，一次自動偵測所有平台：' : 'Or auto-detect all platforms at once:'}
                </p>
                <CodeBlock code="pga setup" label="Terminal" />
                <p className="text-xs text-text-muted mt-2">
                  {isZh
                    ? '自動偵測 15 種 agent runtime——Claude Code、Claude Desktop、Cursor、OpenClaw、Codex、Windsurf、Gemini CLI 等——並將 PanGuard 的 MCP 防護註冊進每一個（VS Code Copilot 與 Zed 為預覽版，不計入）。'
                    : "Auto-detects 15 agent runtimes — Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, Windsurf, Gemini CLI, and more — and registers PanGuard's MCP protection into each (VS Code Copilot and Zed are in preview, not counted)."}
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* GitHub Action CI/CD */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">GitHub Action (CI/CD)</h2>
            <p className="text-text-secondary mb-6">
              {isZh
                ? '在惡意 MCP skill 與 SKILL.md 檔案進入 production 之前就攔下。workflow 只需加一行，結果會顯示在 GitHub Security 分頁。'
                : 'Block malicious MCP skills and SKILL.md files before they reach production. One line in your workflow. Results appear in the GitHub Security tab.'}
            </p>

            <div className="bg-surface-1 border border-border rounded-xl p-5">
              <p className="text-sm font-semibold text-text-primary mb-3">
                {isZh
                  ? '加入你的 workflow（.github/workflows/atr-scan.yml）：'
                  : 'Add to your workflow (.github/workflows/atr-scan.yml):'}
              </p>
              <CodeBlock
                code={`name: ATR Security Scan
on: [push, pull_request]
jobs:
  atr-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: Agent-Threat-Rule/agent-threat-rules@v1
        with:
          severity: medium      # minimum severity to report
          fail-on-finding: true # block PRs with threats`}
                label=".github/workflows/atr-scan.yml"
              />

              <div className="mt-4 space-y-2 text-sm text-text-secondary">
                <p>
                  <strong className="text-text-primary">
                    {isZh ? '它做什麼：' : 'What it does:'}
                  </strong>
                  {isZh ? (
                    <>
                      使用 {STATS.atrRules} 條 ATR 偵測規則掃描 repo 中的 MCP 設定檔與 SKILL.md
                      檔案，並將 SARIF 結果輸出到 GitHub Security 分頁。
                    </>
                  ) : (
                    <>
                      {' '}
                      Scans your repo for MCP config files and SKILL.md files using {
                        STATS.atrRules
                      }{' '}
                      ATR detection rules. Outputs SARIF to the GitHub Security tab.
                    </>
                  )}
                </p>
                <p>
                  <strong className="text-text-primary">{isZh ? '選項：' : 'Options:'}</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-text-muted text-xs">
                  <li>
                    <code className="text-text-secondary">severity</code>
                    {isZh
                      ? '——回報的最低等級：informational、low、medium（預設）、high、critical'
                      : ' — minimum level to report: informational, low, medium (default), high, critical'}
                  </li>
                  <li>
                    <code className="text-text-secondary">fail-on-finding</code>
                    {isZh ? (
                      <>
                        ——設為 <code className="text-text-secondary">false</code> 時只警告、不阻擋
                      </>
                    ) : (
                      <>
                        {' '}
                        — set <code className="text-text-secondary">false</code> to warn without
                        blocking
                      </>
                    )}
                  </li>
                  <li>
                    <code className="text-text-secondary">path</code>
                    {isZh
                      ? '——掃描特定目錄（預設：整個 repo）'
                      : ' — scan a specific directory (default: entire repo)'}
                  </li>
                </ul>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Step 2: What you can do */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-6">{t('step2Title')}</h2>

            <div className="space-y-4">
              {/* Scan */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step2Desc')}</p>
                <CodeBlock code="pga scan" label="Terminal" />
                <p className="text-text-secondary text-sm mt-3">{t('step2Deep')}</p>
                <div className="mt-2">
                  <CodeBlock code="pga scan --deep" label="Terminal" />
                </div>
              </div>

              {/* Guard */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step3Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step3Desc')}</p>
                <CodeBlock code="pga guard start" label="Terminal" />
              </div>

              {/* Chat */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step4Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step4Desc')}</p>
                <CodeBlock
                  code={`panguard chat config\n# Follow the prompts to connect LINE, Slack, or Telegram`}
                  label="Terminal"
                />
              </div>

              {/* Understanding Scan Results */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step5Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step5Desc')}</p>
                <ul className="space-y-1 text-sm text-text-secondary">
                  <li>{t('step5Score')}</li>
                  <li>{t('step5Grade')}</li>
                  <li>{t('step5Findings')}</li>
                </ul>
              </div>

              {/* JSON output */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step6Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step6Desc')}</p>
                <CodeBlock code="pga scan --json" label="Terminal" />
                <div className="mt-3">
                  <TerminalOutput
                    lines={[
                      '{"riskScore": 72, "findings": 8, "critical": 1, "high": 2, "medium": 3, "low": 2,',
                      ' "scanDuration": "47s", "framework": "ISO 27001",',
                      ' "topFinding": "SSH root login enabled (critical)"}',
                    ]}
                  />
                </div>
              </div>

              {/* SAST code scanning */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">
                  {isZh ? 'SAST 程式碼掃描' : 'SAST Code Scanning'}
                </p>
                <p className="text-text-secondary text-sm mb-3">
                  {isZh
                    ? '掃描你的原始碼，找出 SQL injection、XSS、寫死的 secret 等問題。'
                    : 'Scan your source code for SQL injection, XSS, hardcoded secrets, and more.'}
                </p>
                <CodeBlock code="pga scan code --dir ./my-app --json" label="Terminal" />
                <div className="mt-3">
                  <TerminalOutput
                    lines={[
                      '[OK] Scanning ./my-app (142 files)',
                      '[OK] Semgrep: 3 findings',
                      '[OK] Built-in patterns: 1 finding',
                      '[OK] Secrets scanner: 0 findings',
                      '{"totalFindings": 4, "critical": 1, "high": 2, "medium": 1,',
                      ' "topFinding": "Hardcoded AWS access key in config.js (critical)"}',
                    ]}
                  />
                </div>
                <span className="inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400">
                  Beta
                </span>
              </div>

              {/* Remote scanning */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step7Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step7Desc')}</p>
                <CodeBlock
                  code={`pga scan --target example.com\npanguard scan --target 1.2.3.4 --json`}
                  label="Terminal"
                />
              </div>

              {/* Reports */}
              <div className="bg-surface-1 border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-2">{t('step8Title')}</p>
                <p className="text-text-secondary text-sm mb-3">{t('step8Desc')}</p>
                <CodeBlock
                  code={`panguard report generate --framework iso27001\npanguard report generate --framework soc2\npanguard report generate --framework tcsa`}
                  label="Terminal"
                />
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* CLI Reference */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('step9Title')}</h2>
            <p className="text-text-secondary mb-6">{t('step9Desc')}</p>

            <div className="bg-[#0c0d0c] border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-border/60">
                <span className="text-xs text-text-muted font-mono">CLI Commands</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-2">
                {[
                  { cmd: 'pga', desc: 'Open interactive menu', descZh: '開啟互動式選單' },
                  {
                    cmd: 'pga up',
                    desc: 'Start protection + dashboard',
                    descZh: '啟動防護 + dashboard',
                  },
                  {
                    cmd: 'pga setup',
                    desc: 'Auto-configure AI platforms',
                    descZh: '自動設定 AI 平台',
                  },
                  { cmd: 'pga scan', desc: 'Run security scan', descZh: '執行安全掃描' },
                  {
                    cmd: 'pga scan --deep',
                    desc: 'Deep scan with all engines',
                    descZh: '啟用所有引擎深度掃描',
                  },
                  {
                    cmd: 'pga audit skill <dir>',
                    desc: 'Audit a skill before installing',
                    descZh: '安裝前先審計 skill',
                  },
                  {
                    cmd: 'pga guard start',
                    desc: 'Start real-time protection',
                    descZh: '啟動即時防護',
                  },
                  { cmd: 'pga status', desc: 'Check protection status', descZh: '查看防護狀態' },
                  { cmd: 'pga doctor', desc: 'Diagnose installation', descZh: '診斷安裝問題' },
                  { cmd: 'pga --help', desc: 'Show all commands', descZh: '顯示所有指令' },
                ].map(({ cmd, desc, descZh }) => (
                  <div key={cmd} className="flex items-baseline gap-3">
                    <code className="text-text-primary whitespace-nowrap">{cmd}</code>
                    <span className="text-text-muted text-xs hidden sm:inline">{'—'}</span>
                    <span className="text-text-muted text-xs hidden sm:inline">
                      {isZh ? descZh : desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Deployment Checklist */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('checklistTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('checklistDesc')}</p>

            <div className="space-y-4">
              {(['cl1', 'cl2', 'cl3', 'cl4', 'cl5'] as const).map((key) => (
                <div key={key} className="bg-surface-1 border border-border rounded-xl p-5">
                  <p className="text-sm font-semibold text-text-primary mb-1">
                    {t(`${key}.title`)}
                  </p>
                  <p className="text-text-secondary text-sm mb-3">{t(`${key}.desc`)}</p>
                  <CodeBlock code={t(`${key}.cmd`)} label="Terminal" />
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Advanced Configuration Hints */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('advancedHintTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('advancedHintDesc')}</p>

            <div className="space-y-3">
              {[t('advancedHintOllama')].map((hint) => (
                <div key={hint} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary leading-relaxed">{hint}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted mt-4 mb-4">{t('advancedHintEnv')}</p>

            <Link
              href="https://docs.panguard.ai/installation"
              className="inline-flex items-center gap-1.5 text-sm text-brand-sage hover:text-brand-sage-light transition-colors font-medium"
            >
              {t('advancedHintLink')}
            </Link>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Multi-Endpoint Deployment Hints */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('multiEndpointTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('multiEndpointDesc')}</p>

            <CodeBlock
              code={`#!/bin/bash\n# servers.txt: one IP per line\nfor server in $(cat servers.txt); do\n  ssh root@$server 'curl -fsSL https://get.panguard.ai | bash && panguard guard start'\ndone`}
              label={t('multiEndpointSshLabel')}
            />

            <p className="text-sm text-text-secondary mt-4 mb-4">{t('multiEndpointAnsibleHint')}</p>

            <Link
              href="https://docs.panguard.ai/guides/docker-deployment"
              className="inline-flex items-center gap-1.5 text-sm text-brand-sage hover:text-brand-sage-light transition-colors font-medium"
            >
              {t('multiEndpointLink')}
            </Link>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Next steps CTA */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-text-primary mb-3">{t('nextTitle')}</h2>
            <p className="text-text-secondary mb-8">{t('nextDesc')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="https://docs.panguard.ai"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('nextDocs')}
              </Link>
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                GitHub
              </a>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
