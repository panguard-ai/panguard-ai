import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle } from '@/components/icons';

interface Props {
  searchParams: { reason?: string };
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const t = await getTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-status-danger/10 border border-status-danger/30">
          <AlertTriangle className="h-6 w-6 text-status-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t('errorTitle')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('errorBody')}</p>
          {searchParams.reason ? (
            <p className="mt-2 text-xs text-text-muted font-mono">{searchParams.reason}</p>
          ) : null}
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-brand-sage hover:text-brand-sage-light"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
