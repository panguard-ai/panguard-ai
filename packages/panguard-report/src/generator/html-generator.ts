/**
 * Compliance Report HTML Generator
 * 合規報告 HTML 產生器
 *
 * Brand-aligned customer-facing report (2026-05-19 rebrand): warm-black
 * dark theme on screen matching panguard.ai design system (Surface 0
 * #1A1614 + Sage #8B9A8E + Active Emerald #34D399 + Space Grotesk
 * headings + Inter body + JetBrains Mono for IDs and code spans).
 *
 * Print stylesheet (@media print) switches to a warm-light variant so
 * the artifact prints cleanly to PDF while keeping sage accents — same
 * pattern Linear / Vercel use for branded dashboards that also need
 * printable receipts.
 *
 * Bilingual labels for zh-TW vs en. Single self-contained file:
 * inline CSS, inline Google Font @import, inline shield SVG logo.
 * Auditors can open offline, email, or browser-print to PDF.
 *
 * @module @panguard-ai/panguard-report/generator/html-generator
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { ComplianceFinding, ComplianceReportData, ReportLanguage } from '../types.js';
import { getFrameworkName, getFrameworkControls } from '../frameworks/index.js';
import {
  evaluateControls,
  generateExecutiveSummary,
  generateStatistics,
  generateRecommendations,
} from '../mapper/index.js';
import { getSectionLabels, getSeverityLabel, getStatusLabel } from '../templates/index.js';
import type { ComplianceFramework } from '../types.js';

const logger = createLogger('panguard-report:html');

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

/**
 * Brand tokens — keep in lockstep with /Users/user/Downloads/panguard-ai/
 * packages/website/DESIGN.md and packages/app/tailwind.config.ts.
 */
const BRAND = {
  // Dark surfaces
  surface0: '#1A1614',
  surface1: '#1F1C19',
  surface2: '#272320',
  surface3: '#302B27',
  // Borders
  borderDefault: '#2E2A27',
  borderHover: '#3D3835',
  // Text
  textPrimary: '#F5F1E8',
  textSecondary: '#A09890',
  textMuted: '#9A9490',
  // Brand sage
  sage: '#8B9A8E',
  sageLight: '#A3B0A6',
  sageDark: '#6B7A6E',
  sageGlow: 'rgba(139, 154, 142, 0.15)',
  // Active emerald
  emerald: '#34D399',
  emeraldLight: '#6EE7B7',
  emeraldDark: '#059669',
  // Severity
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#34D399',
  info: '#9CA3AF',
  // Semantic
  redAlert: '#C75050',
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  critical: BRAND.critical,
  high: BRAND.high,
  medium: BRAND.medium,
  low: BRAND.low,
  info: BRAND.info,
};

const STATUS_COLOR: Record<string, string> = {
  pass: BRAND.emerald,
  fail: BRAND.redAlert,
  partial: BRAND.medium,
  not_applicable: BRAND.textMuted,
};

