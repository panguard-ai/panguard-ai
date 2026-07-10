import { redirect } from 'next/navigation';

/**
 * The $25K Founding-Customer Pilot funnel was retired with deck v11
 * (Community / Enterprise / Migrator Pro / Sovereign — no Pilot tier).
 * This route now redirects to pricing. The file (and ScopingForm) is
 * retained rather than deleted so the funnel can be restored if needed.
 */
export default async function ScopingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(locale === 'en' ? '/pricing' : `/${locale}/pricing`);
}
