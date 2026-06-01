/**
 * High-level section renderers for the deliverable. Each function renders one
 * logical section of the document using the primitives in `draw.ts`. Section
 * order and orchestration live in `generator.ts`.
 */

import { COLORS, LAYOUT, classificationColor, severityColor } from './styles';
import {
  badge,
  bulletList,
  ensureSpace,
  keyValueRow,
  paragraph,
  sectionHeading,
  table,
  type RenderCtx,
} from './draw';
import {
  buildTraceabilityRows,
  countBySeverity,
  cvssRatingLabel,
  frameworkDisplayName,
  overallRiskRating,
  sortFindingsBySeverity,
} from './logic';
import type { DeliverableFinding, DeliverableReportInput } from './types';

/** Cover page: ATR logo, title, classification, and the key parties. */
export function renderCover(
  ctx: RenderCtx,
  input: DeliverableReportInput,
  logoPath: string | null
): void {
  const { doc, labels } = ctx;
  const centerOpts = { width: LAYOUT.contentWidth, align: 'center' as const };
  let y = 140;

  if (logoPath) {
    try {
      const w = 170;
      doc.image(logoPath, (LAYOUT.pageWidth - w) / 2, y, { width: w });
      y += 70;
    } catch {
      y = drawWordmark(ctx, y);
    }
  } else {
    y = drawWordmark(ctx, y);
  }

  const clsLabel = labels.classification[input.classification];
  const clsColor = classificationColor(input.classification);
  const clsW = doc.font(ctx.fonts.heading).fontSize(10).widthOfString(clsLabel) + 16;
  doc.roundedRect((LAYOUT.pageWidth - clsW) / 2, y, clsW, 18, 3).fill(clsColor);
  doc.fillColor(COLORS.white).font(ctx.fonts.heading).fontSize(10).text(clsLabel, 0, y + 5, {
    width: LAYOUT.pageWidth,
    align: 'center',
  });
  y += 50;

  doc.font(ctx.fonts.heading).fontSize(24).fillColor(COLORS.primary).text(labels.documentTitle, LAYOUT.margin, y, centerOpts);
  y = doc.y + 6;
  doc.font(ctx.fonts.body).fontSize(11).fillColor(COLORS.lightText).text(labels.subtitle, LAYOUT.margin, y, centerOpts);
  y = doc.y + 30;

  const meta: ReadonlyArray<[string, string]> = [
    [labels.cover.client, input.client.name],
    [labels.cover.assessor, input.assessor.name],
    [labels.cover.framework, frameworkDisplayName(input.primaryFramework)],
    [labels.cover.date, input.reportDate],
    [labels.cover.reportId, input.reportId],
    [labels.cover.version, input.version],
  ];
  // Fixed row stride (independent of doc.y): with lineBreak:false + continued,
  // PDFKit's cursor advancement is unreliable and differs between Latin and CJK
  // line heights, which made rows overlap. A constant stride keeps every locale
  // evenly spaced.
  const rowH = 18;
  for (const [k, v] of meta) {
    // Center the "label: value" pair as a unit. PDFKit's align:'center' with
    // continued:true centers each segment independently (they overlap), so we
    // measure both parts and position the pair manually.
    const label = `${k}:  `;
    const lw = doc.font(ctx.fonts.heading).fontSize(10).widthOfString(label);
    const vw = doc.font(ctx.fonts.body).fontSize(10).widthOfString(v);
    const startX = Math.max(LAYOUT.margin, (LAYOUT.pageWidth - (lw + vw)) / 2);
    doc.font(ctx.fonts.heading).fontSize(10).fillColor(COLORS.secondary).text(label, startX, y, {
      lineBreak: false,
      continued: true,
    });
    doc.font(ctx.fonts.body).fontSize(10).fillColor(COLORS.text).text(v, { lineBreak: false });
    y += rowH;
  }
}

function drawWordmark(ctx: RenderCtx, y: number): number {
  ctx.doc
    .font(ctx.fonts.heading)
    .fontSize(28)
    .fillColor(COLORS.primary)
    .text('ATR', LAYOUT.margin, y, { width: LAYOUT.contentWidth, align: 'center' });
  ctx.doc
    .font(ctx.fonts.body)
    .fontSize(10)
    .fillColor(COLORS.lightText)
    .text('Agent Threat Rules', LAYOUT.margin, ctx.doc.y, {
      width: LAYOUT.contentWidth,
      align: 'center',
    });
  return ctx.doc.y + 30;
}

/** Document-control key/value block. */
export function renderDocumentControl(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { labels } = ctx;
  sectionHeading(ctx, labels.sections.documentControl);
  keyValueRow(ctx, labels.cover.reportId, input.reportId);
  keyValueRow(ctx, labels.cover.version, input.version);
  keyValueRow(ctx, labels.cover.date, input.reportDate);
  keyValueRow(ctx, labels.cover.classification, labels.classification[input.classification]);
  keyValueRow(ctx, labels.cover.client, partyText(input.client));
  keyValueRow(ctx, labels.cover.assessor, partyText(input.assessor));
  keyValueRow(ctx, labels.preparedBy, input.preparedBy);
  if (input.reviewedBy) keyValueRow(ctx, labels.reviewedBy, input.reviewedBy);
  keyValueRow(ctx, labels.cover.framework, frameworkDisplayName(input.primaryFramework));
}