/** Inline shield logo (currentColor — fill via CSS) */
const SHIELD_SVG = `<svg viewBox="385 323 1278 1403" xmlns="http://www.w3.org/2000/svg" aria-label="PanGuard shield">
  <path fill="currentColor" d="M 1021.5 830.423 C 1026.54 829.911 1045.81 832.659 1051.64 833.401 C 1072.38 835.99 1093.1 838.746 1113.8 841.667 L 1329.99 871.428 L 1329.95 1306.51 L 1330 1422.21 C 1330.01 1450.54 1332.08 1491.81 1325.18 1518.04 C 1318.79 1541.46 1305.62 1562.47 1287.31 1578.42 C 1269.98 1593.59 1234.62 1610.78 1212.96 1622.97 C 1151.4 1657.6 1087.44 1689.5 1026.42 1725.08 L 1024.58 1725.72 C 1020.72 1724.57 1005.67 1715.74 1001.44 1713.38 C 986.676 1705.08 971.857 1696.88 956.982 1688.79 L 836.342 1623.07 C 818.678 1613.37 800.537 1603.48 783.285 1593.93 C 741.183 1570.62 718.225 1528.6 718.162 1480.8 C 718.14 1463.85 718.093 1446.28 718.119 1429.07 L 718.13 1313.33 L 718.15 871.408 C 819.171 858.462 920.068 841.835 1021.5 830.423 z"/>
  <path fill="currentColor" d="M 687.515 577.4 C 696.504 576.451 715.718 579.584 725.68 580.913 L 782.266 588.553 C 853.62 598.25 926.853 607.634 997.939 618.387 L 997.872 779.654 C 966.188 784.487 928.734 789.954 897.039 793.352 L 897.073 705.399 C 831.524 696.853 760.432 685.286 694.176 678.356 C 683.151 677.203 646.195 683.753 632.643 685.485 L 487.112 705.406 C 488.77 841.757 487.098 980.17 487.357 1116.69 L 487.339 1188.98 C 487.213 1243.94 479.328 1246.69 530.666 1273.69 C 574.625 1298.03 623.372 1322.43 666.093 1347.35 C 665.454 1385.26 666.06 1424.82 666.087 1462.87 C 649.609 1452.6 628.321 1441.62 610.88 1432.12 L 500.871 1372.76 C 476.603 1359.56 440.159 1342.09 421.535 1323.57 C 404.11 1306.02 392.433 1283.59 388.055 1259.25 C 384.254 1237.81 385.323 1203.28 385.354 1180.66 L 385.478 1064.48 L 385.312 618.209 C 414.868 615.376 445.833 609.518 475.437 605.863 C 545.54 597.208 617.46 584.737 687.515 577.4 z"/>
  <path fill="currentColor" d="M 1348.89 577.369 C 1360.73 575.936 1415.83 584.528 1431.77 586.589 C 1508.75 596.536 1585.62 608.685 1662.67 618.335 L 1662.73 1028.87 L 1662.69 1154.09 C 1662.67 1223.3 1674.33 1293.75 1609.64 1337.92 C 1596.01 1347.22 1581.75 1354.57 1567.33 1362.44 L 1512.89 1391.87 L 1382 1462.6 C 1383.76 1427.96 1382.35 1382.83 1382.21 1347.24 C 1420 1324.81 1467.93 1301.58 1507.58 1279.5 C 1524.53 1270.36 1558.74 1256.3 1560.1 1235.39 C 1561.42 1215.18 1560.95 1193.69 1560.9 1173.32 L 1560.87 1066.29 L 1560.68 705.345 C 1543.39 703.65 1521.51 700.068 1504.1 697.576 C 1473.23 693.054 1442.33 688.801 1411.39 684.819 C 1399.03 683.204 1369.09 678.563 1357.99 678.482 C 1343.65 678.377 1310.02 683.839 1294.14 685.904 C 1246.36 692.092 1198.63 698.627 1150.95 705.51 C 1151.37 734.567 1151.1 764.255 1151.14 793.361 C 1118.48 789.558 1083.43 784.206 1050.79 779.597 L 1050.69 617.847 L 1348.89 577.369 z"/>
  <path fill="currentColor" d="M 1017.32 323.354 C 1027.15 321.591 1105.66 333.344 1122.51 335.603 C 1166.74 341.267 1210.92 347.328 1255.05 353.786 C 1279.68 357.183 1305.51 360.23 1329.92 364.192 L 1329.98 526.684 C 1296.55 530.372 1261.73 535.721 1228.25 540.29 C 1228.4 510.591 1228.39 480.892 1228.23 451.193 C 1219.27 449.729 1209.61 448.427 1200.57 447.329 C 1144.13 440.467 1086.78 429.864 1030.24 424.572 C 1018.71 422.967 967.642 430.978 952.027 433.125 L 819.579 450.968 C 820.252 479.945 819.726 511.22 819.879 540.382 C 785.991 535.397 752.051 530.778 718.064 526.526 L 717.99 364.358 C 745.543 359.872 774.642 356.332 802.417 352.399 L 1017.32 323.354 z"/>
</svg>`;

