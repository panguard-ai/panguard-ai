'use client';

/**
 * Client-side buttons for the Settings → Billing page.
 *
 * Why separate component:
 *   The parent page is a React Server Component (it server-renders tier
 *   info, audit log, and dates). Buttons that POST to `/api/billing/*` and
 *   redirect the browser need to be client components — fetch + window
 *   navigation requires the browser runtime. Keeping them in a sibling
 *   module keeps the RSC import graph clean.
 *
 * Behaviour:
 *   - ManageBillingButton  → POST /api/billing/portal, redirect to portal.
 *   - UpgradeButton        → POST /api/billing/checkout, redirect to checkout.
 *   Both disable on click and show a transient error if the call fails.
 *   No optimistic UI — the redirect is the success signal.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ManageBillingButtonProps {
  workspaceId: string;
}

export function ManageBillingButton({ workspaceId }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'portal_failed');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('portal_failed');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" size="sm" onClick={handleClick} disabled={loading} type="button">
        {loading ? 'Opening portal…' : 'Manage Billing'}
      </Button>
      {error ? (
        <p className="text-xs text-status-danger">
          Could not open billing portal ({error}). Please retry.
        </p>
      ) : null}
    </div>
  );
}

interface UpgradeButtonProps {
  workspaceId: string;
  tier: 'pilot' | 'enterprise';
  label: string;
}

export function UpgradeButton({ workspaceId, tier, label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'checkout_failed');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('checkout_failed');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" size="sm" onClick={handleClick} disabled={loading} type="button">
        {loading ? 'Redirecting…' : label}
      </Button>
      {error ? (
        <p className="text-xs text-status-danger">
          Could not start checkout ({error}). Please retry.
        </p>
      ) : null}
    </div>
  );
}
