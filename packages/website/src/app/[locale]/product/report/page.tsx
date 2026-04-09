import { redirect } from 'next/navigation';

/**
 * Report is a built-in feature of Panguard Scan (panguard report CLI command).
 * Redirect to the scan product page instead of maintaining a separate page.
 */
export default function ProductReportPage() {
  redirect('/product/scan');
}