function escapeHtml(s: string | undefined | null): string {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHTML(opts: HTMLReportOptions): string {
  const labels = getSectionLabels(opts.lang);
  const isZh = opts.lang === 'zh-TW';
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
  void stats;

  const sevCounts = opts.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const findingRows = opts.findings
    .map((f) => {
      const sevColor = SEVERITY_COLOR[f.severity] ?? BRAND.textPrimary;
      return `
        <tr>
          <td class="mono">${escapeHtml(f.findingId)}</td>
          <td><span class="badge" style="background:${sevColor}1A;color:${sevColor};border-color:${sevColor}4D">${escapeHtml(
            getSeverityLabel(f.severity, opts.lang)
          )}</span></td>
          <td class="cell-title">${escapeHtml(f.title)}</td>
          <td class="cell-cat">${escapeHtml(f.category)}</td>
          <td class="muted">${escapeHtml(f.description ?? '')}</td>
        </tr>`;
    })
    .join('');

  const controlRows = evaluated
    .map((c) => {
      const statusColor = STATUS_COLOR[c.status] ?? BRAND.textPrimary;
      const controlTitle = isZh ? c.titleZh : c.titleEn;
      const evidenceText = Array.isArray(c.evidence) ? c.evidence.join('; ') : (c.evidence ?? '');
      return `
        <tr>
          <td class="mono">${escapeHtml(c.controlId)}</td>
          <td class="cell-title">${escapeHtml(controlTitle)}</td>
          <td><span class="badge" style="background:${statusColor}1A;color:${statusColor};border-color:${statusColor}4D">${escapeHtml(
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
          <div class="rec-head"><span class="rec-num">${String(i + 1).padStart(2, '0')}</span> <strong>${escapeHtml(r.title)}</strong></div>
          <div class="rec-body">${escapeHtml(r.description)}</div>
          <div class="rec-meta">
            ${labels.priority}: <strong>${escapeHtml(r.priority)}</strong>
            <span class="dot">·</span>
            ${labels.estimatedEffort}: ${escapeHtml(r.estimatedEffort ?? '—')}
          </div>
        </li>`
    )
    .join('');

  const generatedDate = opts.generatedAt ?? new Date().toISOString().split('T')[0];

  const totalControlsLabel = t('Total Controls', '總控制項');
  const generatedLabel = t('Generated', '產生時間');
  const noFindingsText = t('No findings recorded.', '本期未記錄任何發現。');
  const confidentialText = t(
    'Confidential — Panguard AI Compliance Report',
    '機密 — Panguard AI 合規報告'
  );
  const findingIdLabel = t('Finding ID', '發現編號');
  const titleColLabel = t('Title', '標題');
  const descColLabel = t('Description', '描述');
  const controlIdLabel = t('Control ID', '控制項編號');
  const controlTitleLabel = t('Control', '控制項');
  const overlineText = t('AI Agent Compliance Report', 'AI Agent 合規報告');

  const lang = isZh ? 'zh-TW' : 'en';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --surface-0: ${BRAND.surface0};
    --surface-1: ${BRAND.surface1};
    --surface-2: ${BRAND.surface2};
    --surface-3: ${BRAND.surface3};
    --border: ${BRAND.borderDefault};
    --border-hover: ${BRAND.borderHover};
    --text-primary: ${BRAND.textPrimary};
    --text-secondary: ${BRAND.textSecondary};
    --text-muted: ${BRAND.textMuted};
    --sage: ${BRAND.sage};
    --sage-light: ${BRAND.sageLight};
    --emerald: ${BRAND.emerald};
    --emerald-light: ${BRAND.emeraldLight};
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--surface-0);
    color: var(--text-primary);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  :lang(zh-TW), :lang(zh) {
    font-family: 'Inter', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  }
  .page {
    max-width: 1024px;
    margin: 0 auto;
    padding: 48px 56px 64px;
  }
  /* Header */
  header.cover {
    margin-bottom: 48px;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }
  .brand-shield {
    color: var(--sage);
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
  .brand-shield svg { width: 100%; height: 100%; display: block; }
  .brand-name {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-primary);
  }
  .overline {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--sage);
    margin-bottom: 12px;
  }
  h1.title {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 0 0 8px 0;
    color: var(--text-primary);
  }
  .sub {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 32px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }
  .meta-cell {
    background: var(--surface-1);
    padding: 16px 20px;
  }
  .meta-cell dt {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .meta-cell dd {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
  }
  .meta-cell dd.mono {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 13px;
  }
  .meta-cell dd.score {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--emerald);
  }
  /* Sections */
  section { margin: 48px 0; }
  section h2 {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  section h2 .count {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 14px;
    margin-left: 6px;
  }
  section .lead {
    font-size: 15px;
    line-height: 1.65;
    color: var(--text-secondary);
    margin: 20px 0;
  }
  .key-risks {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 16px;
  }
  .key-risks strong { color: var(--sage); }
  /* Stat grid */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }
  .stat {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    transition: border-color 200ms;
  }
  .stat:hover { border-color: var(--sage); }
  .stat .n {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    color: var(--text-primary);
  }
  .stat .l {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-top: 8px;
  }
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  thead {
    background: var(--surface-2);
  }
  th {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    font-size: 13px;
    color: var(--text-primary);
  }
  tbody tr:last-child td { border-bottom: none; }
  td.mono, .mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-secondary);
  }
  td.muted, .muted {
    color: var(--text-muted);
    font-size: 12px;
  }
  td.cell-title { font-weight: 500; }
  td.cell-cat { color: var(--text-secondary); }
  /* Badge */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 9999px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid;
  }
  /* Recommendations */
  ul.recs { list-style: none; padding: 0; margin: 16px 0 0; }
  ul.recs li {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-left: 3px solid var(--sage);
    border-radius: 0 12px 12px 0;
    padding: 20px 24px;
    margin-bottom: 12px;
    transition: border-left-color 200ms;
  }
  ul.recs li:hover { border-left-color: var(--emerald); }
  .rec-head {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .rec-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .rec-head strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .rec-body {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 10px;
    line-height: 1.6;
  }
  .rec-meta {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .rec-meta strong { color: var(--sage); }
  .dot { margin: 0 4px; color: var(--border); }
  /* Footer */
  footer.confidential {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    letter-spacing: 0.05em;
  }
  /* Print stylesheet — warm-light variant preserving sage accent */
  @media print {
    :root {
      --surface-0: #FAF8F2;
      --surface-1: #FFFFFF;
      --surface-2: #F5F1E8;
      --surface-3: #EFE9DC;
      --border: #E5DFD0;
      --border-hover: #D1C9B5;
      --text-primary: #1A1614;
      --text-secondary: #4A4540;
      --text-muted: #8A847A;
    }
    body { background: white; color: var(--text-primary); }
    .page { padding: 24px 32px; max-width: none; }
    section { page-break-inside: avoid; margin: 28px 0; }
    header.cover { page-break-after: avoid; margin-bottom: 28px; }
    .stat { background: var(--surface-2); }
    ul.recs li { background: var(--surface-2); page-break-inside: avoid; }
    table { border: 1px solid var(--border); }
    thead { background: var(--surface-2); }
    a { color: var(--sage); text-decoration: underline; }
  }
</style>
</head>
<body>
<div class="page">

<header class="cover">
  <div class="brand-row">
    <span class="brand-shield">${SHIELD_SVG}</span>
    <span class="brand-name">PanGuard AI</span>
  </div>
  <p class="overline">${overlineText}</p>
  <h1 class="title">${escapeHtml(opts.title)}</h1>
  <p class="sub">${escapeHtml(frameworkName)}${
    opts.organizationName ? ` &middot; ${escapeHtml(opts.organizationName)}` : ''
  }</p>
  <dl class="meta-grid">
    <div class="meta-cell">
      <dt>${labels.reportId}</dt>
      <dd class="mono">${escapeHtml(assessment.metadata.reportId)}</dd>
    </div>
    <div class="meta-cell">
      <dt>${generatedLabel}</dt>
      <dd>${escapeHtml(generatedDate)}</dd>
    </div>
    <div class="meta-cell">
      <dt>${t('Framework', '框架')}</dt>
      <dd>${escapeHtml(frameworkName)}</dd>
    </div>
    <div class="meta-cell">
      <dt>${labels.overallScore}</dt>
      <dd class="score">${exec.overallScore}%</dd>
    </div>
  </dl>
</header>

<section>
  <h2>${labels.executiveSummary}</h2>
  <p class="lead">${escapeHtml(
    t(
      `Overall compliance score: ${exec.overallScore}%. ${exec.controlsPassed} of ${exec.totalControls} controls passed, ${exec.controlsFailed} failed, ${exec.controlsPartial} partial. ${exec.totalFindings} findings recorded (${exec.criticalFindings} critical, ${exec.highFindings} high).`,
      `整體合規分數：${exec.overallScore}%。${exec.totalControls} 項控制項中 ${exec.controlsPassed} 項通過、${exec.controlsFailed} 項未通過、${exec.controlsPartial} 項部分符合。共 ${exec.totalFindings} 項發現（${exec.criticalFindings} 嚴重、${exec.highFindings} 高風險）。`
    )
  )}</p>
  ${
    exec.keyRisks.length > 0
      ? `<p class="key-risks"><strong>${t('Key risks', '主要風險')}:</strong> ${exec.keyRisks
          .map((r) => escapeHtml(r))
          .join(' &middot; ')}</p>`
      : ''
  }
  <div class="stat-grid">
    <div class="stat"><div class="n">${exec.totalControls}</div><div class="l">${totalControlsLabel}</div></div>
    <div class="stat"><div class="n" style="color:${BRAND.emerald}">${exec.controlsPassed}</div><div class="l">${labels.controlsPassed}</div></div>
    <div class="stat"><div class="n" style="color:${BRAND.redAlert}">${exec.controlsFailed}</div><div class="l">${labels.controlsFailed}</div></div>
    <div class="stat"><div class="n" style="color:${BRAND.medium}">${exec.controlsPartial}</div><div class="l">${labels.controlsPartial}</div></div>
  </div>
</section>

<section>
  <h2>${labels.findings}<span class="count">${opts.findings.length}</span></h2>
  <div class="stat-grid">
    ${(['critical', 'high', 'medium', 'low'] as const)
      .map(
        (s) =>
          `<div class="stat"><div class="n" style="color:${SEVERITY_COLOR[s]}">${
            sevCounts[s] ?? 0
          }</div><div class="l">${escapeHtml(getSeverityLabel(s, opts.lang))}</div></div>`
      )
      .join('')}
  </div>
  ${
    opts.findings.length === 0
      ? `<p class="muted" style="margin-top:24px">${noFindingsText}</p>`
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
  <h2>${labels.controlDetails}<span class="count">${evaluated.length}</span></h2>
  <table>
    <thead><tr>
      <th>${controlIdLabel}</th>
      <th>${controlTitleLabel}</th>
      <th>${labels.status}</th>
      <th>#</th>
      <th>${labels.evidence}</th>
    </tr></thead>
    <tbody>${controlRows}</tbody>
  </table>
</section>

${
  recs.length > 0
    ? `<section>
        <h2>${labels.recommendations}<span class="count">${recs.length}</span></h2>
        <ul class="recs">${recRows}</ul>
      </section>`
    : ''
}

<footer class="confidential">
  ${confidentialText} &middot; ${escapeHtml(assessment.metadata.reportId)} &middot; ${escapeHtml(generatedDate)}
</footer>

</div>
</body>
</html>`;
}

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
