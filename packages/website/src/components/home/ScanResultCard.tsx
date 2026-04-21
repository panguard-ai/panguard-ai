'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Share2, AlertTriangle } from 'lucide-react';
import type { ScanReport, ScanResponse } from '@/hooks/useSkillScan';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

/** Localize ATR finding titles and descriptions */
const FINDING_ZH: Record<string, { title: string; desc?: string }> = {
  'Credential and Secret Exposure in Agent Output': {
    title: '憑證與機密外洩',
    desc: '偵測到資料庫連線字串或憑證資訊可能被 Agent 輸出',
  },
  'Unauthorized Financial Action by AI Agent': {
    title: '未授權的金融操作',
    desc: '偵測到支付平台相關的工具呼叫',
  },
  'High-Risk Tool Invocation Without Human Confirmation': {
    title: '高風險工具呼叫（無人工確認）',
    desc: '危險工具被呼叫但沒有人工確認機制',
  },
  'Privilege Escalation and Admin Function Access': {
    title: '權限提升與管理功能存取',
    desc: '偵測到 Shell 或指令執行的工具呼叫',
  },
  'Indirect Prompt Injection via External Content': {
    title: '透過外部內容的間接 Prompt 注入',
    desc: '偵測到可能的注入內容（JavaScript URI、隱藏指令）',
  },
  'Skill Description-Behavior Mismatch': {
    title: 'Skill 描述與行為不一致',
    desc: 'Skill 的實際行為與其描述不符',
  },
  'Multi-Skill Chain Attack': { title: '多 Skill 串聯攻擊', desc: '偵測到可能的多工具串聯利用' },
  'Unauthorized Tool Call Detection': {
    title: '未授權工具呼叫',
    desc: '偵測到 Shell metacharacter 注入或危險指令',
  },
  'Direct Prompt Injection': { title: '直接 Prompt 注入', desc: '偵測到覆蓋系統指令的注入語句' },
  'Parameter Injection via Tool Arguments': {
    title: '透過工具參數的注入攻擊',
    desc: '工具參數中偵測到注入 payload',
  },
  'Malicious Content in MCP Tool Response': {
    title: 'MCP 工具回應中的惡意內容',
    desc: '工具回應中偵測到隱藏指令或惡意內容',
  },
  'System Prompt Leakage': { title: '系統 Prompt 洩漏', desc: '偵測到系統 Prompt 可能被洩漏' },
  'Data Exfiltration via Agent Tools': {
    title: '透過 Agent 工具的資料外洩',
    desc: '偵測到資料可能被傳送至外部端點',
  },
};

const SEVERITY_ZH: Record<string, string> = {
  critical: '嚴重',
  high: '高',
  medium: '中',
  low: '低',
  info: '資訊',
};

const CHECK_ZH: Record<string, string> = {
  'Secrets: none found': '機密偵測：未發現',
  'Manifest: valid': '宣告檔：有效',
  'Manifest: incomplete structure': '宣告檔：結構不完整',
  'Manifest: no SKILL.md found, analyzed README.md': '宣告檔：未找到 SKILL.md，已分析 README.md',
};

function localizeCheck(label: string, isZh: boolean): string {
  if (!isZh) return label;
  // Check exact match first
  if (CHECK_ZH[label]) return CHECK_ZH[label];
  // Dynamic patterns
  if (label.startsWith('ATR Detection:')) {
    return label
      .replace('ATR Detection:', 'ATR 偵測:')
      .replace('rule(s) triggered', '條規則觸發')
      .replace('evaluated', '條已評估')
      .replace('clean', '安全');
  }
  if (label.startsWith('Secrets:'))
    return label.replace('Secrets:', '機密偵測:').replace('exposed', '組已暴露');
  if (label.startsWith('Size:')) return label.replace('Size:', '大小:');
  return label;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  info: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
};

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-emerald-400',
};

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_COLORS[level] ?? 'text-gray-400';
  const barColor =
    level === 'CRITICAL'
      ? 'bg-red-400'
      : level === 'HIGH'
        ? 'bg-orange-400'
        : level === 'MEDIUM'
          ? 'bg-yellow-400'
          : 'bg-emerald-400';

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-2xl font-extrabold ${color}`}>{score}</span>
        <span className="text-sm text-text-muted">/100</span>
      </div>
      <span
        className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${color} ${barColor}/10 border border-current/20`}
      >
        {level}
      </span>
    </div>
  );
}

