import { redirect } from 'next/navigation';

export default function ProductManagerPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/product`);
}
