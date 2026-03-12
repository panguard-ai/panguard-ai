import { redirect } from 'next/navigation';

export default async function AdminPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect(`/${params.locale}/admin/dashboard`);
}
