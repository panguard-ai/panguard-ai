import { redirect } from 'next/navigation';

export default async function ConsolePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/console/fleet`);
}
