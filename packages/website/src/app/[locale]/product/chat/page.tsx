import { redirect } from 'next/navigation';

export default function ProductChatPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/product`);
}
