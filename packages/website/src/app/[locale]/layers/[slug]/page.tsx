import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getLayerBySlug, LAYERS } from '@/lib/layers';
import LayerDetailContent from './LayerDetailContent';

export async function generateStaticParams() {
  // Pre-render one page per layer slug × 2 locales
  return LAYERS.flatMap((l) => [
    { locale: 'en', slug: l.slug },
    { locale: 'zh-TW', slug: l.slug },
  ]);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;
  const layer = getLayerBySlug(params.slug);
  if (!layer) return { title: 'Layer not found' };
  const name = params.locale === 'zh-TW' ? layer.name.zh : layer.name.en;
  const tagline = params.locale === 'zh-TW' ? layer.tagline.zh : layer.tagline.en;
  return {
    title: `Layer ${layer.id} · ${name}`,
    description: tagline,
  };
}

export default async function LayerDetailPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;
  const layer = getLayerBySlug(params.slug);
  if (!layer) notFound();
  return (
    <>
      <NavBar />
      <main id="main-content">
        <LayerDetailContent layer={layer} />
      </main>
      <Footer />
    </>
  );
}