function partyText(p: { name: string; detail?: string }): string {
  return p.detail ? `${p.name} — ${p.detail}` : p.name;
}

/** Confidentiality notice paragraph. */
export function renderConfidentiality(ctx: RenderCtx): void {
  sectionHeading(ctx, ctx.labels.sections.confidentiality);
  paragraph(ctx, ctx.labels.confidentialityNotice);
}

/** Executive summary: overall rating + severity distribution + narrative. */
export function renderExecutiveSummary(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { doc, labels } = ctx;
  sectionHeading(ctx, labels.sections.executiveSummary);

  const counts = countBySeverity(input.findings);
  const rating = overallRiskRating(counts);
  ensureSpace(doc, 24);
  doc.font(ctx.fonts.heading).fontSize(11).fillColor(COLORS.secondary).text(`${labels.overallRiskLine}: `, LAYOUT.margin, doc.y, {
    continued: true,
  });
  const ratingColor = rating === 'none' ? COLORS.low : severityColor(rating);
  doc.fillColor(ratingColor).text(labels.riskRating[rating]);
  doc.moveDown(0.6);

  if (input.findings.length === 0) {
    paragraph(ctx, labels.noFindings);
    return;
  }

  const order: ReadonlyArray<keyof typeof counts> = ['critical', 'high', 'medium', 'low', 'info'];
  const rows = order.map((s) => [labels.severity[s], String(counts[s])]);
  const colors = order.map((s) => severityColor(s));
  table(
    ctx,
    [
      { header: labels.table.severity, width: 0.6 },
      { header: labels.table.count, width: 0.4, align: 'right' },
    ],
    rows,
    { firstColColors: colors }
  );
}

/** Scope bullets and methodology bullets. */
export function renderScopeMethodology(
  ctx: RenderCtx,
  input: DeliverableReportInput,
  methodology: ReadonlyArray<string>
): void {
  sectionHeading(ctx, ctx.labels.sections.scope);
  bulletList(ctx, input.scope.length > 0 ? input.scope : ['—']);
  sectionHeading(ctx, ctx.labels.sections.methodology);
  bulletList(ctx, methodology);
}

/** Findings summary table (id, title, severity, CVSS, asset). */
export function renderFindingsSummary(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { labels } = ctx;
  sectionHeading(ctx, labels.sections.findingsSummary);
  if (input.findings.length === 0) {
    paragraph(ctx, labels.noFindings);
    return;
  }
  const sorted = sortFindingsBySeverity(input.findings);
  const rows = sorted.map((f) => [
    labels.severity[f.severity],
    f.id,
    f.title,
    typeof f.cvss === 'number' ? f.cvss.toFixed(1) : '—',
    f.affectedAsset ?? '—',
  ]);
  const colors = sorted.map((f) => severityColor(f.severity));
  table(
    ctx,
    [
      { header: labels.table.severity, width: 0.16 },
      { header: labels.table.id, width: 0.16 },
      { header: labels.table.finding, width: 0.4 },
      { header: labels.table.cvss, width: 0.1, align: 'right' },
      { header: labels.table.asset, width: 0.18 },
    ],
    rows,
    { firstColColors: colors }
  );
}

/** Per-finding detail blocks. */
export function renderDetailedFindings(ctx: RenderCtx, input: DeliverableReportInput): void {
  sectionHeading(ctx, ctx.labels.sections.detailedFindings);
  if (input.findings.length === 0) {
    paragraph(ctx, ctx.labels.noFindings);
    return;
  }
  for (const f of sortFindingsBySeverity(input.findings)) renderFinding(ctx, f);
}

function renderFinding(ctx: RenderCtx, f: DeliverableFinding): void {
  const { doc, labels } = ctx;
  ensureSpace(doc, 90);
  const y = doc.y;
  badge(doc, LAYOUT.margin, y + 1, labels.severity[f.severity], severityColor(f.severity), ctx.fonts.heading);
  doc.font(ctx.fonts.heading).fontSize(11).fillColor(COLORS.primary).text(`  ${f.id}  ${f.title}`, LAYOUT.margin + 70, y, {
    width: LAYOUT.contentWidth - 70,
  });
  doc.moveDown(0.3);

  const metaBits: string[] = [];
  if (typeof f.cvss === 'number') {
    const band = cvssRatingLabel(f.cvss);
    metaBits.push(`${labels.table.cvss} ${f.cvss.toFixed(1)}${band && band !== 'none' ? ` (${labels.severity[band]})` : ''}`);
  }
  if (f.cvssVector) metaBits.push(f.cvssVector);
  if (f.affectedAsset) metaBits.push(`${labels.table.asset}: ${f.affectedAsset}`);
  if (f.atrRuleId) metaBits.push(`${labels.table.atrRule}: ${f.atrRuleId}`);
  if (metaBits.length > 0) {
    doc.font(ctx.fonts.oblique).fontSize(8).fillColor(COLORS.lightText).text(metaBits.join('   ·   '), LAYOUT.margin, doc.y, {
      width: LAYOUT.contentWidth,
    });
    doc.moveDown(0.3);
  }

  labelledBlock(ctx, labels.table.description, f.description);
  if (f.evidence) labelledBlock(ctx, labels.table.evidence, f.evidence, ctx.fonts.mono);
  labelledBlock(ctx, labels.table.remediation, f.remediation);
  if (f.controls && f.controls.length > 0) {
    const lines = f.controls.map(
      (c) => `${frameworkDisplayName(c.framework)} ${c.identifier}${c.context ? ` — ${c.context}` : ''}`
    );
    labelledBlock(ctx, labels.table.control, lines.join('\n'));
  }
  doc.moveDown(0.4);
}

