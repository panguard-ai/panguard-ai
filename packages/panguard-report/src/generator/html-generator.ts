/**
 * Compliance Report HTML Generator
 * 合規報告 HTML 產生器
 *
 * Generates a single-file, print-friendly HTML compliance report. Inline
 * CSS, no external assets — auditors can open offline, email the file,
 * or browser-print to PDF if they prefer that path over our PDF generator.
 *
 * Mirrors pdf-generator.ts layout: cover, executive summary, statistics,
 * findings table, control matrix, recommendations, confidential footer.
 *
 * Fixes Bug 3 from 2026-05-16 W1 validation: CLI accepted --format html
 * but `else` branch silently dropped the request (printed summary text to
 * stdout, no file written, success message lied). This generator + CLI
 * wiring makes --format html produce a real file.
 *
 * @module @panguard-ai/panguard-report/generator/html-generator
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type {
  ComplianceFinding,
  ComplianceReportData,
  ReportLanguage,
} from '../types.js';
import { getFrameworkName, getFrameworkControls } from '../frameworks/index.js';
import {
  evaluateControls,
  generateExecutiveSummary,
  generateStatistics,
  generateRecommendations,
} from '../mapper/index.js';
import type { ComplianceFramework } from '../types.js';
import {
  getSectionLabels,
  getSeverityLabel,
  getStatusLabel,
} from '../templates/index.js';

const logger = createLogger('panguard-report:html');

/** Options for HTML report generation / HTML 報告產生選項 */
export interface HTMLReportOptions {
  title: string;
  framework: string;
  lang: ReportLanguage;
  outputPath: string;
  findings: ComplianceFinding[];
  assessmentResult?: ComplianceReportData;
  generatedAt?: string;
  organizationName?: string;
}

const COLORS = {
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  critical: '#c53030',
  high: '#c05621',
  medium: '#b7791f',
  low: '#2b6cb0',
  info: '#718096',
  pass: '#276749',
  fail: '#c53030',
  partial: '#b7791f',
  background: '#f7fafc',
  text: '#2d3748',
  lightText: '#718096',
  border: '#e2e8f0',
} as const;

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.critical,
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
  info: COLORS.info,
};

const STATUS_COLORS: Record<string, string> = {
  pass: COLORS.pass,
  fail: COLORS.fail,
  partial: COLORS.partial,
  not_applicable: COLORS.lightText,
};

