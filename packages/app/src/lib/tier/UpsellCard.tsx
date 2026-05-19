'use client';

/**
 * Upsell card shown to Community users on Pilot/Enterprise-gated surfaces.
 *
 * Single CTA points to the marketing /pricing page with an `intent=pilot`
 * query so the pricing page can deep-link the user to the right plan.
 * The button text comes from the brand sage button variant; we don't
 * inline a checkout flow here because admins should still go through
 * the billing settings page (Stripe Customer is created server-side).
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from '@/components/icons';

export interface UpsellCardProps {
  /** Short, capitalised feature name — e.g. "Compliance Evidence". */
  feature: string;
  /** Optional one-line explanation. Falls back to a generic message. */
  description?: string;
  /** Pricing page deep-link intent. Defaults to "pilot". */
  intent?: 'pilot' | 'enterprise';
}

export function UpsellCard({ feature, description, intent = 'pilot' }: UpsellCardProps) {
  const targetTier = intent === 'enterprise' ? 'Enterprise' : 'Pilot';
  return (
    <Card padding="lg">
      <div className="flex flex-col items-start gap-3">
        <Shield className="h-6 w-6 text-brand-sage" />
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {feature} is a {targetTier} feature
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            {description ??
              `Available on the ${targetTier} plan and above. Upgrade to unlock ${feature.toLowerCase()} for your workspace.`}
          </p>
        </div>
        <Button href={`/pricing?intent=${intent}`} variant="primary" size="sm">
          Upgrade to {targetTier}
        </Button>
      </div>
    </Card>
  );
}