function labelledBlock(ctx: RenderCtx, label: string, value: string, valueFont?: string): void {
  const { doc } = ctx;
  const text = value || '—';
  const font = valueFont ?? ctx.fonts.body;
  const h =
    doc.font(ctx.fonts.heading).fontSize(9).heightOfString(label) +
    doc.font(font).fontSize(9).heightOfString(text, { width: LAYOUT.contentWidth - 8 });
  ensureSpace(doc, h + 6);
  doc.font(ctx.fonts.heading).fontSize(9).fillColor(COLORS.secondary).text(label, LAYOUT.margin, doc.y);
  doc.font(font).fontSize(9).fillColor(COLORS.text).text(text, LAYOUT.margin + 8, doc.y, {
    width: LAYOUT.contentWidth - 8,
  });
  doc.moveDown(0.25);
}

/** Finding -> control traceability matrix. */
export function renderTraceability(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { labels } = ctx;
  sectionHeading(ctx, labels.sections.traceability);
  const rows = buildTraceabilityRows(input.findings);
  if (rows.length === 0) {
    paragraph(ctx, '—');
    return;
  }
  const tableRows = rows.map((r) => [
    r.findingId,
    r.atrRuleId ?? '—',
    frameworkDisplayName(r.framework),
    r.controlIdentifier,
    r.context || '—',
  ]);
  table(ctx, [
    { header: labels.table.id, width: 0.12 },
    { header: labels.table.atrRule, width: 0.2 },
    { header: labels.table.framework, width: 0.2 },
    { header: labels.table.control, width: 0.16 },
    { header: labels.table.context, width: 0.32 },
  ], tableRows);
}

/** Attestation statement + sign-off lines. */
export function renderAttestation(ctx: RenderCtx, input: DeliverableReportInput): void {
  const { doc, labels } = ctx;
  sectionHeading(ctx, labels.sections.attestation);
  paragraph(ctx, labels.attestationStatement);
  doc.moveDown(1.2);
  ensureSpace(doc, 60);
  const colW = LAYOUT.contentWidth / 2 - 10;
  const y = doc.y;
  signLine(ctx, LAYOUT.margin, y, colW, labels.preparedBy, input.preparedBy);
  if (input.reviewedBy) signLine(ctx, LAYOUT.margin + colW + 20, y, colW, labels.reviewedBy, input.reviewedBy);
  doc.y = y + 50;
}

function signLine(ctx: RenderCtx, x: number, y: number, w: number, role: string, name: string): void {
  const { doc } = ctx;
  doc.strokeColor(COLORS.secondary).lineWidth(0.5).moveTo(x, y + 30).lineTo(x + w, y + 30).stroke();
  doc.font(ctx.fonts.heading).fontSize(9).fillColor(COLORS.text).text(name, x, y + 34, { width: w });
  doc.font(ctx.fonts.oblique).fontSize(8).fillColor(COLORS.lightText).text(role, x, doc.y, { width: w });
}

/** Report-integrity block: SHA-256 + optional HMAC + verification note. */
export function renderIntegrity(
  ctx: RenderCtx,
  sha256: string,
  hmac: string | null
): void {
  const { doc, labels } = ctx;
  sectionHeading(ctx, labels.sections.integrity);
  doc.font(ctx.fonts.heading).fontSize(9).fillColor(COLORS.secondary).text('SHA-256', LAYOUT.margin, doc.y);
  doc.font(ctx.fonts.mono).fontSize(8).fillColor(COLORS.text).text(sha256, LAYOUT.margin + 8, doc.y, {
    width: LAYOUT.contentWidth - 8,
  });
  if (hmac) {
    doc.moveDown(0.2);
    doc.font(ctx.fonts.heading).fontSize(9).fillColor(COLORS.secondary).text('HMAC-SHA256', LAYOUT.margin, doc.y);
    doc.font(ctx.fonts.mono).fontSize(8).fillColor(COLORS.text).text(hmac, LAYOUT.margin + 8, doc.y, {
      width: LAYOUT.contentWidth - 8,
    });
  }
  doc.moveDown(0.4);
  paragraph(ctx, labels.integrityNote, 8);
}
