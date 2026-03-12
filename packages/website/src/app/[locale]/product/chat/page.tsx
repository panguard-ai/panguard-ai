import { redirect } from 'next/navigation';

export default async function ProductChatPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect(`/${params.locale}/product`);
}
