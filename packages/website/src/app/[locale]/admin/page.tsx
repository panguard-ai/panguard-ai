import { redirect } from 'next/navigation';

export default function AdminPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/admin/dashboard`);
}
