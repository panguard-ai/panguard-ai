'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Share2, AlertTriangle } from 'lucide-react';
import type { ScanReport, ScanResponse } from '@/hooks/useSkillScan';

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
                Cached
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
              {check.label}
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
            {expanded ? 'Hide findings' : `Show ${report.findings.length} finding(s)`}
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
                      <p className="text-xs font-semibold">{f.title}</p>
                      <span className="text-[10px] uppercase font-bold shrink-0">{f.severity}</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">{f.description}</p>
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
    </motion.div>
  );
}