/** Escape HTML entities to prevent injection through finding text. */
function escapeHtml(s: string | undefined | null): string {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the HTML document for a compliance report.
 * Single-file output, no external assets. Print stylesheet baked in.
 */
function renderHTML(opts: HTMLReportOptions): string {
  const labels = getSectionLabels(opts.lang);
  const isZh = opts.lang === 'zh-TW';
  // Inline bilingual fallbacks for labels not in ReportSectionLabels.
  // Keep terse — auditor reads English by default, Mandarin for TW gov.
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const framework = opts.framework as ComplianceFramework;
  const frameworkName = getFrameworkName(framework, opts.lang);
  const assessment =
    opts.assessmentResult ??
    ({
      findings: opts.findings,
      metadata: {
        reportId: '—',
        generatedAt: new Date(),
        framework: opts.framework,
        language: opts.lang,
      },
    } as ComplianceReportData);

  const controls = getFrameworkControls(framework);
  const evaluated = evaluateControls(controls, opts.findings);
  const exec = generateExecutiveSummary(evaluated, opts.findings, opts.lang);
  const stats = generateStatistics(evaluated, opts.findings);
  const recs = generateRecommendations(evaluated, opts.lang);
  // Suppress unused-var warning while we keep stats around for future drift charts.
  void stats;

  const sevCounts = opts.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const lang = opts.lang === 'zh-TW' ? 'zh-TW' : 'en';

  const findingRows = opts.findings
    .map((f) => {
      const sevColor = SEVERITY_COLORS[f.severity] ?? COLORS.text;
      return `
        <tr>
          <td class="mono">${escapeHtml(f.findingId)}</td>
          <td><span class="badge" style="background:${sevColor}">${escapeHtml(
            getSeverityLabel(f.severity, opts.lang)
          )}</span></td>
          <td>${escapeHtml(f.title)}</td>
          <td>${escapeHtml(f.category)}</td>
          <td class="muted">${escapeHtml(f.description ?? '')}</td>
        </tr>`;
    })
    .join('');

  const findingIdLabel = t('Finding ID', '發現編號');
  const titleColLabel = t('Title', '標題');
  const descColLabel = t('Description', '描述');
  const controlIdLabel = t('Control ID', '控制項編號');
  const controlTitleLabel = t('Control', '控制項');
  const findingsCountLabel = t('#', '#');
  const generatedLabel = t('Generated', '產生時間');
  const totalControlsLabel = t('Total Controls', '總控制項');
  const controlMatrixHeading = labels.controlDetails;
  const noFindingsText = t('No findings recorded.', '本期未記錄任何發現。');
  const confidentialText = t(
    'Confidential — Panguard AI Compliance Report',
    '機密 — Panguard AI 合規報告'
  );

  const controlRows = evaluated
    .map((c) => {
      const statusColor = STATUS_COLORS[c.status] ?? COLORS.text;
      const controlTitle = isZh ? c.titleZh : c.titleEn;
      const evidenceText = Array.isArray(c.evidence)
        ? c.evidence.join('; ')
        : (c.evidence ?? '');
      return `
        <tr>
          <td class="mono">${escapeHtml(c.controlId)}</td>
          <td>${escapeHtml(controlTitle)}</td>
          <td><span class="badge" style="background:${statusColor}">${escapeHtml(
            getStatusLabel(c.status, opts.lang)
          )}</span></td>
          <td>${c.relatedFindings.length}</td>
          <td class="muted">${escapeHtml(evidenceText)}</td>
        </tr>`;
    })
    .join('');

  const recRows = recs
    .map(
      (r, i) => `
        <li>
          <strong>${i + 1}. ${escapeHtml(r.title)}</strong>
          <div class="muted">${escapeHtml(r.description)}</div>
          <div class="meta">
            ${labels.priority}: <strong>${escapeHtml(r.priority)}</strong> ·
            ${labels.estimatedEffort}: ${escapeHtml(r.estimatedEffort ?? '—')}
          </div>
        </li>`
    )
    .join('');

  const generatedDate =
    opts.generatedAt ?? new Date().toISOString().split('T')[0];

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<style>
  :root {
    --primary: ${COLORS.primary};
    --text: ${COLORS.text};
    --muted: ${COLORS.lightText};
    --border: ${COLORS.border};
    --bg: ${COLORS.background};
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', 'PingFang TC', Roboto, Helvetica, sans-serif;
    margin: 0; padding: 0;
    color: var(--text);
    background: white;
    line-height: 1.5;
  }
  .page { max-width: 980px; margin: 0 auto; padding: 32px 40px; }
  header.cover {
    border-bottom: 4px solid var(--primary);
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  header.cover h1 { font-size: 28px; margin: 0 0 8px 0; color: var(--primary); }
  header.cover .sub { color: var(--muted); font-size: 14px; }
  .meta-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
    margin-top: 16px;
    padding: 16px;
    background: var(--bg);
    border-radius: 8px;
  }
  .meta-grid dt { font-size: 11px; text-transform: uppercase; color: var(--muted); }
  .meta-grid dd { margin: 0 0 8px 0; font-weight: 600; }
  section { margin-bottom: 32px; }
  section h2 {
    font-size: 18px;
    color: var(--primary);
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { background: var(--bg); font-size: 11px; text-transform: uppercase; color: var(--muted); }
  .mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; }
  .muted { color: var(--muted); font-size: 12px; }
  .meta { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
  }
  .stat-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin: 16px 0;
  }
  .stat {
    background: var(--bg);
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }
  .stat .n { font-size: 24px; font-weight: 700; color: var(--primary); }
  .stat .l { font-size: 11px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
  ul.recs { list-style: none; padding: 0; margin: 0; }
  ul.recs li {
    padding: 16px;
    border-left: 3px solid var(--primary);
    background: var(--bg);
    margin-bottom: 12px;
    border-radius: 0 4px 4px 0;
  }
  footer.confidential {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--muted);
    text-align: center;
  }
  @media print {
    body { background: white; }
    .page { padding: 20px; max-width: none; }
    section { page-break-inside: avoid; }
    header.cover { page-break-after: avoid; }
  }
</style>
</head>
<body>
<div class="page">

<header class="cover">
  <h1>${escapeHtml(opts.title)}</h1>
  <div class="sub">${escapeHtml(frameworkName)}${
    opts.organizationName ? ` · ${escapeHtml(opts.organizationName)}` : ''
  }</div>
  <dl class="meta-grid">
    <div>
      <dt>${labels.reportId}</dt>
      <dd class="mono">${escapeHtml(assessment.metadata.reportId)}</dd>
    </div>
    <div>
      <dt>${generatedLabel}</dt>
      <dd>${escapeHtml(generatedDate)}</dd>
    </div>
    <div>
      <dt>${t('Framework', '框架')}</dt>
      <dd>${escapeHtml(frameworkName)}</dd>
    </div>
    <div>
      <dt>${labels.overallScore}</dt>
      <dd>${exec.overallScore}%</dd>
    </div>
  </dl>
</header>

<section>
  <h2>${labels.executiveSummary}</h2>
  <p>${escapeHtml(
    t(
      `Overall compliance score: ${exec.overallScore}%. ${exec.controlsPassed} of ${exec.totalControls} controls passed; ${exec.controlsFailed} failed; ${exec.controlsPartial} partial. ${exec.totalFindings} findings (${exec.criticalFindings} critical, ${exec.highFindings} high).`,
      `整體合規分數：${exec.overallScore}%。${exec.totalControls} 項控制項中 ${exec.controlsPassed} 項通過、${exec.controlsFailed} 項未通過、${exec.controlsPartial} 項部分符合。共 ${exec.totalFindings} 項發現（${exec.criticalFindings} 嚴重、${exec.highFindings} 高風險）。`
    )
  )}</p>
  ${
    exec.keyRisks.length > 0
      ? `<p class="muted"><strong>${t('Key risks', '主要風險')}:</strong> ${exec.keyRisks
          .map((r) => escapeHtml(r))
          .join(' · ')}</p>`
      : ''
  }
  <div class="stat-grid">
    <div class="stat"><div class="n">${exec.totalControls}</div><div class="l">${totalControlsLabel}</div></div>
    <div class="stat"><div class="n" style="color:${COLORS.pass}">${exec.controlsPassed}</div><div class="l">${labels.controlsPassed}</div></div>
    <div class="stat"><div class="n" style="color:${COLORS.fail}">${exec.controlsFailed}</div><div class="l">${labels.controlsFailed}</div></div>
    <div class="stat"><div class="n" style="color:${COLORS.partial}">${exec.controlsPartial}</div><div class="l">${labels.controlsPartial}</div></div>
  </div>
</section>

<section>
  <h2>${labels.findings} (${opts.findings.length})</h2>
  <div class="stat-grid">
    ${(['critical', 'high', 'medium', 'low'] as const)
      .map(
        (s) =>
          `<div class="stat"><div class="n" style="color:${SEVERITY_COLORS[s]}">${
            sevCounts[s] ?? 0
          }</div><div class="l">${escapeHtml(getSeverityLabel(s, opts.lang))}</div></div>`
      )
      .join('')}
  </div>
  ${
    opts.findings.length === 0
      ? `<p class="muted">${noFindingsText}</p>`
      : `<table>
          <thead><tr>
            <th>${findingIdLabel}</th>
            <th>${labels.severity}</th>
            <th>${titleColLabel}</th>
            <th>${labels.category}</th>
            <th>${descColLabel}</th>
          </tr></thead>
          <tbody>${findingRows}</tbody>
        </table>`
  }
</section>

<section>
  <h2>${controlMatrixHeading} (${evaluated.length})</h2>
  <table>
    <thead><tr>
      <th>${controlIdLabel}</th>
      <th>${controlTitleLabel}</th>
      <th>${labels.status}</th>
      <th>${findingsCountLabel}</th>
      <th>${labels.evidence}</th>
    </tr></thead>
    <tbody>${controlRows}</tbody>
  </table>
</section>

${
  recs.length > 0
    ? `<section>
        <h2>${labels.recommendations} (${recs.length})</h2>
        <ul class="recs">${recRows}</ul>
      </section>`
    : ''
}

<footer class="confidential">
  ${confidentialText} · ${escapeHtml(assessment.metadata.reportId)} · ${escapeHtml(generatedDate)}
</footer>

</div>
</body>
</html>`;
}

/**
 * Generate a compliance report as a single HTML file.
 * Returns the absolute path written.
 */
export async function generateHTMLReport(opts: HTMLReportOptions): Promise<string> {
  logger.info('Starting HTML compliance report generation', {
    outputPath: opts.outputPath,
    lang: opts.lang,
    framework: opts.framework,
  });

  await mkdir(dirname(opts.outputPath), { recursive: true });
  const html = renderHTML(opts);
  await writeFile(opts.outputPath, html, 'utf-8');

  logger.info('HTML compliance report written', {
    outputPath: opts.outputPath,
    sizeBytes: html.length,
  });

  return opts.outputPath;
}
