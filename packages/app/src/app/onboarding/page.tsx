import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createWorkspace } from './actions';

export default async function OnboardingPage() {
  const t = await getTranslations('onboarding');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  async function onCreate(formData: FormData): Promise<void> {
    'use server';
    await createWorkspace(formData);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-text-primary">
        {t('title')}
      </h1>
      <p className="mb-8 text-sm text-text-muted">{t('subtitle')}</p>
      <Card padding="lg">
        <form action={onCreate} className="space-y-5">
          <Input
            name="name"
            required
            minLength={2}
            maxLength={64}
            label={t('nameLabel')}
            placeholder={t('namePlaceholder')}
          />
          <Input
            name="slug"
            required
            pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
            label={t('slugLabel')}
            placeholder="acme"
            hint={t('slugHint')}
          />
          <Button type="submit" className="w-full">
            {t('create')}
          </Button>
        </form>
      </Card>
    </main>
  );
}
