import { getTranslations } from 'next-intl/server';
import DashboardContent from './DashboardContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('dashboard.title'),
    description: t('dashboard.description'),
    robots: 'noindex',
  };
}

export default function DashboardPage() {
  return <DashboardContent />;
}
