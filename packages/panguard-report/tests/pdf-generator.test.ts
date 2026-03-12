/**
 * PDF Generator tests
 * PDF 產生器測試
 *
 * Note: PDFKit encodes text content as hex glyph IDs in content streams,
 * so we cannot simply search for plain text in the PDF binary. Instead,
 * we verify text via PDF metadata (Title/Author stored as plain strings)
 * and structural checks (file size, page count, validity).
 *
 * PDFKit 將文字內容編碼為十六進位字形 ID，因此我們無法直接在 PDF
 * 二進位中搜尋純文字。改為透過 PDF 元資料和結構檢查來驗證。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatePDFReport, registerCjkFont } from '../src/generator/pdf-generator.js';
import type { PDFReportOptions } from '../src/generator/pdf-generator.js';
import type { ComplianceFinding } from '../src/types.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const TEST_TMP_DIR = join(tmpdir(), `panguard-pdf-test-${Date.now()}`);
let fileCounter = 0;
const generatedFiles: string[] = [];

function getTmpPath(filename?: string): string {
  fileCounter += 1;
  const name = filename ?? `test-report-${fileCounter}.pdf`;
  const path = join(TEST_TMP_DIR, name);
  generatedFiles.push(path);
  return path;
}

/**
 * Convert a plain ASCII string to the hex representation PDFKit uses
 * in text content streams (e.g., "Hello" -> "48656c6c6f").
 * Only works for ASCII characters.
 */
function toHexEncoding(text: string): string {
  return Buffer.from(text, 'ascii').toString('hex');
}

/**
 * Extract all hex-encoded text from a PDF content string.
 * PDFKit renders text with TJ operators like: [<4c4f> 30 <57> 0] TJ
 * This function extracts all hex segments and concatenates them
 * so we can search for full text strings across kerning breaks.
 */
function extractHexText(pdfContent: string): string {
  const hexSegments: string[] = [];
  const hexPattern = /<([0-9a-f]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = hexPattern.exec(pdfContent)) !== null) {
    hexSegments.push(match[1]!);
  }
  return hexSegments.join('');
}

/**
 * Check if an ASCII text string appears in the PDF's hex-encoded text streams.
 * Handles kerning-split segments by concatenating all hex data first.
 */
function pdfContainsText(pdfContent: string, text: string): boolean {
  const allHex = extractHexText(pdfContent);
  const targetHex = toHexEncoding(text);
  return allHex.includes(targetHex);
}

/** Create test findings with various severities */
function createTestFindings(): ComplianceFinding[] {
  return [
    {
      findingId: 'F-001',
      severity: 'critical',
      title: 'SQL Injection Vulnerability',
      description:
        'User input is not properly sanitized in the login form, allowing SQL injection attacks.',
      category: 'authentication',
      timestamp: new Date('2025-01-15'),
      source: 'panguard-scan',
    },
    {
      findingId: 'F-002',
      severity: 'high',
      title: 'Missing Firewall Rules',
      description: 'No inbound traffic filtering configured on the application server.',
      category: 'network',
      timestamp: new Date('2025-01-15'),
      source: 'panguard-scan',
    },
    {
      findingId: 'F-003',
      severity: 'medium',
      title: 'Outdated TLS Configuration',
      description: 'TLS 1.0 and 1.1 are still enabled on the web server.',
      category: 'encryption',
      timestamp: new Date('2025-01-15'),
      source: 'panguard-scan',
    },
    {
      findingId: 'F-004',
      severity: 'low',
      title: 'Missing Security Headers',
      description: 'HTTP Strict Transport Security (HSTS) header is not configured.',
      category: 'http_header',
      timestamp: new Date('2025-01-15'),
      source: 'panguard-scan',
    },
    {
      findingId: 'F-005',
      severity: 'info',
      title: 'Server Version Disclosure',
      description: 'The web server exposes its version number in response headers.',
      category: 'information_disclosure',
      timestamp: new Date('2025-01-15'),
      source: 'panguard-scan',
    },
  ];
}

