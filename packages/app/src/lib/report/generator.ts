/**
 * Gov-grade deliverable PDF generator.
 *
 * Produces the findings-based assessment report a Partner/JV hands to a client:
 * cover (ATR logo + classification + parties), document control, confidentiality
 * notice, executive summary, scope + methodology, findings summary, per-finding
 * detail (CVSS / evidence / remediation / ATR rule), compliance traceability
 * matrix, attestation, and a SHA-256 (+ optional HMAC) integrity block. A
 * classification banner and "page X of Y" footer are stamped on every page.
 *
 * PDFKit is imported dynamically (the working pattern from report-generator.ts).
 * The ATR logo is a raster PNG — PDFKit cannot embed SVG.
 */

import { existsSync } from 'node:fs';
import { COLORS, LAYOUT, classificationColor } from './styles';
import { HELVETICA_FONTS, type Fonts, type RenderCtx } from './draw';
import { labelsFor } from './labels';
import { resolveAtrLogoPath } from './assets';
import {
  computeIntegrityHash,
  countBySeverity,
  defaultMethodology,
  signIntegrity,
  validateReportInput,
} from './logic';
import {
  renderAttestation,
  renderConfidentiality,
  renderCover,
  renderDetailedFindings,
  renderDocumentControl,
  renderExecutiveSummary,
  renderFindingsSummary,
  renderIntegrity,
  renderScopeMethodology,
  renderTraceability,
} from './sections';
import type { DeliverableReportInput, DeliverableReportResult } from './types';

const CJK_FONT_PATHS: Record<string, Array<{ path: string; family?: string }>> = {
  darwin: [
    { path: '/System/Library/Fonts/STHeiti Light.ttc', family: 'STHeitiTC-Light' },
    { path: '/System/Library/Fonts/PingFang.ttc', family: 'PingFangTC-Regular' },
  ],
  linux: [
    { path: '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', family: 'Noto Sans CJK TC' },
    { path: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', family: 'Noto Sans CJK TC' },
  ],
};

/**
 * Register a CJK font as family 'CJK'; returns true only if it actually opens.
 * A .ttc collection needs its member PostScript name (else fontkit yields a
 * collection object with no createSubset and the doc crashes mid-render), so
 * we pass `family` and then probe before committing — a mis-named or missing
 * candidate falls through to the Helvetica fallback instead of throwing.
 */
function registerCjkFont(doc: PDFKit.PDFDocument): boolean {
  for (const { path, family } of CJK_FONT_PATHS[process.platform] ?? []) {
    if (!existsSync(path)) continue;
    try {
      if (family) doc.registerFont('CJK', path, family);
      else doc.registerFont('CJK', path);
      // Force fontkit to open + subset; this is where a bad .ttc throws.
      doc.font('CJK').widthOfString('測');
      doc.font('Helvetica'); // reset current font for clean rendering
      return true;
    } catch {
      /* try next candidate */
    }
  }
  return false;
}

/** Stamp the classification banner (top) and footer on every buffered page. */
function stampPageFurniture(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { doc, labels } = ctx;
  const clsLabel = labels.classification[input.classification];
  const clsColor = classificationColor(input.classification);
  // Footer precedence: an explicit partner footer wins; otherwise compose one
  // from the partner's registered legal name (falling back to the assessor
  // display name) so a configured legalName takes real effect on every page.
  const footer =
    input.branding?.reportFooter ??
    `${input.branding?.legalName ?? input.assessor.name} · Agent Threat Rules (ATR)`;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Furniture lives in the top/bottom margin bands. Positioning text below
    // maxY (= pageHeight - margins.bottom) trips PDFKit's overflow-pagination
    // and spawns a blank page per footer line. Zero this page's margins for the
    // furniture pass so positioned text never paginates. This is the final pass
    // (doc.end() follows), so the mutated margins are never reused.
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;

    doc.rect(0, 0, LAYOUT.pageWidth, 18).fill(clsColor);
    doc.fillColor(COLORS.white).font(ctx.fonts.heading).fontSize(8).text(clsLabel, 0, 5, {
      width: LAYOUT.pageWidth,
      align: 'center',
      lineBreak: false,
    });

    const fy = LAYOUT.pageHeight - 28;
    doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(LAYOUT.margin, fy).lineTo(LAYOUT.pageWidth - LAYOUT.margin, fy).stroke();
    doc.font(ctx.fonts.body).fontSize(7).fillColor(COLORS.lightText);
    doc.text(footer, LAYOUT.margin, fy + 5, { width: LAYOUT.contentWidth * 0.5, align: 'left', lineBreak: false });
    doc.text(clsLabel, LAYOUT.margin, fy + 5, { width: LAYOUT.contentWidth, align: 'center', lineBreak: false });
    doc.text(labels.page(i - range.start + 1, range.count), LAYOUT.margin, fy + 5, {
      width: LAYOUT.contentWidth,
      align: 'right',
      lineBreak: false,
    });
  }
}

