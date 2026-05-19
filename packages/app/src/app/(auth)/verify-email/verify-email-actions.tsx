'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { InlineToast } from '@/components/ui/toast';
import { Loader2, Mail } from '@/components/icons';
import { signOut } from '@/app/(auth)/login/actions';
import { resendVerification, type ResendResult } from './actions';

export function VerifyEmailActions() {
  const t = useTranslations('auth');
  const [state, setState] = useState<ResendResult | null>(null);
  const [pendingResend, startResend] = useTransition();
  const [pendingSignOut, startSignOut] = useTransition();

  function onResend() {
    startResend(async () => {
      const result = await resendVerification();
      setState(result);
    });
  }

  function onSignOut() {
    startSignOut(async () => {
      await signOut();
    });
  }

  return (
    <div className="space-y-4">
      {state?.ok ? <InlineToast tone="success">{t('verifyResent')}</InlineToast> : null}
      {state && !state.ok && state.error ? (
        <InlineToast tone="error">{state.error}</InlineToast>
      ) : null}
      <Button
        type="button"
        onClick={onResend}
        disabled={pendingResend || pendingSignOut}
        className="w-full"
      >
        {pendingResend ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('sending')}
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            {t('verifyResend')}
          </>
        )}
      </Button>
      <button
        type="button"
        onClick={onSignOut}
        disabled={pendingSignOut || pendingResend}
        className="block w-full text-center text-sm text-brand-sage hover:text-brand-sage-light disabled:opacity-50"
      >
        {t('verifyUseDifferent')}
      </button>
    </div>
  );
}
