import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import BlogContent from './BlogContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('blog.title'),
    description: t('blog.description'),
    alternates: buildAlternates('/blog', params.locale),
  };
}

export default function BlogPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <BlogContent />
      </main>
      <Footer />
    </>
  );
}
