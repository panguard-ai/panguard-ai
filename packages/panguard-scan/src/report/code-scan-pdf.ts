/**
 * Code Scan PDF Generator (slim, brand-aligned)
 * 程式碼掃描 PDF 產生器（精簡、品牌一致）
 *
 * Targets the `panguard-scan code` subcommand. Brand-aligned (2026-05-19):
 * Sage `#8B9A8E` headings, warm-near-black `#1A1614` titles, severity
 * palette per panguard.ai DESIGN.md. pdfkit base-14 Helvetica fallback
 * for now (custom-font embed is Phase 1B work); brand colour discipline
 * carries the artifact even without Space Grotesk on PDF.
 *
 * Fixes Bug 2 from 2026-05-16 W1 validation + Day-5 rebrand.
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

export interface CodeScanPdfOptions {
  outputPath: string;
  scanDir: string;
  findings: ReadonlyArray<Finding>;
  lang: Language;
  scannedAt?: string;
}

/** PanGuard brand tokens — sync with packages/website/DESIGN.md */
const BRAND = {
  sage: '#8B9A8E',
  sageDark: '#6B7A6E',
  emerald: '#34D399',
  emeraldDark: '#059669',
  warmBlack: '#1A1614',
  warmBrown: '#2E2A27',
  textPrimary: '#1A1614',
  textSecondary: '#4A4540',
  textMuted: '#8A847A',
  surfaceWarm: '#FAF8F2',
  surfaceCard: '#F5F1E8',
  border: '#E5DFD0',
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#34D399',
  info: '#9CA3AF',
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  critical: BRAND.critical,
  high: BRAND.high,
  medium: BRAND.medium,
  low: BRAND.low,
  info: BRAND.info,
};

function t(en: string, zh: string, lang: Language): string {
  return lang === 'zh-TW' ? zh : en;
}

