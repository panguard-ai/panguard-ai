/**
 * PDF report styling constants and helpers
 * PDF 報告樣式常數與輔助函式
 *
 * Defines colors, fonts, and layout dimensions used throughout
 * the PDF report generation process.
 * 定義在整個 PDF 報告產生過程中使用的顏色、字型和版面尺寸。
 *
 * @module @openclaw/panguard-scan/report/styles
 */

/**
 * Color palette for the PDF report
 * PDF 報告的色彩配置
 */
export const COLORS = {
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  critical: '#c53030',
  high: '#c05621',
  medium: '#b7791f',
  low: '#276749',
  info: '#2b6cb0',
  background: '#f7fafc',
  white: '#ffffff',
  text: '#2d3748',
  lightText: '#718096',
  border: '#e2e8f0',
} as const;

/**
 * Font families used in the PDF report
 * PDF 報告使用的字型家族
 */
export const FONTS = {
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  mono: 'Courier',
} as const;

/**
 * Page layout dimensions (A4 format)
 * 頁面版面尺寸（A4 格式）
 */
export const LAYOUT = {
  /** A4 width in points / A4 寬度（點） */
  pageWidth: 595.28,
  /** A4 height in points / A4 高度（點） */
  pageHeight: 841.89,
  /** Page margin in points / 頁面邊距（點） */
  margin: 50,
  /** Content area width (pageWidth - 2 * margin) / 內容區域寬度 */
  contentWidth: 495.28,
  /** Header height in points / 頁首高度（點） */
  headerHeight: 30,
  /** Footer height in points / 頁尾高度（點） */
  footerHeight: 20,
} as const;

/**
 * Return the color associated with a given severity level
 * 根據給定的嚴重等級回傳對應的顏色
 *
 * @param severity - Severity level string / 嚴重等級字串
 * @returns Hex color string / 十六進位顏色字串
 */
export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return COLORS.critical;
    case 'high':
      return COLORS.high;
    case 'medium':
      return COLORS.medium;
    case 'low':
      return COLORS.low;
    case 'info':
      return COLORS.info;
    default:
      return COLORS.lightText;
  }
}
