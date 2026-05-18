/**
 * Code Scan PDF Generator (slim variant)
 * 程式碼掃描 PDF 產生器（精簡版）
 *
 * Targets the `panguard-scan code` subcommand. Renders a focused PDF that
 * only contains source-code findings — no host discovery, no compliance
 * matrix, no remediation matrix. The full `generatePdfReport` is built
 * around the host-scan ScanResult shape (with discovery, network ports,
 * security tooling, etc.) which has no analogue in pure SAST output.
 *
 * Fixes Bug 2 from 2026-05-16 W1 validation: the `code` subcommand
 * accepted `--output <path>` but silently dropped it; no PDF was written
 * even on findings. Customers paying for "clean scan PDF artifact" got
 * stdout text and an empty filesystem.
 *
 * @module @panguard-ai/panguard-scan/report/code-scan-pdf
 */

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { Language } from '@panguard-ai/core';
import type { Finding } from '../scanners/types.js';

const logger = createLogger('panguard-scan:code-pdf');

/** Options for code-scan PDF generation. */
export interface CodeScanPdfOptions {
  outputPath: string;
  scanDir: string;
  findings: ReadonlyArray<Finding>;
  lang: Language;
  scannedAt?: string;
}

const COLORS = {
  primary: '#1a365d',
  text: '#2d3748',
  muted: '#718096',
  border: '#e2e8f0',
  bg: '#f7fafc',
  critical: '#c53030',
  high: '#c05621',
  medium: '#b7791f',
  low: '#2b6cb0',
  info: '#718096',
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  critical: COLORS.critical,
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
  info: COLORS.info,
};

function t(en: string, zh: string, lang: Language): string {
  return lang === 'zh-TW' ? zh : en;
}

/**
 * Generate a focused code-scan PDF. Writes to outputPath and resolves
 * when the underlying stream finishes (the close event), so the caller
 * can safely log "saved" + exit.
 */
export async function generateCodeScanPdf(opts: CodeScanPdfOptions): Promise<void> {
  await mkdir(dirname(opts.outputPath), { recursive: true });
  const scannedAt = opts.scannedAt ?? new Date().toISOString();
  const lang = opts.lang;

  logger.info('Starting code-scan PDF generation', {
    outputPath: opts.outputPath,
    findings: opts.findings.length,
    lang,
  });

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 54, bottom: 54, left: 54, right: 54 },
    info: {
      Title: t('Panguard AI Code Security Report', 'Panguard AI 程式碼安全報告', lang),
      Author: 'Panguard AI',
      Producer: 'pdfkit',
      Creator: 'Panguard AI',
    },
  });

  const stream = createWriteStream(opts.outputPath);
  doc.pipe(stream);

  // Title
  doc
    .fillColor(COLORS.primary)
    .fontSize(22)
    .text(t('Code Security Scan Report', '程式碼安全掃描報告', lang));
  doc
    .moveDown(0.3)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(`Panguard AI · panguard-scan code`);

  doc.moveDown(1).fontSize(11).fillColor(COLORS.text);
  doc.text(`${t('Scanned directory', '掃描目錄', lang)}: ${opts.scanDir}`);
  doc.text(`${t('Scanned at', '掃描時間', lang)}: ${scannedAt}`);
  doc.text(`${t('Findings', '發現', lang)}: ${opts.findings.length}`);

  // Severity summary
  const counts = opts.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const sevLine = (['critical', 'high', 'medium', 'low'] as const)
    .map((s) => `${s}=${counts[s] ?? 0}`)
    .join('  ');
  doc.text(`${t('Severity', '嚴重度', lang)}: ${sevLine}`);

  doc.moveDown(1);

  // Body
  if (opts.findings.length === 0) {
    doc
      .fontSize(13)
      .fillColor(COLORS.primary)
      .text(t('Clean Scan — No Findings', '掃描完成 — 無發現', lang));
    doc
      .moveDown(0.5)
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text(
        t(
          'The static analyzer found no security vulnerabilities in the scanned source tree. This artifact serves as evidence of a clean scan as of the timestamp above.',
          '靜態分析器在掃描的原始碼樹中未發現安全漏洞。本文件為上述時間戳的乾淨掃描證據。',
          lang
        )
      );
  } else {
    doc.fontSize(13).fillColor(COLORS.primary).text(t('Findings', '發現項目', lang));
    doc.moveDown(0.5);

    for (let i = 0; i < opts.findings.length; i++) {
      const f = opts.findings[i]!;
      const sevColor = SEVERITY_COLOR[f.severity] ?? COLORS.text;

      // Page break if near bottom
      if (doc.y > doc.page.height - 200) doc.addPage();

      doc.fontSize(10).fillColor(sevColor).text(`[${f.severity.toUpperCase()}] ${f.id}`, {
        continued: false,
      });
      doc.fontSize(12).fillColor(COLORS.text).text(f.title);
      doc.fontSize(10).fillColor(COLORS.muted).text(`${t('Category', '分類', lang)}: ${f.category}`);
      if (f.description) {
        doc.fontSize(10).fillColor(COLORS.text).text(f.description, { width: 480 });
      }
      if (f.details) {
        doc
          .fontSize(9)
          .fillColor(COLORS.muted)
          .font('Courier')
          .text(f.details, { width: 480 });
        doc.font('Helvetica');
      }
      if (f.remediation) {
        doc
          .fontSize(10)
          .fillColor(COLORS.primary)
          .text(`${t('Remediation', '修復', lang)}: ${f.remediation}`, { width: 480 });
      }
      doc.moveDown(1);
    }
  }

  // Footer note
  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      t(
        'Confidential — Panguard AI Code Security Report. Generated automatically by panguard-scan.',
        '機密 — Panguard AI 程式碼安全報告。由 panguard-scan 自動產生。',
        lang
      )
    );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  logger.info('Code-scan PDF written', { outputPath: opts.outputPath });
}
