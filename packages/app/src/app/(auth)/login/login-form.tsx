'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineToast } from '@/components/ui/toast';
import { Mail, Loader2 } from '@/components/icons';
import { sendMagicLink, type MagicLinkResult } from './actions';

export function LoginForm({ redirectParam }: { redirectParam: string | null }) {
  const t = useTranslations('auth');
  const [state, setState] = useState<MagicLinkResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (redirectParam) formData.set('redirect', redirectParam);
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      setState(result);
    });
  }

  if (state?.ok && state.email) {
    return (
      <div className="space-y-4">
        <InlineToast tone="success">
          {t('linkSentBody', { email: state.email })}
        </InlineToast>
        <button
          type="button"
          onClick={() => setState(null)}
          className="text-sm text-brand-sage hover:text-brand-sage-light"
        >
          {t('tryDifferentEmail')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
      />
      {state?.error ? (
        <InlineToast tone="error">{state.error}</InlineToast>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('sending')}
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            {t('sendLink')}
          </>
        )}
      </Button>
    </form>
  );
}