interface ScanResultCardProps {
  report: ScanReport;
  meta: NonNullable<ScanResponse['data']>;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  url: string;
}

export default function ScanResultCard({
  report,
  meta,
  expanded,
  setExpanded,
  url,
}: ScanResultCardProps) {
  const t = useTranslations('home.scanResult');
  const locale = useTranslations()('', { defaultValue: '' }) === '' ? 'en' : 'en'; // fallback
  // Detect ZH by checking if a known ZH-only key returns Chinese
  const isZh = t('shareX') === '分享到 X';
  const isRisky = report.riskLevel === 'HIGH' || report.riskLevel === 'CRITICAL';

  // Build share text
  const shareText = `${report.skillName ?? 'This skill'} scored ${report.riskScore}/100 on @panguard_ai Skill Audit. ${report.findings.length} issue(s) found.`;
  const shareUrl = `https://panguard.ai/?scan=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  // Build GitHub issue URL for author notification
  const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
  const notifyUrl = repoMatch
    ? `https://github.com/${repoMatch[1]}/issues/new?title=${encodeURIComponent(
        `[Security] PanGuard Skill Audit: ${report.riskLevel} risk (${report.riskScore}/100)`
      )}&body=${encodeURIComponent(
        `## PanGuard Skill Audit Report\n\n` +
          `- **Risk Score**: ${report.riskScore}/100\n` +
          `- **Risk Level**: ${report.riskLevel}\n` +
          `- **Findings**: ${report.findings.length}\n\n` +
          `### Top Findings\n\n` +
          report.findings
            .slice(0, 5)
            .map((f) => `- **[${f.severity.toUpperCase()}]** ${f.title}: ${f.description}`)
            .join('\n') +
          `\n\n[Full scan results](${shareUrl})\n\n` +
          `---\n*Scanned by [PanGuard AI](https://panguard.ai) - Open source AI agent security*`
      )}&labels=security`
    : null;

  // ATR Proposal URL
  const atrProposalUrl = `https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/new?title=${encodeURIComponent(
    `[ATR Proposal] ${report.skillName ?? 'Unknown'} - Risk ${report.riskScore}`
  )}&body=${encodeURIComponent(
    `## Skill\n\n- **Name**: ${report.skillName ?? 'Unknown'}\n- **Risk Score**: ${report.riskScore}/100\n- **Risk Level**: ${report.riskLevel}\n\n## Top Findings\n\n${report.findings
      .slice(0, 5)
      .map((f) => `- **[${f.severity.toUpperCase()}]** ${f.title}: ${f.description}`)
      .join('\n')}\n\n## Proposed ATR Rule\n\n_Describe the detection logic you propose..._\n`
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 bg-surface-1 border border-border rounded-2xl overflow-hidden"
    >
      {/* Report header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-text-primary">
            {report.skillName ?? 'Unknown Skill'}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            {meta.cached && (
              <span className="bg-panguard-green/10 text-panguard-green px-2 py-0.5 rounded-full">
                {isZh ? '已快取' : 'Cached'}
              </span>
            )}
            <span>{report.durationMs}ms</span>
          </div>
        </div>
        <p className="text-[11px] text-text-muted mb-4">{meta.source}</p>
        <RiskGauge score={report.riskScore} level={report.riskLevel} />
      </div>

      {/* Checks summary */}
      <div className="px-5 py-3 border-b border-border bg-surface-2/30">
        <div className="flex flex-wrap gap-2">
          {report.checks.map((check) => (
            <span
              key={check.label}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                check.status === 'pass'
                  ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
                  : check.status === 'fail'
                    ? 'text-red-400 border-red-400/30 bg-red-400/5'
                    : check.status === 'warn'
                      ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'
                      : 'text-gray-400 border-gray-400/30 bg-gray-400/5'
              }`}
            >
              {check.status === 'pass' ? '\u2713' : check.status === 'fail' ? '\u2717' : '\u26A0'}{' '}
              {localizeCheck(check.label, isZh)}
            </span>
          ))}
        </div>
      </div>

      {/* Findings */}
      {report.findings.length > 0 && (
        <div className="px-5 py-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors mb-3"
          >
            {expanded
              ? isZh
                ? '隱藏發現'
                : 'Hide findings'
              : isZh
                ? `顯示 ${report.findings.length} 個發現`
                : `Show ${report.findings.length} finding(s)`}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {report.findings.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-lg border p-3 ${SEVERITY_COLORS[f.severity] ?? SEVERITY_COLORS.info}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold">
                        {isZh ? (FINDING_ZH[f.title]?.title ?? f.title) : f.title}
                      </p>
                      <span className="text-[10px] uppercase font-bold shrink-0">
                        {isZh ? (SEVERITY_ZH[f.severity] ?? f.severity) : f.severity}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">
                      {isZh ? (FINDING_ZH[f.title]?.desc ?? f.description) : f.description}
                    </p>
                    {f.location && (
                      <p className="text-[10px] opacity-60 mt-1 font-mono">{f.location}</p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Install scenario summary */}
      {report.findings.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-surface-2/20">
          <p className="text-[11px] font-semibold text-text-primary mb-1.5">
            {isZh ? '如果你安裝了這個 Skill：' : 'If you install this skill:'}
          </p>
          <ul className="space-y-1">
            {report.findings.slice(0, 3).map((f) => (
              <li key={f.id} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                <span
                  className={`shrink-0 mt-0.5 ${f.severity === 'critical' || f.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}
                >
                  {f.severity === 'critical' || f.severity === 'high' ? '\u26A0' : '\u2022'}
                </span>
                {isZh ? (FINDING_ZH[f.title]?.desc ?? f.description) : f.description}
              </li>
            ))}
          </ul>
          {report.riskLevel === 'LOW' && (
            <p className="text-[11px] text-emerald-400 font-semibold mt-2">
              {isZh
                ? '風險較低，但建議搭配 Guard 持續監控。'
                : 'Low risk. Consider running Guard for continuous monitoring.'}
            </p>
          )}
          {(report.riskLevel === 'MEDIUM' || report.riskLevel === 'HIGH') && (
            <p className="text-[11px] text-orange-400 font-semibold mt-2">
              {isZh
                ? '建議仔細檢查後再安裝，並啟用 Guard 即時監控。'
                : 'Review carefully before installing. Enable Guard for real-time monitoring.'}
            </p>
          )}
          {report.riskLevel === 'CRITICAL' && (
            <p className="text-[11px] text-red-400 font-semibold mt-2">
              {isZh
                ? '強烈建議不要安裝。此 Skill 可能竊取你的憑證或劫持你的 Agent。'
                : 'Do NOT install. This skill may steal credentials or hijack your agent.'}
            </p>
          )}
        </div>
      )}

      {/* 7-layer context — show what other PanGuard layers would do */}
      {report.findings.length > 0 && (
        <div className="px-5 py-4 border-t border-border bg-surface-2/40">
          <p className="text-[11px] font-semibold text-panguard-green mb-3">
            {isZh
              ? `Layer 2(稽核)攔到 ${report.findings.length} 個攻擊 — Layer 3-6 runtime 守護,L1/L7 2026 Q2/Q3 上線`
              : `Layer 2 (Audit) caught ${report.findings.length} attack${report.findings.length > 1 ? 's' : ''} — Layers 3-6 protect at runtime, L1/L7 ship Q2/Q3 2026`}
          </p>
          <ul className="space-y-1.5 text-[11px] text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="shrink-0">🛡</span>
              <span>
                <span className="font-semibold text-text-primary">
                  {isZh ? 'Layer 3 防護' : 'Layer 3 Protect'}
                </span>
                {isZh
                  ? ' — Guard 會在 runtime 阻擋這些呼叫'
                  : ' — Guard would BLOCK these at runtime'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">🪤</span>
              <span>
                <span className="font-semibold text-text-primary">
                  {isZh ? 'Layer 5 誘捕' : 'Layer 5 Deceive'}
                </span>
                {isZh
                  ? ' — Trap 蜜罐側錄攻擊者行為'
                  : ' — Trap profiles the attacker in a honeypot'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">📊</span>
              <span>
                <span className="font-semibold text-text-primary">
                  {isZh ? 'Layer 7 治理' : 'Layer 7 Govern'}
                </span>
                {isZh
                  ? ' — Threat Cloud 存取合規稽核日誌'
                  : ' — Threat Cloud logs for compliance audit'}
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-panguard-green hover:underline"
            >
              {isZh ? '免費安裝 Guard →' : 'Install Guard (free) →'}
            </Link>
            <Link
              href="/early-access"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:underline"
            >
              {isZh ? '加入 Team Waitlist →' : 'Join Team waitlist →'}
            </Link>
          </div>
        </div>
      )}

      {/* Action buttons — share, notify, propose */}
      {isRisky && (
        <div className="px-5 py-3 border-t border-border bg-red-400/5 flex flex-wrap items-center gap-3 justify-center">
          {/* Share on X */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors bg-surface-2 border border-border rounded-lg px-3 py-1.5"
          >
            <Share2 className="w-3 h-3" />
            {t('shareX')}
          </a>

          {/* Notify Author */}
          {notifyUrl && (
            <a
              href={notifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors bg-orange-400/10 border border-orange-400/30 rounded-lg px-3 py-1.5"
            >
              <AlertTriangle className="w-3 h-3" />
              {t('reportAuthor')}
            </a>
          )}

          {/* ATR Proposal */}
          <a
            href={atrProposalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-1.5"
          >
            <ExternalLink className="w-3 h-3" />
            {t('proposeATR')}
          </a>
        </div>
      )}

      {/* Flywheel explanation for risky results */}
      {isRisky && (
        <div className="px-5 py-3 border-t border-border bg-surface-2/20">
          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            {t('flywheelNote')}
          </p>
        </div>
      )}

      {/* Badge embed — show for all completed scans */}
      {meta.contentHash && (
        <div className="px-5 py-3 border-t border-border bg-surface-2/20">
          <p className="text-[11px] font-semibold text-text-primary mb-2">
            {isZh ? '加到你的 README：' : 'Add to your README:'}
          </p>
          <code className="block text-[10px] bg-surface-2 border border-border rounded-lg px-3 py-2 text-text-muted font-mono select-all break-all leading-relaxed">
            {`[![PanGuard Scanned](https://panguard.ai/api/scan/badge/${meta.contentHash}.svg)](https://panguard.ai)`}
          </code>
        </div>
      )}

      {/* Guard CTA — always show after scan results */}
      <div className="px-5 py-4 border-t border-border bg-panguard-green/5 text-center">
        <p className="text-xs font-bold text-panguard-green mb-1.5">
          {isZh
            ? '開啟 24/7 防護，讓你的 AI Agent 隨時受保護'
            : 'Start 24/7 protection for all your AI agents'}
        </p>
        <code className="inline-block text-[11px] bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-panguard-green font-mono select-all mb-2">
          npm install -g @panguard-ai/panguard && pga up
        </code>
        <p className="text-[10px] text-text-muted mb-2">
          {isZh
            ? `一行安裝。自動偵測 16 個平台：Claude Code、Cursor、Windsurf、Gemini CLI 等。${STATS.totalRulesDisplay} ATR 偵測規則即時防護。`
            : `One command. Auto-detects 16 platforms: Claude Code, Cursor, Windsurf, Gemini CLI + more. ${STATS.totalRulesDisplay} ATR detection rules.`}
        </p>
        <Link
          href="/docs/getting-started"
          className="inline-flex items-center gap-1 text-[11px] text-panguard-green hover:underline font-semibold"
        >
          {isZh ? '完整安裝指南' : 'Full Install Guide'} →
        </Link>
      </div>

      {/* Telemetry notice — community defense network */}
      <div className="px-5 py-3 border-t border-border bg-surface-2/20">
        <p className="text-[10px] text-text-muted leading-relaxed text-center">
          {isZh ? (
            <>
              你的掃描協助訓練社群防禦網路。僅匿名規則 ID 與攻擊類型,不含內容。停用:
              <code className="text-[10px] font-mono">scanner-no-telemetry</code> cookie。隱私:{' '}
              <Link href="/legal/privacy" className="underline hover:text-text-secondary">
                panguard.ai/privacy
              </Link>
            </>
          ) : (
            <>
              Your scan helped train the community defense network. Anonymized rule ID + attack type
              only, no content. Disable:{' '}
              <code className="text-[10px] font-mono">scanner-no-telemetry</code> cookie. Privacy:{' '}
              <Link href="/legal/privacy" className="underline hover:text-text-secondary">
                panguard.ai/privacy
              </Link>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
