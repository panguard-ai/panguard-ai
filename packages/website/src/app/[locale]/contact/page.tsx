import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import ContactContent from './ContactContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('contact.title'),
    description: t('contact.description'),
    alternates: buildAlternates('/contact', params.locale),
  };
}

export default function ContactPage() {
  return <ContactContent />;
}