/** Render every content section in order. */
function renderBody(ctx: RenderCtx, input: DeliverableReportInput, integrity: { sha256: string; hmac: string | null }): void {
  const methodology =
    input.methodology && input.methodology.length > 0
      ? input.methodology
      : defaultMethodology(input.language);
  renderDocumentControl(ctx, input);
  renderConfidentiality(ctx);
  renderExecutiveSummary(ctx, input);
  renderScopeMethodology(ctx, input, methodology);
  renderFindingsSummary(ctx, input);
  renderDetailedFindings(ctx, input);
  renderTraceability(ctx, input);
  renderAttestation(ctx, input);
  renderIntegrity(ctx, integrity.sha256, integrity.hmac);
}

/**
 * Render a deliverable report to a PDF buffer with an integrity hash.
 * Throws on invalid input (fail fast with a clear message).
 */
export async function generateDeliverableReport(
  input: DeliverableReportInput
): Promise<DeliverableReportResult> {
  const errors = validateReportInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid report input: ${errors.join('; ')}`);
  }

  const sha256 = computeIntegrityHash(input);
  const signingKey = input.signingKey ?? process.env['PANGUARD_REPORT_SIGNING_KEY'];
  const hmac = signingKey ? signIntegrity(sha256, signingKey) : null;

  const mod = (await import('pdfkit')) as unknown as { default: typeof import('pdfkit') };
  const PDFDocument = mod.default;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: LAYOUT.margin, bottom: LAYOUT.margin, left: LAYOUT.margin, right: LAYOUT.margin },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${labelsFor(input.language).documentTitle} — ${input.client.name}`,
      Author: input.assessor.name,
      Subject: `${input.client.name} · ${input.primaryFramework}`,
      Keywords: `ATR, ${input.primaryFramework}, security assessment`,
      CreationDate: new Date(),
    },
  }) as unknown as PDFKit.PDFDocument;

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
    doc.on('error', (e: Error) => rejectPromise(e));
  });

  const cjkOk = input.language === 'zh-Hant' ? registerCjkFont(doc) : false;
  const fonts: Fonts = cjkOk
    ? { heading: 'CJK', body: 'CJK', oblique: 'CJK', mono: 'Courier' }
    : HELVETICA_FONTS;
  const ctx: RenderCtx = { doc, fonts, labels: labelsFor(input.language) };

  const logoPath = input.logoPath ?? resolveAtrLogoPath();
  renderCover(ctx, input, logoPath);
  doc.addPage();
  renderBody(ctx, input, { sha256, hmac });

  const pageCount = doc.bufferedPageRange().count;
  stampPageFurniture(ctx, input);

  doc.end();
  const buffer = await done;

  return {
    buffer,
    contentType: 'application/pdf',
    sha256,
    hmacSha256: hmac,
    findingCount: input.findings.length,
    severityCounts: countBySeverity(input.findings),
    pageCount,
  };
}