/**
 * Generate a brand-aligned code-scan PDF.
 * Writes to outputPath; resolves on stream finish.
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
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: {
      Title: t('PanGuard AI - Code Security Report', 'PanGuard AI - 程式碼安全報告', lang),
      Author: 'PanGuard AI',
      Producer: 'pdfkit',
      Creator: 'PanGuard AI',
    },
  });

  const stream = createWriteStream(opts.outputPath);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;

  // ─── Cover band ───
  // Top sage band — brand presence without overwhelming
  const bandHeight = 4;
  doc.rect(0, 0, pageWidth, bandHeight).fill(BRAND.sage);

  // Brand wordmark
  doc.moveDown(2);
  doc.fillColor(BRAND.sage).font('Helvetica-Bold').fontSize(11);
  doc.text('PANGUARD AI', { characterSpacing: 1.5 });

  doc.moveDown(0.4);
  // Overline
  doc
    .fillColor(BRAND.sage)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(t('CODE SECURITY REPORT', '程式碼安全報告', lang).toUpperCase(), {
      characterSpacing: 1.2,
    });

  // Title
  doc.moveDown(0.5);
  doc
    .fillColor(BRAND.textPrimary)
    .font('Helvetica-Bold')
    .fontSize(26)
    .text(t('Source Code Security Scan', '原始碼安全掃描', lang));

  // Subtitle
  doc
    .moveDown(0.3)
    .fillColor(BRAND.textSecondary)
    .font('Helvetica')
    .fontSize(11)
    .text(t('PanGuard SAST · panguard-scan code', 'PanGuard SAST · panguard-scan code', lang));

  // ─── Meta block (4 rows) ───
  doc.moveDown(1.5);
  const metaItems: Array<[string, string]> = [
    [t('Scanned directory', '掃描目錄', lang), opts.scanDir],
    [t('Scanned at', '掃描時間', lang), scannedAt],
    [t('Findings count', '發現項目', lang), String(opts.findings.length)],
    [
      t('Status', '狀態', lang),
      opts.findings.length === 0
        ? t('CLEAN — No findings', 'CLEAN — 無發現', lang)
        : t(
            `${opts.findings.length} finding(s) require review`,
            `${opts.findings.length} 項待審查`,
            lang
          ),
    ],
  ];
  const metaY = doc.y;
  const colWidth = contentWidth / 2;
  for (let i = 0; i < metaItems.length; i++) {
    const [k, v] = metaItems[i]!;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colWidth;
    const y = metaY + row * 36;
    doc
      .fillColor(BRAND.textMuted)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(k.toUpperCase(), x, y, { width: colWidth - 8, characterSpacing: 1.1 });
    doc
      .fillColor(BRAND.textPrimary)
      .font('Helvetica')
      .fontSize(11)
      .text(v, x, y + 11, { width: colWidth - 8, height: 22, ellipsis: true });
  }
  doc.y = metaY + 36 * 2 + 8;

  // ─── Severity bar (sage→emerald) ───
  doc.moveDown(1);
  const counts = opts.findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const tags: Array<[string, string, string]> = [
    [t('Critical', '嚴重', lang), String(counts['critical'] ?? 0), BRAND.critical],
    [t('High', '高', lang), String(counts['high'] ?? 0), BRAND.high],
    [t('Medium', '中', lang), String(counts['medium'] ?? 0), BRAND.medium],
    [t('Low', '低', lang), String(counts['low'] ?? 0), BRAND.low],
  ];
  const tagY = doc.y;
  const tagWidth = (contentWidth - 24) / 4;
  for (let i = 0; i < tags.length; i++) {
    const [label, count, color] = tags[i]!;
    const x = margin + i * (tagWidth + 8);
    doc.roundedRect(x, tagY, tagWidth, 56, 8).fillAndStroke(BRAND.surfaceCard, BRAND.border);
    doc
      .fillColor(color)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(count, x, tagY + 8, { width: tagWidth, align: 'center' });
    doc
      .fillColor(BRAND.textMuted)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(label.toUpperCase(), x, tagY + 36, {
        width: tagWidth,
        align: 'center',
        characterSpacing: 1.1,
      });
  }
  doc.y = tagY + 56 + 24;

  // ─── Body ───
  if (opts.findings.length === 0) {
    // Clean scan emphasis
    doc
      .fillColor(BRAND.emerald)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(t('Clean Scan — No Findings', '掃描完成 — 無發現', lang));
    doc.moveDown(0.4);
    doc
      .fillColor(BRAND.textSecondary)
      .font('Helvetica')
      .fontSize(11)
      .text(
        t(
          'The static analyzer found no security vulnerabilities in the scanned source tree. This artifact serves as evidence of a clean scan as of the timestamp above.',
          '靜態分析器在掃描的原始碼樹中未發現安全漏洞。本文件作為上述時間戳的乾淨掃描證據。',
          lang
        ),
        { width: contentWidth }
      );
  } else {
    // Findings section header
    doc
      .fillColor(BRAND.textPrimary)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(t('Findings', '發現項目', lang));
    doc
      .moveTo(margin, doc.y + 4)
      .lineTo(margin + contentWidth, doc.y + 4)
      .strokeColor(BRAND.border)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);

    for (let i = 0; i < opts.findings.length; i++) {
      const f = opts.findings[i]!;
      const sevColor = SEVERITY_COLOR[f.severity] ?? BRAND.textPrimary;

      if (doc.y > doc.page.height - 200) doc.addPage();

      // Severity tag + ID inline
      doc
        .fillColor(sevColor)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`[${f.severity.toUpperCase()}]`, { continued: true, characterSpacing: 0.8 });
      doc.fillColor(BRAND.textMuted).font('Courier').fontSize(9).text(`  ${f.id}`);

      // Title
      doc
        .fillColor(BRAND.textPrimary)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(f.title, { width: contentWidth });

      doc
        .fillColor(BRAND.textMuted)
        .font('Helvetica')
        .fontSize(9)
        .text(`${t('Category', '分類', lang)}: ${f.category}`);

      if (f.description) {
        doc.moveDown(0.2);
        doc
          .fillColor(BRAND.textSecondary)
          .font('Helvetica')
          .fontSize(10)
          .text(f.description, { width: contentWidth });
      }

      if (f.details) {
        doc.moveDown(0.2);
        doc
          .fillColor(BRAND.textMuted)
          .font('Courier')
          .fontSize(8)
          .text(f.details, { width: contentWidth });
      }

      if (f.remediation) {
        doc.moveDown(0.2);
        doc
          .fillColor(BRAND.sage)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`▸ ${t('Remediation', '修復', lang)}: `, { continued: true });
        doc
          .fillColor(BRAND.textPrimary)
          .font('Helvetica')
          .fontSize(10)
          .text(f.remediation, { width: contentWidth });
      }

      doc.moveDown(1.2);
    }
  }

  // ─── Footer ───
  doc.moveDown(3);
  const footerY = doc.y;
  doc
    .moveTo(margin, footerY)
    .lineTo(margin + contentWidth, footerY)
    .strokeColor(BRAND.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
  doc
    .fillColor(BRAND.textMuted)
    .font('Helvetica')
    .fontSize(8)
    .text(
      t(
        'Confidential — PanGuard AI Code Security Report. Generated automatically by panguard-scan.',
        '機密 — PanGuard AI 程式碼安全報告。由 panguard-scan 自動產生。',
        lang
      ),
      { align: 'center', width: contentWidth, characterSpacing: 0.3 }
    );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  logger.info('Code-scan PDF written', { outputPath: opts.outputPath });
}
