import { getTranslations } from 'next-intl/server';
import { Shield } from '@/components/icons';
import { LoginForm } from './login-form';

interface Props {
  searchParams: { redirect?: string };
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations('auth');
  const redirectParam = searchParams.redirect ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sage/10 border border-brand-sage/30">
            <Shield className="h-6 w-6 text-brand-sage" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {t('loginTitle')}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{t('loginSubtitle')}</p>
          </div>
        </div>
        <LoginForm redirectParam={redirectParam} />
      </div>
    </div>
  );
}
