import { redirect } from 'next/navigation';

// Company page consolidated into About page to avoid content duplication.
// Brand story, values, and team content all live on /about now.
export default async function CompanyPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect(`/${params.locale}/about`);
}
