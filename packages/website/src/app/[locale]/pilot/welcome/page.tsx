import { redirect } from 'next/navigation';

/**
 * Stripe Pilot checkout-success landing. The $25K Pilot was retired with
 * deck v11, so no live checkout reaches this route anymore. It now redirects
 * to pricing. File retained (not deleted) so it can be restored if the Pilot
 * flow is ever revived.
 */
export default async function PilotWelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(locale === 'en' ? '/pricing' : `/${locale}/pricing`);
}