/** Build default PDF options for testing */
function defaultOptions(overrides?: Partial<PDFReportOptions>): PDFReportOptions {
  return {
    title: 'Test Compliance Report',
    framework: 'iso27001',
    lang: 'en',
    outputPath: getTmpPath(),
    findings: createTestFindings(),
    generatedAt: '2025-03-01',
    compress: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

mkdirSync(TEST_TMP_DIR, { recursive: true });

afterEach(() => {
  for (const file of generatedFiles) {
    try {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
  generatedFiles.length = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PDF Generator', () => {
  describe('generatePDFReport - file creation', () => {
    it('should create a file at the specified outputPath', async () => {
      const opts = defaultOptions();
      const result = await generatePDFReport(opts);

      expect(result).toBe(opts.outputPath);
      expect(existsSync(opts.outputPath)).toBe(true);
    });

    it('should create a non-zero size PDF file', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('should produce a valid PDF (starts with %PDF header)', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const buffer = readFileSync(opts.outputPath);
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should produce a valid PDF (ends with %%EOF)', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'ascii');
      expect(content.trimEnd()).toMatch(/%%EOF$/);
    });

    it('should create output directory if it does not exist', async () => {
      const nestedDir = join(TEST_TMP_DIR, `nested-${Date.now()}`, 'deep', 'dir');
      const nestedPath = join(nestedDir, 'report.pdf');
      generatedFiles.push(nestedPath);

      const opts = defaultOptions({ outputPath: nestedPath });
      await generatePDFReport(opts);

      expect(existsSync(nestedPath)).toBe(true);

      // Cleanup nested dirs (best effort)
      try {
        unlinkSync(nestedPath);
        rmdirSync(join(nestedDir));
        rmdirSync(join(nestedDir, '..'));
        rmdirSync(join(nestedDir, '..', '..'));
      } catch {
        // best effort
      }
    });
  });

  describe('generatePDFReport - PDF metadata', () => {
    it('should embed the report title in PDF metadata', async () => {
      const opts = defaultOptions({ title: 'ACME Security Assessment' });
      await generatePDFReport(opts);

      // PDFKit stores the Title in the Info dictionary as plain text
      const content = readFileSync(opts.outputPath, 'latin1');
      expect(content).toContain('ACME Security Assessment');
    });

    it('should embed Panguard AI as Author in PDF metadata', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(content).toContain('Panguard AI');
    });

    it('should embed PanguardReport as Creator in PDF metadata', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(content).toContain('PanguardReport PDF Generator');
    });
  });

  describe('generatePDFReport - content structure (hex-encoded text)', () => {
    it('should contain finding IDs in the PDF text streams', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'F-001')).toBe(true);
      expect(pdfContainsText(content, 'F-002')).toBe(true);
      expect(pdfContainsText(content, 'F-003')).toBe(true);
      expect(pdfContainsText(content, 'F-004')).toBe(true);
      expect(pdfContainsText(content, 'F-005')).toBe(true);
    });

    it('should contain severity labels (uppercase) in PDF text streams', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'CRITICAL')).toBe(true);
      expect(pdfContainsText(content, 'HIGH')).toBe(true);
      expect(pdfContainsText(content, 'MEDIUM')).toBe(true);
      expect(pdfContainsText(content, 'LOW')).toBe(true);
      expect(pdfContainsText(content, 'INFO')).toBe(true);
    });

    it('should contain "No findings detected" when findings are empty', async () => {
      const opts = defaultOptions({ findings: [] });
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'No findings detected')).toBe(true);
    });

    it('should contain the generation date in PDF text streams', async () => {
      const opts = defaultOptions({ generatedAt: '2025-03-01' });
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, '2025-03-01')).toBe(true);
    });

    it('should contain organization name when provided', async () => {
      const opts = defaultOptions({ organizationName: 'TestOrg' });
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'TestOrg')).toBe(true);
    });

    it('should contain Confidential watermark in PDF text streams', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'Confidential')).toBe(true);
    });

    it('should contain section labels for English', async () => {
      const opts = defaultOptions({ lang: 'en' });
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      expect(pdfContainsText(content, 'Executive Summary')).toBe(true);
      expect(pdfContainsText(content, 'Findings')).toBe(true);
    });
  });

  describe('empty and minimal findings', () => {
    it('should handle empty findings without crashing', async () => {
      const opts = defaultOptions({ findings: [] });
      const result = await generatePDFReport(opts);

      expect(existsSync(result)).toBe(true);
      const buffer = readFileSync(result);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle a single finding', async () => {
      const opts = defaultOptions({
        findings: [
          {
            findingId: 'SINGLE-001',
            severity: 'medium',
            title: 'Single Finding Test',
            description: 'This is the only finding.',
            category: 'encryption',
            timestamp: new Date('2025-01-15'),
            source: 'panguard-scan',
          },
        ],
      });
      const result = await generatePDFReport(opts);

      expect(existsSync(result)).toBe(true);
      const content = readFileSync(result, 'latin1');
      expect(pdfContainsText(content, 'SINGLE-001')).toBe(true);
    });

    it('should produce a larger PDF with more findings', async () => {
      const emptyOpts = defaultOptions({ findings: [] });
      const fullOpts = defaultOptions();

      await generatePDFReport(emptyOpts);
      await generatePDFReport(fullOpts);

      const emptySize = readFileSync(emptyOpts.outputPath).length;
      const fullSize = readFileSync(fullOpts.outputPath).length;

      // A report with 5 findings should be larger than one with none
      expect(fullSize).toBeGreaterThan(emptySize);
    });
  });

  describe('framework support', () => {
    it('should generate PDF for iso27001 framework', async () => {
      const opts = defaultOptions({ framework: 'iso27001' });
      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
      // Metadata contains the title which references the framework
      const content = readFileSync(opts.outputPath, 'latin1');
      expect(content).toContain('Test Compliance Report');
    });

    it('should generate PDF for tw_cyber_security_act framework', async () => {
      const opts = defaultOptions({ framework: 'tw_cyber_security_act' });
      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF for soc2 framework', async () => {
      const opts = defaultOptions({ framework: 'soc2' });
      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should produce different PDFs for different frameworks', async () => {
      const isoOpts = defaultOptions({ framework: 'iso27001' });
      const socOpts = defaultOptions({ framework: 'soc2' });

      await generatePDFReport(isoOpts);
      await generatePDFReport(socOpts);

      const isoBuffer = readFileSync(isoOpts.outputPath);
      const socBuffer = readFileSync(socOpts.outputPath);

      // Different frameworks have different controls, so PDFs should differ
      expect(isoBuffer.equals(socBuffer)).toBe(false);
    });
  });

  describe('bilingual support', () => {
    it('should produce different content for zh-TW vs en', async () => {
      const enPath = getTmpPath('report-en.pdf');
      const zhPath = getTmpPath('report-zh.pdf');

      await generatePDFReport(defaultOptions({ lang: 'en', outputPath: enPath }));
      await generatePDFReport(defaultOptions({ lang: 'zh-TW', outputPath: zhPath }));

      const enBuffer = readFileSync(enPath);
      const zhBuffer = readFileSync(zhPath);

      // Both should be valid PDFs
      expect(enBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(zhBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

      // Content should differ since language labels are different
      expect(enBuffer.equals(zhBuffer)).toBe(false);
    });

    it('should generate valid PDF for zh-TW language', async () => {
      const opts = defaultOptions({ lang: 'zh-TW' });
      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('CJK font detection', () => {
    it('should not crash when detecting CJK fonts on current platform', async () => {
      const PDFDocumentModule = await import('pdfkit');
      const PDFDoc = PDFDocumentModule.default;
      const doc = new PDFDoc({ autoFirstPage: true });

      // Should not throw -- returns boolean indicating success/failure
      const result = await registerCjkFont(doc as unknown as PDFKit.PDFDocument);
      expect(typeof result).toBe('boolean');

      // Clean up
      doc.end();
    });

    it('should generate valid PDF for zh-TW even if CJK fonts fail', async () => {
      const opts = defaultOptions({ lang: 'zh-TW' });
      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      const buffer = readFileSync(opts.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('pre-computed assessmentResult', () => {
    it('should use assessmentResult when provided', async () => {
      const { generateComplianceReport } = await import('../src/generator/report-generator.js');
      const assessmentResult = generateComplianceReport(createTestFindings(), 'iso27001', 'en', {
        organizationName: 'Precomputed Corp',
      });

      const opts = defaultOptions({
        title: 'Precomputed Corp Report',
        assessmentResult,
        organizationName: 'Precomputed Corp',
      });

      await generatePDFReport(opts);

      expect(existsSync(opts.outputPath)).toBe(true);
      // The title is stored in PDF metadata as plain text
      const content = readFileSync(opts.outputPath, 'latin1');
      expect(content).toContain('Precomputed Corp Report');
    });
  });

  describe('error handling', () => {
    it('should throw a meaningful error for invalid output path', async () => {
      const opts = defaultOptions({
        outputPath: '/dev/null/\0/impossible-path/report.pdf',
      });

      await expect(generatePDFReport(opts)).rejects.toThrow();
    });
  });

  describe('multi-page structure', () => {
    it('should generate a multi-page PDF (at least 4 pages)', async () => {
      const opts = defaultOptions();
      await generatePDFReport(opts);

      const content = readFileSync(opts.outputPath, 'latin1');
      // PDFKit creates Page objects: /Type /Page
      const pageMatches = content.match(/\/Type\s*\/Page\b/g);
      // We expect at least 4 pages: cover, exec summary, findings, compliance matrix
      // Note: /Type /Pages is the parent, /Type /Page is individual pages
      // Filter out /Type /Pages entries
      const pageCount = pageMatches ? pageMatches.filter((m) => !m.includes('/Pages')).length : 0;
      expect(pageCount).toBeGreaterThanOrEqual(4);
    });
  });
});
