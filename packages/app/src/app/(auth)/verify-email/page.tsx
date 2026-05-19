import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Mail } from '@/components/icons';
import { createClient } from '@/lib/supabase/server';
import { VerifyEmailActions } from './verify-email-actions';

const SUPPORT_EMAIL = 'hello@panguard.ai';

export default async function VerifyEmailPage() {
  const t = await getTranslations('auth');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in at all — back to /login.
  if (!user) redirect('/login');

  // Already verified — kick them into the normal flow. The root page handles
  // workspace selection / onboarding routing.
  if (user.email_confirmed_at) redirect('/');

  const email = user.email ?? '';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sage/10 border border-brand-sage/30">
            <Mail className="h-6 w-6 text-brand-sage" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{t('verifyTitle')}</h1>
            <p className="mt-1 text-sm text-text-muted">{t('verifyBody', { email })}</p>
          </div>
        </div>
        <VerifyEmailActions />
        <p className="text-center text-xs text-text-muted">
          {t('verifySupport', { email: SUPPORT_EMAIL })}
        </p>
      </div>
    </div>
  );
}
