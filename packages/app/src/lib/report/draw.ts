/**
 * Low-level PDFKit drawing primitives shared by the section renderers:
 * classification banner, page footer, section headings, paragraphs, bullet
 * lists, and simple tables. Each keeps to a single responsibility so the
 * section renderers in `sections.ts` read as document structure, not geometry.
 */

import { COLORS, FONTS, LAYOUT } from './styles';
import type { ReportLabels } from './labels';

/** Resolved font family names for the active language. */
export interface Fonts {
  heading: string;
  body: string;
  oblique: string;
  mono: string;
}

/** Everything a section renderer needs: the doc, fonts, and labels. */
export interface RenderCtx {
  doc: PDFKit.PDFDocument;
  fonts: Fonts;
  labels: ReportLabels;
}

/** Built-in Helvetica family (used for English / CJK-unavailable fallback). */
export const HELVETICA_FONTS: Fonts = {
  heading: FONTS.heading,
  body: FONTS.body,
  oblique: FONTS.oblique,
  mono: FONTS.mono,
};

const CONTENT_BOTTOM = LAYOUT.pageHeight - LAYOUT.margin - LAYOUT.footerHeight;

/** Add a page if `needed` points won't fit before the footer zone. */
export function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > CONTENT_BOTTOM) doc.addPage();
}

/** A section heading with an accent underline; breaks page if cramped. */
export function sectionHeading(ctx: RenderCtx, text: string): void {
  const { doc } = ctx;
  ensureSpace(doc, 48);
  doc.moveDown(0.5);
  doc.font(ctx.fonts.heading).fontSize(14).fillColor(COLORS.primary).text(text, LAYOUT.margin);
  const y = doc.y + 2;
  doc
    .strokeColor(COLORS.accent)
    .lineWidth(1.5)
    .moveTo(LAYOUT.margin, y)
    .lineTo(LAYOUT.margin + 60, y)
    .stroke();
  doc.moveDown(0.6);
}

/** A body paragraph wrapped to the content width. */
export function paragraph(ctx: RenderCtx, text: string, fontSize = 10): void {
  const { doc } = ctx;
  const h = doc.font(ctx.fonts.body).fontSize(fontSize).heightOfString(text, {
    width: LAYOUT.contentWidth,
  });
  ensureSpace(doc, h);
  doc.fillColor(COLORS.text).text(text, LAYOUT.margin, doc.y, { width: LAYOUT.contentWidth });
  doc.moveDown(0.4);
}

/** A bulleted list, one wrapped item per row. */
export function bulletList(ctx: RenderCtx, items: ReadonlyArray<string>, fontSize = 10): void {
  const { doc } = ctx;
  doc.font(ctx.fonts.body).fontSize(fontSize).fillColor(COLORS.text);
  for (const item of items) {
    const text = `•  ${item}`;
    const h = doc.heightOfString(text, { width: LAYOUT.contentWidth - 10 });
    ensureSpace(doc, h);
    doc.text(text, LAYOUT.margin + 4, doc.y, { width: LAYOUT.contentWidth - 10, paragraphGap: 2 });
  }
  doc.moveDown(0.4);
}

/** A two-column key/value row (used in the document-control block). */
export function keyValueRow(ctx: RenderCtx, key: string, value: string): void {
  const { doc } = ctx;
  const keyWidth = 150;
  const valueWidth = LAYOUT.contentWidth - keyWidth;
  const h = Math.max(
    doc.font(ctx.fonts.heading).fontSize(9).heightOfString(key, { width: keyWidth }),
    doc.font(ctx.fonts.body).fontSize(9).heightOfString(value, { width: valueWidth })
  );
  ensureSpace(doc, h + 4);
  const y = doc.y;
  doc.font(ctx.fonts.heading).fontSize(9).fillColor(COLORS.secondary).text(key, LAYOUT.margin, y, {
    width: keyWidth,
  });
  doc.font(ctx.fonts.body).fontSize(9).fillColor(COLORS.text).text(value, LAYOUT.margin + keyWidth, y, {
    width: valueWidth,
  });
  doc.y = y + h + 4;
}

/** A small filled severity/label badge; returns the x after the badge. */
export function badge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  text: string,
  fillColor: string,
  font: string
): number {
  const w = doc.font(font).fontSize(8).widthOfString(text) + 10;
  doc.roundedRect(x, y, w, 13, 2).fill(fillColor);
  doc.fillColor(COLORS.white).font(font).fontSize(8).text(text, x + 5, y + 3);
  return x + w;
}

/** Column spec for `table`: a header label and a fractional width (0..1). */
export interface Column {
  header: string;
  /** Fraction of contentWidth. The fractions should sum to ~1. */
  width: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Render a simple bordered table with a coloured header row and wrapping
 * cells. `rowColor` optionally tints the first cell's text per row (used to
 * colour severity). Repeats the header when the table spills to a new page.
 */
export function table(
  ctx: RenderCtx,
  columns: ReadonlyArray<Column>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  opts: { firstColColors?: ReadonlyArray<string> } = {}
): void {
  const { doc } = ctx;
  const colX: number[] = [];
  let acc = LAYOUT.margin;
  for (const c of columns) {
    colX.push(acc);
    acc += c.width * LAYOUT.contentWidth;
  }

  const drawHeader = (): void => {
    const y = doc.y;
    doc.rect(LAYOUT.margin, y, LAYOUT.contentWidth, 18).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font(ctx.fonts.heading).fontSize(9);
    columns.forEach((c, i) => {
      doc.text(c.header, colX[i]! + 4, y + 5, {
        width: c.width * LAYOUT.contentWidth - 8,
        align: c.align ?? 'left',
      });
    });
    doc.y = y + 18;
  };

  ensureSpace(doc, 40);
  drawHeader();

  rows.forEach((row, rowIdx) => {
    doc.font(ctx.fonts.body).fontSize(9);
    const cellH = Math.max(
      ...row.map((cell, i) =>
        doc.heightOfString(cell, { width: columns[i]!.width * LAYOUT.contentWidth - 8 })
      ),
      12
    );
    const rowH = cellH + 6;
    if (doc.y + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    if (rowIdx % 2 === 1) {
      doc.rect(LAYOUT.margin, y, LAYOUT.contentWidth, rowH).fill(COLORS.background);
    }
    row.forEach((cell, i) => {
      const isFirst = i === 0;
      const color = isFirst && opts.firstColColors ? opts.firstColColors[rowIdx] ?? COLORS.text : COLORS.text;
      doc
        .fillColor(color)
        .font(isFirst && opts.firstColColors ? ctx.fonts.heading : ctx.fonts.body)
        .fontSize(9)
        .text(cell, colX[i]! + 4, y + 3, {
          width: columns[i]!.width * LAYOUT.contentWidth - 8,
          align: columns[i]!.align ?? 'left',
        });
    });
    doc.y = y + rowH;
    doc
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(LAYOUT.margin, doc.y)
      .lineTo(LAYOUT.margin + LAYOUT.contentWidth, doc.y)
      .stroke();
  });
  doc.moveDown(0.5);
}
